import type { operations } from './schema'

export type Operation = keyof operations

type Content<T, Media extends string> = T extends { content: infer C }
  ? Media extends keyof C
    ? C[Media]
    : never
  : never

type Body<Op extends Operation, Media extends string> = operations[Op] extends {
  requestBody: infer B
}
  ? Content<B, Media>
  : never

export type JsonBody<Op extends Operation> = Body<Op, 'application/json'>
export type MultipartBody<Op extends Operation> = Body<
  Op,
  'multipart/form-data'
>

type Success<Response> = {
  [Status in keyof Response]: Status extends number
    ? `${Status}` extends `2${string}`
      ? Status extends 204
        ? undefined
        : Content<Response[Status], 'application/json'>
      : never
    : never
}[keyof Response]

export type JsonResult<Op extends Operation> = operations[Op] extends {
  responses: infer R
}
  ? Success<R>
  : never
