<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Postgres runs in Docker

The local Postgres instance runs inside Docker, not on the host. Do not try `psql` directly on the host — use `docker exec` against the Postgres container, or connect via the `DATABASE_URL` in `apps/api/.env`.
