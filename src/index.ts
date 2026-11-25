import { createSchema, createYoga } from "graphql-yoga";
import typeDefs from "./schema.graphql";
import { resolvers, type Context, type Env } from "./resolvers";
import { userIdFromRequest } from "./auth";

const yoga = createYoga<{ env: Env }, Context>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
  landingPage: false,
  // Hide internal error details; keep GraphQLError messages (they are user-facing).
  maskedErrors: true,
  context: ({ request, env }) => ({
    env,
    userId: userIdFromRequest(request, env),
    moderatorToken: request.headers.get("x-radio-moderator-token"),
  }),
});

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response("Sparrow Radio API. GraphQL endpoint: /graphql", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return yoga.fetch(request, { env });
  },

  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(
      env.DB.prepare(
        "DELETE FROM stream_presence WHERE julianday(last_seen_at) <= julianday('now', '-90 seconds')",
      ).run(),
    );
  },
} satisfies ExportedHandler<Env>;
