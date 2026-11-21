import { useState } from "react";
import { useMutation } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { CREATE_STREAM } from "../graphql";
import { ALLOWED, CATEGORY_LABELS, TYPES } from "../meta";

const field = "mt-1 w-full min-h-11 rounded-lg bg-[#051a12] px-3 text-sr-text outline-1 outline-sr-green/40 focus:outline-2";

export default function CreateStreamForm() {
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", kind: "HOT", contentType: "MUSIC", category: "MUSIC", conversationTopic: "", description: "", sourceUrl: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [create, { loading }] = useMutation(CREATE_STREAM);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickType = (contentType) =>
    setF({ ...f, contentType, category: ALLOWED[contentType][0], conversationTopic: contentType === "MUSIC" ? "" : f.conversationTopic });

  async function submit(e) {
    e.preventDefault();
    setErrors({}); setMessage("");
    try {
      const input = { ...f, conversationTopic: f.conversationTopic || null, description: f.description || null, sourceUrl: f.sourceUrl || null };
      const { data } = await create({ variables: { input } });
      nav(`/stream/${data.createStream.stream.id}`);
    } catch (err) {
      const ge = err.graphQLErrors?.[0];
      setErrors(ge?.extensions?.fields || {});
      setMessage(ge?.message || "Не удалось создать поток. Попробуйте позже.");
    }
  }

  const Err = ({ k }) => errors[k] ? <p role="alert" className="mt-1 text-sm text-red-300">{errors[k]}</p> : null;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-5 rounded-2xl bg-sr-surface/80 p-5">
      <h2 className="text-2xl font-bold">Новый поток</h2>
      <label className="block">Название
        <input className={field} value={f.name} onChange={set("name")} maxLength={60} required /><Err k="name" />
      </label>
      <fieldset><legend>Тип потока</legend>
        <div className="mt-1 flex gap-2">{[["HOT", "🔥 Эфир (live)"], ["COLD", "❄️ Архив"]].map(([v, l]) => (
          <label key={v} className="flex-1"><input type="radio" name="kind" className="peer sr-only" checked={f.kind === v} onChange={() => setF({ ...f, kind: v })} />
            <span className="block min-h-11 cursor-pointer rounded-lg bg-[#051a12] p-2 text-center peer-checked:bg-sr-green peer-checked:text-[#051a12] peer-focus-visible:outline-2">{l}</span></label>))}
        </div>
      </fieldset>
      <fieldset><legend>Контент</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">{Object.entries(TYPES).map(([v, t]) => (
          <label key={v}><input type="radio" name="contentType" className="peer sr-only" checked={f.contentType === v} onChange={() => pickType(v)} />
            <span className="block min-h-11 cursor-pointer rounded-lg bg-[#051a12] p-2 text-center text-sm peer-checked:bg-sr-green peer-checked:text-[#051a12] peer-focus-visible:outline-2">{t.icon} {t.label}</span></label>))}
        </div><Err k="contentType" />
      </fieldset>
      <label className="block">Категория
        <select className={field} value={f.category} onChange={set("category")}>
          {ALLOWED[f.contentType].map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select><Err k="category" />
      </label>
      {f.contentType !== "MUSIC" && (
        <label className="block">Тема обсуждения <span className="text-sr-muted">({f.conversationTopic.length}/100)</span>
          <input className={field} value={f.conversationTopic} onChange={set("conversationTopic")} maxLength={100} /><Err k="conversationTopic" />
        </label>
      )}
      <label className="block">Описание
        <textarea className={field} rows={3} value={f.description} onChange={set("description")} maxLength={500} /><Err k="description" />
      </label>
      <label className="block">Ссылка на звук (https, необязательно)
        <input className={field} value={f.sourceUrl} onChange={set("sourceUrl")} inputMode="url" /><Err k="sourceUrl" />
      </label>
      {message && <p role="alert" className="rounded-lg bg-red-900/40 p-3 text-sm">{message}</p>}
      <button disabled={loading} className="min-h-11 w-full rounded-full bg-sr-green font-semibold text-[#051a12] disabled:opacity-50">
        {loading ? "Создаём…" : "Создать поток"}
      </button>
    </form>
  );
}
