import { createSchema, createYoga } from "graphql-yoga";
import typeDefs from "./schema.graphql";
import { resolvers, type Context, type Env } from "./resolvers";

const yoga = createYoga<{ env: Env }, Context>({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
  landingPage: false,
  // Hide internal error details; keep GraphQLError messages (they are user-facing).
  maskedErrors: true,
  context: ({ request, env }) => ({
    env,
    // DEV ONLY until Sparrow account login exists. Never enabled in production.
    userId: env.ALLOW_DEV_AUTH === "true" ? request.headers.get("x-sparrow-user") : null,
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
} satisfies ExportedHandler<Env>;
