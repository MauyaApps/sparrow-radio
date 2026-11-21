export const TYPES = {
  MUSIC: { icon: "🎵", label: "Музыка" },
  CONVERSATION: { icon: "🎤", label: "Разговор" },
  MIXED: { icon: "🎵🎤", label: "Смешанный" },
};
export const CATEGORY_LABELS = {
  MUSIC: "Музыка", TALK_SHOW: "Ток-шоу", PODCAST: "Подкаст", INTERVIEW: "Интервью",
  NEWS: "Новости", COMEDY: "Юмор", EDUCATIONAL: "Образование", DEBATE: "Дебаты",
};
// Mirrors the server rules (the server stays the source of truth).
const TALK = ["TALK_SHOW", "PODCAST", "INTERVIEW", "NEWS", "COMEDY", "EDUCATIONAL", "DEBATE"];
export const ALLOWED = { MUSIC: ["MUSIC"], CONVERSATION: TALK, MIXED: ["MUSIC", ...TALK] };
export const KIND_LABELS = { HOT: "🔥 Эфир", COLD: "❄️ Архив" };
