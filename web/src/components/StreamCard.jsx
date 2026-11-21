import { Link } from "react-router-dom";
import { CATEGORY_LABELS, KIND_LABELS, TYPES } from "../meta";

export default function StreamCard({ stream: s }) {
  const t = TYPES[s.contentType];
  return (
    <Link to={`/stream/${s.id}`} className="lazy-card block rounded-2xl bg-sr-surface/80 p-4 transition hover:-translate-y-0.5 hover:bg-sr-surface focus-visible:outline-2 focus-visible:outline-sr-lime">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold">{s.name}</h3>
        <span className="text-xs text-sr-muted">{KIND_LABELS[s.kind]}</span>
      </div>
      <p className="mt-1 text-sm text-sr-muted"><span aria-hidden="true">{t.icon}</span> {t.label} · {CATEGORY_LABELS[s.category]}</p>
      {s.conversationTopic && <p className="mt-2 text-sm">💬 Тема: {s.conversationTopic}</p>}
      {s.description && <p className="mt-2 line-clamp-2 text-sm text-sr-text/80">{s.description}</p>}
      <p className="mt-3 text-xs text-sr-lime">👥 {s.listeners} · ★ {s.rating || "—"}</p>
    </Link>
  );
}
