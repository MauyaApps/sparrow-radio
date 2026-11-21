import { GraphQLError } from "graphql";
import { buildStreamQuery, type StreamFilters } from "./query";
import { validateCreateStream, type CreateStreamInput } from "./validation";

export interface Env {
  DB: D1Database;
  ALLOW_DEV_AUTH?: string;
}

export interface Context {
  env: Env;
  /** Sparrow account id of the caller, or null when anonymous. */
  userId: string | null;
}

interface StreamRow {
  id: string;
  owner_id: string;
  name: string;
  kind: string;
  content_type: string;
  category: string;
  conversation_topic: string | null;
  is_conversation: number;
  description: string;
  source_url: string | null;
  listeners: number;
  rating_sum: number;
  rating_count: number;
  created_at: string;
}

const toStream = (r: StreamRow) => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  kind: r.kind,
  contentType: r.content_type,
  category: r.category,
  conversationTopic: r.conversation_topic,
  isConversation: r.is_conversation === 1,
  description: r.description,
  sourceUrl: r.source_url,
  listeners: r.listeners,
  rating: r.rating_count > 0 ? Math.round((r.rating_sum / r.rating_count) * 10) / 10 : 0,
  createdAt: r.created_at,
});

async function listStreams(ctx: Context, filters: StreamFilters) {
  const q = buildStreamQuery(filters);
  const [rows, count] = await Promise.all([
    ctx.env.DB.prepare(q.listSql).bind(...q.listBinds).all<StreamRow>(),
    ctx.env.DB.prepare(q.countSql).bind(...q.countBinds).first<{ total: number }>(),
  ]);
  return {
    items: rows.results.map(toStream),
    total: count?.total ?? 0,
    page: q.page,
    pageSize: q.pageSize,
  };
}

export const resolvers = {
  Query: {
    streams: (_: unknown, a: StreamFilters, ctx: Context) => listStreams(ctx, a),

    search: (_: unknown, a: StreamFilters & { query: string }, ctx: Context) =>
      listStreams(ctx, { ...a, text: a.query }),

    stream: async (_: unknown, a: { id: string }, ctx: Context) => {
      const row = await ctx.env.DB.prepare("SELECT * FROM streams WHERE id = ?").bind(a.id).first<StreamRow>();
      return row ? toStream(row) : null;
    },
  },

  Mutation: {
    createStream: async (_: unknown, a: { input: CreateStreamInput }, ctx: Context) => {
      if (!ctx.userId) {
        throw new GraphQLError("Sign in with your Sparrow account to create a stream.", {
          extensions: { code: "UNAUTHENTICATED" },
        });
      }

      const result = validateCreateStream(a.input);
      if (!result.ok || !result.value) {
        throw new GraphQLError("Please fix the highlighted fields.", {
          extensions: { code: "BAD_USER_INPUT", fields: result.errors },
        });
      }

      const v = result.value;
      const id = crypto.randomUUID();
      await ctx.env.DB.prepare(
        `INSERT INTO streams
           (id, owner_id, name, kind, content_type, category, conversation_topic,
            is_conversation, description, source_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id, ctx.userId, v.name, v.kind, v.contentType, v.category,
          v.conversationTopic, v.isConversation ? 1 : 0, v.description, v.sourceUrl,
        )
        .run();

      const row = await ctx.env.DB.prepare("SELECT * FROM streams WHERE id = ?").bind(id).first<StreamRow>();
      return { stream: toStream(row as StreamRow), warnings: result.warnings };
    },
  },
};
