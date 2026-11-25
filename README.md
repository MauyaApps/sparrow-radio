# Sparrow Radio

Radio catalog and web client on Cloudflare Workers + D1 + GraphQL Yoga. The web
client and API are deployed by the same Worker. Audio itself must currently be
served by an external HTTPS source (MP3/AAC/Ogg or HLS).

## Local development

Requires Node.js 22+.

1. Start the Sparrow Account API in `sparrow-account/`:

   ```powershell
   npm install
   npm run dev
   ```

   Its local API listens on `127.0.0.1:8787`; the account setup script creates
   local secrets and the local admin password is in that project's `.dev.vars`.
2. In this directory:

   ```powershell
   npm install
   npm run db:migrate:local
   npm run db:seed:local       # optional demo streams
   npm run dev                 # radio API on 127.0.0.1:8788
   ```
3. In a third terminal:

   ```powershell
   npm --prefix web install
   npm --prefix web run dev    # http://localhost:5173
   ```

Vite proxies `/graphql` to the radio Worker and `/account-api` to the local
account Worker, avoiding local CORS configuration. Copy `web/.env.example` to
`web/.env.local` only if you need to override the account API base URL.

For isolated resolver development only, copy `.dev.vars.example` to `.dev.vars`
to enable the local-only `x-sparrow-user` header. Keep
`ALLOW_DEV_AUTH = "false"` in any deployed configuration. Production uses
Sparrow Account bearer tokens verified locally with the account service's
Ed25519 public key. To test real local login, read `issuer` and `publicKey` from
`http://127.0.0.1:8787/v1/keys` and put those values in radio's `.dev.vars`.

## Features

- Public catalog, filters, search, bounded pagination and popularity/rating/newest sorting.
- Sparrow Account OPAQUE registration/login, rotating refresh token, logout and Bearer authentication.
- Stream creation, owner-only edit/hide/delete, one rating per account, HTTPS source URL.
- HLS playback through hls.js where native HLS is unavailable; native browser audio playback for other supported formats.
- Listener presence heartbeats, expiring after 90 seconds; scheduled D1 cleanup runs every five minutes.
- Chat polling every three seconds, message limits and owner/author deletion.
- One report per account per stream; moderator-only report review and stream hiding/closure.

The presence counter is an approximate browser-session count, not a financial or
security-grade metric. It is anonymous and can be manipulated by clients.
Static assets send a restrictive CSP and security headers from `web/public/_headers`.
Access and rotating refresh tokens still live in browser `localStorage`; before
opening registration broadly, consider moving refresh sessions behind a
same-origin HttpOnly cookie.
An HLS source and its segments must allow browser CORS requests from the radio
site.

## Moderation

Set `RADIO_MODERATOR_TOKEN` as a Worker secret (`wrangler secret put
RADIO_MODERATOR_TOKEN`). Moderator-only GraphQL operations accept it in
`x-radio-moderator-token`; never expose this secret in the web client:

```graphql
query { reports(pageSize: 50) { id streamId userId reason createdAt } }
mutation { moderateStream(id: "STREAM_ID", status: HIDDEN, note: "Policy violation") { id status } }
mutation { resolveReport(id: "REPORT_ID") }
```

## Tests and build

```powershell
npm test
npm run typecheck
npm run build:web
```

## Deployment prerequisites

The `wrangler.toml` `database_id` is pinned to the existing production
`sparrow-radio-db`. Verify it still matches the intended Cloudflare database
before applying migrations. Deploy the Account API first, then set the radio
Worker vars:

- `ACCOUNT_ISSUER=https://sparrow-account-api.sparrownet.workers.dev`
- `ACCOUNT_PUBLIC_KEY=<publicKey returned by GET /v1/keys>`
- `ALLOW_DEV_AUTH=false`

Set `RADIO_MODERATOR_TOKEN` with `wrangler secret put`. Apply D1 migrations with
`npm run deploy` only after verifying the target database. `npm run deploy`
applies migrations and then deploys the Worker.

The account service must have its own D1 configured, its migrations applied and
the OPAQUE/signing secrets set before radio login can work. Production login is
not functional while the Account API is unavailable.

## Rules

- Name: 3-60 chars; description: max 500; topic: max 100; URL: HTTPS only.
- MUSIC uses category MUSIC and no discussion topic.
- CONVERSATION requires a non-music category; MIXED permits any category.
- Missing topic for talk show/podcast/interview is a warning.
- Hidden/closed streams are excluded from public listings.
