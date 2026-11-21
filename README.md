# Sparrow Radio API (step 1)

Cloudflare Workers + D1 + GraphQL (graphql-yoga). Free plan, no server needed.

## Run locally (no Cloudflare login, no VPN)
```bash
npm install
npm run db:migrate:local      # creates the streams table in a local D1
npm run db:seed:local         # optional: 4 demo streams
npm run dev                   # http://localhost:8787/graphql
npm test                      # validation + query tests
```

## Dev login (local only)
Copy `.dev.vars.example` to `.dev.vars` (it is git-ignored). Then the header `x-sparrow-user: <any id>` acts as a user locally.
In wrangler.toml `ALLOW_DEV_AUTH` is "false", so a deployed Worker has no login at all until Sparrow accounts exist (creating streams is refused).

## Example queries
```graphql
{ streams(contentType: CONVERSATION, category: PODCAST, sort: POPULAR, page: 1) { total items { id name conversationTopic rating } } }
{ search(query: "indie") { total items { name category } } }
mutation { createStream(input: { name: "My Show", kind: HOT, contentType: CONVERSATION,
  category: TALK_SHOW, conversationTopic: "Open source" }) { stream { id } warnings } }
```

## Deploy from GitHub (Cloudflare Workers Builds)
1. Create the D1 database in the dashboard (Storage & Databases, D1) named `sparrow-radio-db`; copy its ID into `database_id` in wrangler.toml and commit.
2. Push the repo to GitHub.
3. Workers & Pages, Create application, import the repository. Deploy command: `npm run deploy` (applies migrations, then deploys).
4. If migrations fail on permissions, paste `migrations/0001_streams.sql` into the D1 console once and set the deploy command to `npx wrangler deploy`.

## Rules enforced on the server
- name 3-60 chars; description up to 500; sourceUrl must be https
- MUSIC streams use category MUSIC and cannot have a discussion topic
- CONVERSATION streams need a non-music category; MIXED accepts any
- conversationTopic up to 100 chars; missing topic for TALK_SHOW / PODCAST / INTERVIEW gives a warning
- `isConversation` is true for CONVERSATION and MIXED

`design/` holds the approved icon, banner and colour tokens for the interface step.
