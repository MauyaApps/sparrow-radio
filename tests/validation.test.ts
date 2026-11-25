import { describe, expect, it } from "vitest";
import { validateCreateStream, type CreateStreamInput } from "../src/validation";
import { buildStreamQuery, clampPaging } from "../src/query";

const base: CreateStreamInput = {
  name: "Tech Hour",
  kind: "HOT",
  contentType: "CONVERSATION",
  category: "TALK_SHOW",
  conversationTopic: "Open source and money",
};

describe("validateCreateStream", () => {
  it("accepts a valid conversation stream and marks it as conversation", () => {
    const r = validateCreateStream(base);
    expect(r.ok).toBe(true);
    expect(r.value?.isConversation).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it("warns (not fails) when a talk show has no topic", () => {
    const r = validateCreateStream({ ...base, conversationTopic: null });
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBe(1);
  });

  it("rejects a topic longer than 100 characters", () => {
    const r = validateCreateStream({ ...base, conversationTopic: "x".repeat(101) });
    expect(r.ok).toBe(false);
    expect(r.errors.conversationTopic).toBeDefined();
  });

  it("requires a non-music category for conversation streams", () => {
    const r = validateCreateStream({ ...base, category: "MUSIC" });
    expect(r.ok).toBe(false);
    expect(r.errors.category).toBeDefined();
  });

  it("forces music streams onto the MUSIC category and forbids a topic", () => {
    expect(validateCreateStream({ ...base, contentType: "MUSIC", category: "NEWS", conversationTopic: null }).ok).toBe(false);
    const withTopic = validateCreateStream({ ...base, contentType: "MUSIC", category: "MUSIC" });
    expect(withTopic.ok).toBe(false);
    expect(withTopic.errors.conversationTopic).toBeDefined();
    const ok = validateCreateStream({ ...base, contentType: "MUSIC", category: "MUSIC", conversationTopic: null });
    expect(ok.ok).toBe(true);
    expect(ok.value?.isConversation).toBe(false);
  });

  it("allows any category for mixed streams", () => {
    expect(validateCreateStream({ ...base, contentType: "MIXED", category: "MUSIC" }).ok).toBe(true);
  });

  it("rejects short names, non-https and invalid source URLs", () => {
    expect(validateCreateStream({ ...base, name: "ab" }).errors.name).toBeDefined();
    expect(validateCreateStream({ ...base, sourceUrl: "http://a.example/s" }).errors.sourceUrl).toBeDefined();
    expect(validateCreateStream({ ...base, sourceUrl: "not a url" }).errors.sourceUrl).toBeDefined();
    expect(validateCreateStream({ ...base, sourceUrl: "https://a.example/s" }).ok).toBe(true);
  });

  it("trims and collapses whitespace", () => {
    const r = validateCreateStream({ ...base, name: "  Tech    Hour  " });
    expect(r.value?.name).toBe("Tech Hour");
  });
});

describe("buildStreamQuery", () => {
  it("combines type and category filters with bound parameters", () => {
    const q = buildStreamQuery({ contentType: "CONVERSATION", category: "PODCAST" });
    expect(q.listSql).toContain("content_type = ? AND category = ?");
    expect(q.listBinds).toEqual(["CONVERSATION", "PODCAST", 12, 0]);
  });

  it("escapes LIKE wildcards in search text", () => {
    const q = buildStreamQuery({ text: "50%_off" });
    expect(q.countBinds[0]).toBe("%50\\%\\_off%");
  });

  it("clamps paging", () => {
    expect(clampPaging(0, 9999)).toEqual({ page: 1, pageSize: 50, offset: 0 });
    expect(clampPaging(3, 12).offset).toBe(24);
  });

  it("public listings exclude hidden and closed streams", () => {
    const q = buildStreamQuery({});
    expect(q.listSql).toContain("status = 'LIVE'");
    expect(q.countSql).toContain("status = 'LIVE'");
  });
});
