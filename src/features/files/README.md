# Private images and unsent previews

`PrivateImage({file, alt, className, fallback})` displays metadata-bound image
bytes fetched through the current authenticated API client. Null/failed photos
use an intentional initials fallback. Pass size/object-fit utility classes from
the caller; no public URL, Figma fixture or token-bearing navigation is used.

`PrivateFileViewer({file, open, onClose})` uses the shared native modal, loads
only while open, preserves aspect ratio, offers zoom and a local download
fallback, and releases bytes when closed. Metadata filename/size remain visible.
404 has a generic inaccessible/unavailable message. Retry is explicit and a
Retry-After cooldown is honored; there is no automatic retry loop or PDF viewer.

`usePrivateFile` validates UUID/exact contentPath, supported image MIME, and
positive declared byte count before transport. It verifies returned Blob MIME
and complete byte length before creating an object URL. The client boundary
handles Bearer authorization and Problem error blobs. The backend remains
responsible for current parent authorization, byte content verification, safe
headers and no-store responses. Client mocks do not establish those guarantees.

Object URLs stay in component memory, outside Query caches and browser storage.
Replacement, close, unmount and registered account cleanup abort requests and
revoke URLs. Generation/active guards reject late reads. A fresh read reauthorizes;
already displayed bytes cannot be remotely recalled by the browser.

`useLocalPreview(file)` returns an object URL for an unsent JPEG/PNG/WebP only.
It never fetches or uploads. Replacing/removing the selection or leaving the
account revokes the URL; the caller owns the File and all other form fields.
No standalone upload/delete/list endpoint, signed URL, Range dependency, service
worker or persistent byte cache is introduced.
