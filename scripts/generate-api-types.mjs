import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript'
import ts from 'typescript'

const check = process.argv.includes('--check')
const source = new URL('../../contracts/openapi.json', import.meta.url)
const target = new URL('../src/shared/api/schema.d.ts', import.meta.url)
const directory = new URL('../src/shared/api/generated/', import.meta.url)
const raw = await readFile(source, 'utf8')
const hash = createHash('sha256').update(raw).digest('hex')
const header = `${COMMENT_HEADER}// Source: ../contracts/openapi.json\n// SHA-256: ${hash}\n\n`

// Equivalent in-memory composition preserves required-only anyOf branches in
// openapi-typescript 7.13. The shared source contract is never modified.
function normalizeObjectCompositions(value) {
  if (Array.isArray(value)) return value.map(normalizeObjectCompositions)
  if (!value || typeof value !== 'object') return value
  let result = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      normalizeObjectCompositions(child),
    ]),
  )
  if (result.properties && result.anyOf) {
    const { anyOf, ...base } = result
    const branches = anyOf.map((branch) => ({
      ...branch,
      properties: {
        ...Object.fromEntries(
          (branch.required ?? [])
            .filter((key) => key in result.properties)
            .map((key) => [key, result.properties[key]]),
        ),
        ...branch.properties,
      },
    }))
    result = { ...base, allOf: [...(base.allOf ?? []), { anyOf: branches }] }
  }
  return result
}

const ast = await openapiTS(normalizeObjectCompositions(JSON.parse(raw)), {
  defaultNonNullable: false,
  transform(schema) {
    if (schema.type === 'string' && schema.format === 'binary')
      return ts.factory.createTypeReferenceNode('Blob')
  },
})
const files = new Map()
const imports = []
const declarations = []
const exported = [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)]

function fragment(name, members) {
  const body = astToString([
    ts.factory.createInterfaceDeclaration(
      exported,
      name,
      undefined,
      undefined,
      members,
    ),
  ])
  const references = ['components', 'operations', 'paths'].filter((ref) =>
    body.includes(`${ref}[`),
  )
  return `${header}${references.length ? `import type { ${references.join(', ')} } from '../schema'\n\n` : ''}${body}`
}

function parts(prefix, members) {
  const names = []
  let batch = []
  function flush() {
    if (!batch.length) return
    const name = `${prefix}Part${names.length}`
    const text = fragment(name, batch)
    if (text.split('\n').length > 750)
      throw new Error(`${name} exceeds the 750-line limit.`)
    const filename = `${prefix.toLowerCase()}-${names.length}.d.ts`
    files.set(filename, text)
    imports.push(
      `import type { ${name} } from './generated/${filename.replace('.d.ts', '')}'`,
    )
    names.push(name)
    batch = []
  }
  for (const member of members) {
    if (
      batch.length &&
      fragment(`${prefix}Part${names.length}`, [...batch, member]).split('\n')
        .length > 650
    )
      flush()
    batch.push(member)
  }
  flush()
  return names.join(' & ')
}

for (const node of ast) {
  if (ts.isInterfaceDeclaration(node) && node.name.text === 'components') {
    const props = node.members.map((member) => {
      if (ts.isIdentifier(member.name) && member.name.text === 'schemas') {
        return `schemas: ${parts('Schemas', member.type.members)};`
      }
      return astToString([
        ts.factory.createInterfaceDeclaration(
          exported,
          'Temporary',
          undefined,
          undefined,
          [member],
        ),
      ])
        .replace(/^export interface Temporary \{\n/, '')
        .replace(/\}\n?$/, '')
        .trim()
    })
    declarations.push(`export interface components {\n${props.join('\n')}\n}`)
  } else if (
    ts.isInterfaceDeclaration(node) &&
    ['paths', 'operations'].includes(node.name.text)
  ) {
    const prefix = node.name.text === 'paths' ? 'Paths' : 'Operations'
    declarations.push(
      `export type ${node.name.text} = ${parts(prefix, node.members)}`,
    )
  } else {
    declarations.push(astToString([node]))
  }
}
const facade = `${header}${imports.join('\n')}\n\n${declarations.join('\n\n')}\n`
if (facade.split('\n').length > 750)
  throw new Error('Schema facade exceeds 750 lines.')
const expected = new Map([
  [target, facade],
  ...[...files].map(([name, text]) => [new URL(name, directory), text]),
])
const existing = await readdir(directory).catch((error) => {
  if (error.code === 'ENOENT') return []
  throw error
})
const obsolete = existing.filter(
  (name) => name.endsWith('.d.ts') && !files.has(name),
)
if (check) {
  let stale = obsolete.length > 0
  for (const [path, contents] of expected) {
    const current = await readFile(path, 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return ''
      throw error
    })
    if (current !== contents) stale = true
  }
  if (stale) {
    console.error(
      'API types are missing or stale. Run npm run api:generate and review the contract diff.',
    )
    process.exitCode = 1
  } else console.log('API types match ../contracts/openapi.json.')
} else {
  await mkdir(directory, { recursive: true })
  for (const [path, contents] of expected) await writeFile(path, contents)
  for (const name of obsolete) await unlink(new URL(name, directory))
  console.log(
    `Generated schema facade and ${files.size} fragments from ../contracts/openapi.json.`,
  )
}
