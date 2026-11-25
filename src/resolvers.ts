import { GraphQLError } from "graphql";
import { buildStreamQuery, type StreamFilters } from "./query";
import { validateCreateStream, type CreateStreamInput } from "./validation";

export interface Env {
  DB: D1Database;
  ALLOW_DEV_AUTH?: string;
  ACCOUNT_PUBLIC_KEY?: string;
  ACCOUNT_ISSUER?: string;
  RADIO_MODERATOR_TOKEN?: string;
}

export interface Context {
  env: Env;
  /** Sparrow account id of the caller, or null when anonymous. */
  userId: string | null;
  moderatorToken?: string | null;
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
  status?: string;
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
  status: r.status ?? "LIVE",
  createdAt: r.created_at,
});

function requireUser(ctx: Context): string {
  if (!ctx.userId) throw new GraphQLError("Sign in with your Sparrow account.", {
    extensions: { code: "UNAUTHENTICATED" },
  });
  return ctx.userId;
}

async function getStream(ctx: Context, id: string): Promise<StreamRow> {
  const row = await ctx.env.DB.prepare(
    "SELECT streams.*, (SELECT COUNT(*) FROM stream_presence p WHERE p.stream_id = streams.id AND julianday(p.last_seen_at) > julianday('now', '-90 seconds')) AS listeners FROM streams WHERE id = ?",
  ).bind(id).first<StreamRow>();
  if (!row) throw new GraphQLError("Stream not found.", { extensions: { code: "NOT_FOUND" } });
  return row;
}

async function requireOwner(ctx: Context, id: string): Promise<StreamRow> {
  const userId = requireUser(ctx);
  const row = await getStream(ctx, id);
  if (row.owner_id !== userId) throw new GraphQLError("Only the stream owner can perform this action.", {
    extensions: { code: "FORBIDDEN" },
  });
  return row;
}

async function requireModerator(ctx: Context): Promise<void> {
  const expected = ctx.env.RADIO_MODERATOR_TOKEN;
  const provided = ctx.moderatorToken;
  if (!expected || expected.length < 32 || expected.length > 512 || !provided || provided.length > 512) {
    throw new GraphQLError("Moderator access required.", {
      extensions: { code: "FORBIDDEN" },
    });
  }
  const encoder = new TextEncoder();
  const [expectedHash, providedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(providedHash);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i]! ^ b[i]!;
  if (mismatch !== 0) throw new GraphQLError("Moderator access required.", {
    extensions: { code: "FORBIDDEN" },
  });
}

function validateClientId(clientId: string): string {
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(clientId)) {
    throw new GraphQLError("Invalid listener id.", { extensions: { code: "BAD_USER_INPUT" } });
  }
  return clientId;
}

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
      const row = await ctx.env.DB.prepare(
        "SELECT streams.*, (SELECT COUNT(*) FROM stream_presence p WHERE p.stream_id = streams.id AND julianday(p.last_seen_at) > julianday('now', '-90 seconds')) AS listeners FROM streams WHERE id = ?",
      ).bind(a.id).first<StreamRow>();
      if (row && row.status !== "LIVE" && row.owner_id !== ctx.userId) return null;
      return row ? toStream(row) : null;
    },

    chatMessages: async (_: unknown, a: { streamId: string; pageSize?: number }, ctx: Context) => {
      const stream = await getStream(ctx, a.streamId);
      if (stream.status !== "LIVE" && stream.owner_id !== ctx.userId) {
        throw new GraphQLError("Stream not found.", { extensions: { code: "NOT_FOUND" } });
      }
      const size = Math.min(Math.max(Math.trunc(a.pageSize ?? 50) || 50, 1), 200);
      const rows = await ctx.env.DB.prepare(
        "SELECT * FROM chat_messages WHERE stream_id = ? ORDER BY created_at DESC LIMIT ?",
      ).bind(a.streamId, size).all<{
        id: string; stream_id: string; user_id: string; body: string; created_at: string;
      }>();
      return rows.results.reverse().map((r) => ({
        id: r.id,
        streamId: r.stream_id,
        userId: r.user_id,
        body: r.body,
        createdAt: r.created_at,
      }));
    },

    reports: async (_: unknown, a: { pageSize?: number }, ctx: Context) => {
      await requireModerator(ctx);
      const size = Math.min(Math.max(Math.trunc(a.pageSize ?? 50) || 50, 1), 200);
      const rows = await ctx.env.DB.prepare(
        "SELECT id, stream_id, user_id, reason, created_at FROM stream_reports WHERE resolved_at IS NULL ORDER BY created_at ASC LIMIT ?",
      ).bind(size).all<{ id: string; stream_id: string; user_id: string; reason: string; created_at: string }>();
      return rows.results.map((r) => ({
        id: r.id, streamId: r.stream_id, userId: r.user_id, reason: r.reason, createdAt: r.created_at,
      }));
    },
  },

  Mutation: {
    createStream: async (_: unknown, a: { input: CreateStreamInput }, ctx: Context) => {
      const userId = requireUser(ctx);

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
          id, userId, v.name, v.kind, v.contentType, v.category,
          v.conversationTopic, v.isConversation ? 1 : 0, v.description, v.sourceUrl,
        )
        .run();

      const row = await ctx.env.DB.prepare("SELECT * FROM streams WHERE id = ?").bind(id).first<StreamRow>();
      return { stream: toStream(row as StreamRow), warnings: result.warnings };
    },

    updateStream: async (_: unknown, a: { id: string; sourceUrl?: string | null; description?: string | null }, ctx: Context) => {
      await requireOwner(ctx, a.id);
      const row = await getStream(ctx, a.id);
      const sourceUrl = a.sourceUrl === undefined ? row.source_url : (a.sourceUrl?.trim() || null);
      const description = a.description === undefined ? row.description : (a.description ?? "").trim();
      if (sourceUrl) {
        if (sourceUrl.length > 500) {
          throw new GraphQLError("URL is too long.", { extensions: { code: "BAD_USER_INPUT" } });
        }
        try {
          if (new URL(sourceUrl).protocol !== "https:") throw new Error();
        } catch {
          throw new GraphQLError("Only https:// sources are allowed.", { extensions: { code: "BAD_USER_INPUT" } });
        }
      }
      if (description.length > 500) throw new GraphQLError("Description is too long.", { extensions: { code: "BAD_USER_INPUT" } });
      await ctx.env.DB.prepare(
        "UPDATE streams SET source_url = ?, description = ? WHERE id = ?",
      ).bind(sourceUrl, description, a.id).run();
      return toStream(await getStream(ctx, a.id));
    },

    deleteStream: async (_: unknown, a: { id: string }, ctx: Context) => {
      await requireOwner(ctx, a.id);
      await ctx.env.DB.prepare("DELETE FROM streams WHERE id = ?").bind(a.id).run();
      return true;
    },

    setStreamStatus: async (_: unknown, a: { id: string; status: "LIVE" | "HIDDEN" | "CLOSED" }, ctx: Context) => {
      await requireOwner(ctx, a.id);
      if (!["LIVE", "HIDDEN", "CLOSED"].includes(a.status)) {
        throw new GraphQLError("Unknown stream status.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      await ctx.env.DB.prepare("UPDATE streams SET status = ? WHERE id = ?").bind(a.status, a.id).run();
      return toStream(await getStream(ctx, a.id));
    },

    rateStream: async (_: unknown, a: { id: string; value: number }, ctx: Context) => {
      const userId = requireUser(ctx);
      await getStream(ctx, a.id);
      if (!Number.isInteger(a.value) || a.value < 1 || a.value > 5) {
        throw new GraphQLError("Rating must be from 1 to 5.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      await ctx.env.DB.prepare(
        "INSERT INTO ratings (stream_id, user_id, value) VALUES (?, ?, ?) ON CONFLICT(stream_id, user_id) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      ).bind(a.id, userId, a.value).run();
      return toStream(await getStream(ctx, a.id));
    },

    joinStream: async (_: unknown, a: { id: string; clientId: string }, ctx: Context) => {
      await getStream(ctx, a.id);
      const clientId = validateClientId(a.clientId);
      await ctx.env.DB.prepare(
        "DELETE FROM stream_presence WHERE stream_id = ? AND julianday(last_seen_at) <= julianday('now', '-90 seconds')",
      ).bind(a.id).run();
      await ctx.env.DB.prepare(
        "INSERT INTO stream_presence (stream_id, client_id) VALUES (?, ?) ON CONFLICT(stream_id, client_id) DO UPDATE SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      ).bind(a.id, clientId).run();
      return toStream(await getStream(ctx, a.id));
    },

    heartbeatStream: async (_: unknown, a: { id: string; clientId: string }, ctx: Context) => {
      await getStream(ctx, a.id);
      const clientId = validateClientId(a.clientId);
      await ctx.env.DB.prepare(
        "INSERT INTO stream_presence (stream_id, client_id) VALUES (?, ?) ON CONFLICT(stream_id, client_id) DO UPDATE SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
      ).bind(a.id, clientId).run();
      return toStream(await getStream(ctx, a.id));
    },

    leaveStream: async (_: unknown, a: { id: string; clientId: string }, ctx: Context) => {
      await getStream(ctx, a.id);
      const clientId = validateClientId(a.clientId);
      await ctx.env.DB.prepare("DELETE FROM stream_presence WHERE stream_id = ? AND client_id = ?").bind(a.id, clientId).run();
      return toStream(await getStream(ctx, a.id));
    },

    sendChatMessage: async (_: unknown, a: { streamId: string; body: string }, ctx: Context) => {
      const userId = requireUser(ctx);
      await getStream(ctx, a.streamId);
      const body = (a.body ?? "").trim();
      if (body.length < 1 || body.length > 500) {
        throw new GraphQLError("Chat message must be 1-500 characters.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      const recent = await ctx.env.DB.prepare(
        "SELECT COUNT(*) AS count FROM chat_messages WHERE stream_id = ? AND user_id = ? AND julianday(created_at) > julianday('now', '-10 seconds')",
      ).bind(a.streamId, userId).first<{ count: number }>();
      if ((recent?.count ?? 0) >= 5) {
        throw new GraphQLError("Please wait before sending another message.", {
          extensions: { code: "RATE_LIMITED" },
        });
      }
      const id = crypto.randomUUID();
      await ctx.env.DB.prepare(
        "INSERT INTO chat_messages (id, stream_id, user_id, body) VALUES (?, ?, ?, ?)",
      ).bind(id, a.streamId, userId, body).run();
      const row = await ctx.env.DB.prepare("SELECT * FROM chat_messages WHERE id = ?").bind(id).first<{
        id: string; stream_id: string; user_id: string; body: string; created_at: string;
      }>();
      return { id: row!.id, streamId: row!.stream_id, userId: row!.user_id, body: row!.body, createdAt: row!.created_at };
    },

    deleteChatMessage: async (_: unknown, a: { id: string }, ctx: Context) => {
      const userId = requireUser(ctx);
      const row = await ctx.env.DB.prepare(
        "SELECT cm.*, s.owner_id FROM chat_messages cm JOIN streams s ON s.id = cm.stream_id WHERE cm.id = ?",
      ).bind(a.id).first<{ user_id: string; owner_id: string }>();
      if (!row) throw new GraphQLError("Message not found.", { extensions: { code: "NOT_FOUND" } });
      if (row.user_id !== userId && row.owner_id !== userId) {
        throw new GraphQLError("You cannot delete this message.", { extensions: { code: "FORBIDDEN" } });
      }
      await ctx.env.DB.prepare("DELETE FROM chat_messages WHERE id = ?").bind(a.id).run();
      return true;
    },

    reportStream: async (_: unknown, a: { streamId: string; reason: string }, ctx: Context) => {
      const userId = requireUser(ctx);
      await getStream(ctx, a.streamId);
      const reason = (a.reason ?? "").trim();
      if (reason.length < 3 || reason.length > 500) {
        throw new GraphQLError("Report reason must be 3-500 characters.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      await ctx.env.DB.prepare(
        "INSERT INTO stream_reports (id, stream_id, user_id, reason) VALUES (?, ?, ?, ?) ON CONFLICT(stream_id, user_id) DO UPDATE SET reason = excluded.reason, created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), resolved_at = NULL",
      ).bind(crypto.randomUUID(), a.streamId, userId, reason).run();
      return true;
    },

    moderateStream: async (_: unknown, a: { id: string; status: "LIVE" | "HIDDEN" | "CLOSED"; note: string }, ctx: Context) => {
      await requireModerator(ctx);
      if (!["LIVE", "HIDDEN", "CLOSED"].includes(a.status) || a.note.trim().length > 500) {
        throw new GraphQLError("Invalid moderation action.", { extensions: { code: "BAD_USER_INPUT" } });
      }
      await getStream(ctx, a.id);
      await ctx.env.DB.prepare("UPDATE streams SET status = ?, moderation_note = ? WHERE id = ?")
        .bind(a.status, a.note.trim(), a.id).run();
      return toStream(await getStream(ctx, a.id));
    },

    resolveReport: async (_: unknown, a: { id: string }, ctx: Context) => {
      await requireModerator(ctx);
      const result = await ctx.env.DB.prepare(
        "UPDATE stream_reports SET resolved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND resolved_at IS NULL",
      ).bind(a.id).run();
      return (result.meta.changes ?? 0) > 0;
    },
  },
};
