# Design assets

The [asset manifest](asset-manifest.json) records every exported SVG's Figma
node, source link, original export checksum, final checksum, dimensions, and
normalization. It also records the licensed font sources and verified tokens.
The design was inspected/exported read-only through the Desktop Bridge.

## Vectors

`icons/` contains all 28 unique named icons found across 1,517 Figma instances.
Only monochrome fill/stroke paints were changed to `currentColor`; native
viewBox, path geometry, stroke width/caps/joins, and opacity remain intact.
Render these as local inline SVGs in the shared Icon component introduced by
WEB-003. A standalone SVG loaded through `<img>` does not inherit the parent
element's text color. Do not add an icon package or inject arbitrary user SVG.
Decorative icons are hidden from assistive technology; icon-only buttons need
an accessible name supplied by the button.

`brand/` contains the original 36 px mark and an outlined wordmark. Brand colors
are preserved. The wordmark contains vector outlines, not an external font/text
dependency. The application entry and favicon use local imports.

## Fonts

Manrope (normal, weights 200–800) and JetBrains Mono (normal, weights 100–800)
are self-hosted variable WOFF2 files converted from the official Google Fonts
TTF distribution with FontTools/Brotli. Their outlines/axes are unchanged and
the original OFL notices are preserved beside each font. FontTools was only
used as a temporary asset-preparation tool, not added to application packages.
Both fonts use `font-display: swap` with system fallbacks; the browser makes no
Google Fonts/Figma requests to display the application.

## Theme usage

The 33 [source tokens](../../../design/tokens.json) were compared with the live
Figma variables before mapping to `src/styles/index.css`.

| Design token | Tailwind API |
| --- | --- |
| `color/<name>` | `bg-<name>`, `text-<name>`, `border-<name>` |
| `space/4` through `space/128` | 4 px base; `p-1` through `p-32` at the corresponding token values |
| `radius/8`, `radius/12`, `radius/20` | `rounded-control`, `rounded-card`, `rounded-panel` |
| `size/touch-min` | `min-h-touch`, `min-w-touch` (48 px at the default root size) |
| `motion/hover`, `motion/press` | `duration-hover`, `duration-press` with `motion-reduce:transition-none` on animated controls |
| Manrope / JetBrains Mono | `font-sans` / `font-mono` |
| Inspected type sizes/line heights | `text-label`, `text-small`, `text-body`, `text-title`, `text-heading`, `text-clock` |

Use complete utility strings in source so Tailwind can discover them. The
theme defines touch dimensions, while WEB-003 applies them to actual controls.
Build components with semantic HTML and Tailwind utilities rather than custom
component CSS or another styling library.

## Raster inventory

The live file has five image-filled nodes sharing one illustrative evidence
image. Its existing [provenance](../../../design/figma/asset-provenance.md) makes
it a prototype fixture, not production employee data. It is deliberately not
copied into this application. Actual evidence/profile images come from later
authorized file features; missing user photos use an intentional initials/shape
fallback. Full-screen PNG exports remain design references.
