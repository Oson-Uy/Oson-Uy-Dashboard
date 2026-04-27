# Dashboard Security Assessment

## Current status
- Dashboard now supports optional admin API key protection via `x-admin-key`.
- Sensitive backend operations are guarded by `AdminApiKeyGuard` when `ADMIN_API_KEY` is configured.
- Ownership filtering is applied in dashboard views for projects, apartments, and leads by developer context.

## Implemented hardening
- Added guarded routes for:
  - `POST/PATCH /projects`
  - `POST /projects/:id/reviews`
  - `POST /apartments`
  - `POST/PATCH /developers`
  - `PATCH /leads/:id`
  - `POST /leads/:id/feedback-request`
  - `GET /leads/feedback/summary`
  - `POST /upload/image`
- Added dashboard support to pass optional admin key via `NEXT_PUBLIC_ADMIN_API_KEY`.

## Remaining risks
- Developer identity still relies on localStorage name; this is not strong authentication.
- Admin key in browser env is better than nothing but still exposed to client runtime.
- No per-user RBAC yet.

## Recommended next steps
1. Move dashboard auth to server-side session (JWT/httpOnly cookie).
2. Add real developer/user accounts and role checks in backend.
3. Add rate limiting for public lead endpoint and feedback submit endpoint.
4. Add audit logs for create/update actions with actor id and timestamp.
