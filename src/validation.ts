// Server-side validation for stream creation. Pure functions, no I/O.

export const CONTENT_TYPES = ["MUSIC", "CONVERSATION", "MIXED"] as const;
export const CATEGORIES = [
  "MUSIC", "TALK_SHOW", "PODCAST", "INTERVIEW", "NEWS", "COMEDY", "EDUCATIONAL", "DEBATE",
] as const;
export const KINDS = ["HOT", "COLD"] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];
export type Category = (typeof CATEGORIES)[number];
export type StreamKind = (typeof KINDS)[number];

export interface CreateStreamInput {
  name: string;
  kind: StreamKind;
  contentType: ContentType;
  category: Category;
  description?: string | null;
  conversationTopic?: string | null;
  sourceUrl?: string | null;
}

export interface CleanStream {
  name: string;
  kind: StreamKind;
  contentType: ContentType;
  category: Category;
  description: string;
  conversationTopic: string | null;
  isConversation: boolean;
  sourceUrl: string | null;
}

export type FieldErrors = Partial<Record<keyof CreateStreamInput, string>>;

export interface ValidationResult {
  ok: boolean;
  errors: FieldErrors;
  warnings: string[];
  value?: CleanStream;
}

export const LIMITS = { nameMin: 3, nameMax: 60, topicMax: 100, descriptionMax: 500, urlMax: 500 } as const;

/** Categories that make sense for each content type. */
export const ALLOWED_CATEGORIES: Record<ContentType, readonly Category[]> = {
  MUSIC: ["MUSIC"],
  CONVERSATION: ["TALK_SHOW", "PODCAST", "INTERVIEW", "NEWS", "COMEDY", "EDUCATIONAL", "DEBATE"],
  MIXED: CATEGORIES,
};

/** Categories where a discussion topic is recommended (warning only). */
const TOPIC_RECOMMENDED: readonly Category[] = ["TALK_SHOW", "PODCAST", "INTERVIEW"];

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export function validateCreateStream(input: CreateStreamInput): ValidationResult {
  const errors: FieldErrors = {};
  const warnings: string[] = [];

  const name = collapse(input.name ?? "");
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) {
    errors.name = `Name must be ${LIMITS.nameMin}-${LIMITS.nameMax} characters.`;
  }

  if (!KINDS.includes(input.kind)) errors.kind = "Choose HOT (live) or COLD (archive).";
  if (!CONTENT_TYPES.includes(input.contentType)) errors.contentType = "Unknown content type.";

  if (!CATEGORIES.includes(input.category)) {
    errors.category = "A category is required.";
  } else if (CONTENT_TYPES.includes(input.contentType)) {
    if (!ALLOWED_CATEGORIES[input.contentType].includes(input.category)) {
      errors.category =
        input.contentType === "MUSIC"
          ? "Music streams must use the MUSIC category."
          : "This category does not fit the chosen content type.";
    }
  }

  const topic = input.conversationTopic == null ? "" : collapse(input.conversationTopic);
  if (topic.length > LIMITS.topicMax) {
    errors.conversationTopic = `Topic must be at most ${LIMITS.topicMax} characters.`;
  } else if (topic && input.contentType === "MUSIC") {
    errors.conversationTopic = "A discussion topic is only for conversation or mixed streams.";
  } else if (!topic && input.contentType !== "MUSIC" && TOPIC_RECOMMENDED.includes(input.category)) {
    warnings.push("Adding a discussion topic helps listeners find this stream.");
  }

  const description = (input.description ?? "").trim();
  if (description.length > LIMITS.descriptionMax) {
    errors.description = `Description must be at most ${LIMITS.descriptionMax} characters.`;
  }

  let sourceUrl: string | null = null;
  const rawUrl = (input.sourceUrl ?? "").trim();
  if (rawUrl) {
    if (rawUrl.length > LIMITS.urlMax) {
      errors.sourceUrl = "URL is too long.";
    } else {
      try {
        const u = new URL(rawUrl);
        if (u.protocol !== "https:") errors.sourceUrl = "Only https:// sources are allowed.";
        else sourceUrl = u.toString();
      } catch {
        errors.sourceUrl = "Enter a valid URL.";
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, warnings };

  return {
    ok: true,
    errors,
    warnings,
    value: {
      name,
      kind: input.kind,
      contentType: input.contentType,
      category: input.category,
      description,
      conversationTopic: topic || null,
      isConversation: input.contentType !== "MUSIC",
      sourceUrl,
    },
  };
}
