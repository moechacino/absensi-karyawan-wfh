# Shared components

These components use the local Figma vectors and Tailwind theme. They own visual
and interaction behavior; features own form values, API calls, permissions,
versions, previews, calculations, and command success. React Select 5.10.2 is the user-approved exception for dropdown behavior.
Its unstyled mode and classNames use our Tailwind tokens; Emotion remains an
internal transitive dependency. No other UI, date-picker, or icon package is added.

## Controls and state

- `Button` defaults to `type="button"`; request submit explicitly. Variants are
  primary, secondary, danger, and ghost. `busy` disables duplicate activation and
  exposes `aria-busy`; supply `busyLabel` when the action has a clearer pending
  label. Controls are at least 48 px, with standard buttons/inputs at 52 px.
- `IconButton` requires a `label`. `Icon` accepts only names in the fixed local
  Figma registry. Decorative icons are hidden; an optional label exposes an image
  role. Only reviewed repository SVG markup is inlined, never user/server SVG.
- `TextField` and `TextAreaField` retain native props and React 19
  ref props, including form-library registrations. Visible labels, hints, and
  errors receive linked IDs; caller-provided `aria-describedby` is preserved.
- `PasswordField` uses the same field and adds a labeled pressed-state toggle.
  It never trims, normalizes, or applies a password policy. Supply autocomplete
  and validation rules from the consuming feature.
- `Badge` always needs meaningful text. `Alert`, `LoadingState`, `EmptyState`,
  `ErrorState`, and `Skeleton` provide explicit feedback. Errors use alert
  announcements; ordinary notices/loading use status announcements. Skeletons
  are decorative. Retry only invokes the supplied callback.

## Search and dates/files

`SelectField` and `Combobox` share one React Select adapter. Both are searchable,
controlled through string `value` / `onChange(value)`, and reject arbitrary text.
Use React Hook Form `Controller` with `value`, `onChange`, `onBlur`, `name`, and
`ref` (a SelectInstance focus ref), rather than native `register` event props.
The adapter merges hint/error/external descriptions with React Select's live
region IDs. Menus stay inline, so they remain inside native modal top layers;
avoid clipping ancestors around a picker. Tailwind important utilities preserve
52 px controls, focus outlines, and menu stacking against functional library CSS.

 Options have value, label,
and optional disabled state. Typing filters locally unless `onSearch` is passed;
remote results and loading/error handling remain feature-owned. Supply
`selectedLabel` when remote results may omit the current selection. `onSearch`
receives typed text and an empty query on menu close; consumers debounce/cancel
requests and ignore stale results. Local filtering is disabled for remote results.
`hasMore` and `onLoadMore` expose a keyboard-accessible button below the control
(disabled while loading), providing explicit pagination rather than assuming the first page
contains every option. Arrow keys, Home/End, Enter, Escape, and focus-out are
supported. Disabled options can receive navigation focus for announcement but
cannot be selected. Tab moves focus without committing an option; Escape closes
the menu before reaching an enclosing dialog handler.

`DateRangeField` uses native full-day date inputs, preserving YYYY-MM-DD strings.
It does not parse them into a device-local Date, block past dates, compute
working days, or apply a cross-year policy. Features provide min/max/errors and
own the complete range through `value`/`onChange`.

`FileField` accepts a parent-owned File/null value. Selection, cancellation, and
removal are local and never upload. The native picker resets after selection so
the same file can be selected again. Requiredness is exposed accessibly, but the
feature validates its controlled File value before submission; do not rely on a
reset native input's browser-required check or serialize the input automatically.
`accept` is a picker hint, not content validation. The feature owns MIME/size
policy and builds multipart from the selected File; no fixed policy is encoded
here. `busy` disables both picker and removal. Local image/PDF viewers are WEB-009.

## Dialogs, tabs, pagination, and responsive lists

`Dialog` uses native showModal for the top layer/background inertness and focus
containment. The title is initially focused unless an initialFocusRef is given;
closing/unmounting restores the opener when it remains in the document. Escape
and the close button ask the parent to close. Pending state disables dismissal;
features keep open/busy accurate during uncertain commands. Do not nest modal
dialogs or put a form with method="dialog" inside a controlled dialog.

`ConfirmationDialog` calls `onConfirm` without closing or simulating success. Its
parent closes only after the operation is confirmed. jsdom unit tests mock native
dialog methods; they do not establish the browser's top-layer implementation.

`Tabs` has manual activation: arrows/Home/End move focus, Enter/Space or click
select through onChange. Disabled tabs are skipped. Linked panels stay mounted
and inactive panels are hidden. If a feature needs URL navigation, use its router
links instead of treating those links as these in-page tabs.

`Pagination` is server-state controlled: page and totalPages come from its
consumer, with only valid previous/next callbacks emitted at boundaries. A zero
page count has its own empty state. Busy state locks page commands.

`ResponsiveList` shows a semantic captioned table at md widths and parent-rendered
cards below md. Provide stable row keys, cell renderers, renderCard, and an explicit
empty state. Keep row links and secondary action buttons separate; do not wrap
interactive children in a clickable row/button. Hidden counterparts are removed
from layout/accessibility by the responsive display utilities.

## Review and unit coverage

Use `/dev/components` on Vite for the local component preview. It uses illustrative
local state and no API. The preview's JavaScript is removed from production by
import.meta.env.DEV; it is not an authenticated product route or another task's
screen implementation.

Colocated unit tests cover field descriptions/ref forwarding, password toggling,
file selection/cancellation/removal, date preservation, local/remote search and
keyboard selection, dialog lifecycle/Escape/pending state, buttons, tabs,
pagination, feedback, and table/card semantics. No class-string snapshots or
integration/end-to-end runner are added.
