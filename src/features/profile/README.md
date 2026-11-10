# Own profile and password

Both employee and HR self-service use ProfilePage and PasswordPage. Identity,
role, division/position, photo metadata and password policy come from the validated
session profile. Photos are read-only and use PrivateImage/PrivateFileViewer;
there is no self-photo edit, initial-password route, reset or reissue flow.

An unchanged initial password produces a warning and normal change-password
link. It does not block attendance or HR work. The password form uses the current
server min/max policy, Unicode code-point length, exact confirmation and the
published different-password rule; fields are never trimmed or normalized.
Unknown policy blocks submission and offers an explicit profile/policy reload.

Password values stay in mounted component/command memory, never Query or storage.
The non-idempotent command makes one POST /auth/password with automatic retries
disabled, maps stable Problem field errors and protects against duplicate clicks.
A server-confirmed response clears password fields, keeps the session active,
shows an inline success message and refreshes the profile (including
hasPasswordChanged). A profile refresh failure offers a read-only retry and never
replays the password write or logs the user out. An uncertain result blocks resubmission and offers
an explicit login with the new password to inspect the result. Leaving unmounts
and clears the local fields/command snapshot.

Tests mock the API, session and navigation as isolated component units. They
verify exact input preservation, policy boundaries, confirmation/different rules,
error mapping, success cleanup, unknown-policy recovery and no replay after a
lost response. They do not exercise real password revocation or API validation.
