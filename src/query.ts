// Builds parameterized SQL for listing/searching streams. Pure, easy to test.
import type { Category, ContentType, StreamKind } from "./validation";

export type Sort = "POPULAR" | "RATING" | "NEWEST";

export interface StreamFilters {
  contentType?: ContentType | null;
  category?: Category | null;
  kind?: StreamKind | null;
  text?: string | null;
  sort?: Sort | null;
  page?: number | null;
  pageSize?: number | null;
}

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

const ORDER: Record<Sort, string> = {
  POPULAR: "listeners DESC, created_at DESC",
  RATING: "(CAST(rating_sum AS REAL) / MAX(rating_count, 1)) DESC, rating_count DESC, created_at DESC",
  NEWEST: "created_at DESC",
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export function clampPaging(page?: number | null, pageSize?: number | null) {
  const size = Math.min(Math.max(Math.trunc(pageSize ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
  const pg = Math.max(Math.trunc(page ?? 1) || 1, 1);
  return { page: pg, pageSize: size, offset: (pg - 1) * size };
}

export function buildStreamQuery(f: StreamFilters) {
  const where: string[] = ["status = 'LIVE'"];
  const binds: (string | number)[] = [];

  if (f.contentType) { where.push("content_type = ?"); binds.push(f.contentType); }
  if (f.category)    { where.push("category = ?");     binds.push(f.category); }
  if (f.kind)        { where.push("kind = ?");         binds.push(f.kind); }

  const text = (f.text ?? "").trim().slice(0, 100);
  if (text) {
    const like = `%${escapeLike(text)}%`;
    where.push(
      "(name LIKE ? ESCAPE '\\\\' OR description LIKE ? ESCAPE '\\\\' OR conversation_topic LIKE ? ESCAPE '\\\\')",
    );
    binds.push(like, like, like);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { page, pageSize, offset } = clampPaging(f.page, f.pageSize);
  const order = ORDER[f.sort ?? "POPULAR"];

  return {
    page,
    pageSize,
    listSql: `SELECT streams.*, (SELECT COUNT(*) FROM stream_presence p WHERE p.stream_id = streams.id AND julianday(p.last_seen_at) > julianday('now', '-90 seconds')) AS listeners FROM streams ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    listBinds: [...binds, pageSize, offset],
    countSql: `SELECT COUNT(*) AS total FROM streams ${whereSql}`,
    countBinds: binds,
  };
}
