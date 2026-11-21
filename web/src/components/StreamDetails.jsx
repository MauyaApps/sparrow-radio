import { useQuery } from "@apollo/client";
import { Link, useParams } from "react-router-dom";
import { STREAM } from "../graphql";
import { CATEGORY_LABELS, KIND_LABELS, TYPES } from "../meta";

export default function StreamDetails() {
  const { id } = useParams();
  const { data, loading, error } = useQuery(STREAM, { variables: { id } });
  if (loading) return <p className="text-sr-muted">Загрузка…</p>;
  if (error) return <p role="alert">Не удалось загрузить поток.</p>;
  const s = data?.stream;
  if (!s) return <p>Поток не найден. <Link className="underline" to="/">На главную</Link></p>;
  const t = TYPES[s.contentType];

  return (
    <article className="mx-auto max-w-2xl rounded-2xl bg-sr-surface/80 p-6">
      <p className="text-sm text-sr-muted">{KIND_LABELS[s.kind]} · {t.icon} {t.label} · {CATEGORY_LABELS[s.category]}</p>
      <h2 className="mt-1 text-3xl font-bold">{s.name}</h2>
      {s.conversationTopic && <p className="mt-3 text-lg">💬 Тема: {s.conversationTopic}</p>}
      {s.description && <p className="mt-3 text-sr-text/90">{s.description}</p>}
      <p className="mt-4 text-sm text-sr-lime">👥 {s.listeners} слушателей · ★ {s.rating || "—"}</p>
      {s.sourceUrl
        ? <audio className="mt-5 w-full" controls preload="none" src={s.sourceUrl} aria-label={`Плеер: ${s.name}`} />
        : <p className="mt-5 rounded-lg bg-[#051a12] p-3 text-sm text-sr-muted">Источник звука пока не указан.</p>}
    </article>
  );
}
