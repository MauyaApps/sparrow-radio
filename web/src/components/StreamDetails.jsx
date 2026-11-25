import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { Link, useNavigate, useParams } from "react-router-dom";
import { STREAM } from "../graphql";
import {
  CHAT_MESSAGES, DELETE_STREAM, HEARTBEAT_STREAM, JOIN_STREAM, LEAVE_STREAM, RATE_STREAM, UPDATE_STREAM,
  REPORT_STREAM, SEND_CHAT_MESSAGE, SET_STREAM_STATUS,
} from "../graphql";
import { CATEGORY_LABELS, KIND_LABELS, TYPES } from "../meta";
import { getAccessToken, getListenerClientId } from "../auth";
import AudioPlayer from "./AudioPlayer";

export default function StreamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(STREAM, { variables: { id } });
  const { data: chatData, startPolling, stopPolling } = useQuery(CHAT_MESSAGES, { variables: { streamId: id }, skip: !id });
  const [join] = useMutation(JOIN_STREAM);
  const [heartbeat] = useMutation(HEARTBEAT_STREAM);
  const [leave] = useMutation(LEAVE_STREAM);
  const [rate] = useMutation(RATE_STREAM, { refetchQueries: ["Stream"] });
  const [update] = useMutation(UPDATE_STREAM, { refetchQueries: ["Stream"] });
  const [sendChat] = useMutation(SEND_CHAT_MESSAGE);
  const [report] = useMutation(REPORT_STREAM);
  const [deleteStream] = useMutation(DELETE_STREAM);
  const [setStatus] = useMutation(SET_STREAM_STATUS, { refetchQueries: ["Stream"] });
  const [chatText, setChatText] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const loggedIn = Boolean(getAccessToken());
  const userId = localStorage.getItem("sparrow_radio_user_id");
  const clientId = getListenerClientId();

  useEffect(() => {
    if (!id) return;
    const variables = { id, clientId };
    void join({ variables }).catch((error) => console.error("Could not register listener presence.", error));
    const heartbeatTimer = window.setInterval(() => {
      void heartbeat({ variables }).catch((error) => console.error("Could not refresh listener presence.", error));
    }, 25_000);
    startPolling(3000);
    return () => {
      window.clearInterval(heartbeatTimer);
      stopPolling();
      void leave({ variables }).catch((error) => console.error("Could not remove listener presence.", error));
    };
  }, [id, clientId, join, heartbeat, leave, startPolling, stopPolling]);
  if (loading) return <p className="text-sr-muted">Загрузка…</p>;
  if (error) return <p role="alert">Не удалось загрузить поток.</p>;
  const s = data?.stream;
  if (!s) return <p>Поток не найден. <Link className="underline" to="/">На главную</Link></p>;
  const t = TYPES[s.contentType];

  async function runAction(action) {
    if (!loggedIn) {
      setActionMessage("Войдите в Sparrow, чтобы выполнить это действие.");
      return;
    }
    try {
      await action();
      setActionMessage("");
    } catch (e) {
      setActionMessage(e.graphQLErrors?.[0]?.message || "Не удалось выполнить действие.");
    }
  }

  async function submitChat(event) {
    event.preventDefault();
    if (!chatText.trim()) return;
    await runAction(async () => {
      await sendChat({ variables: { streamId: id, body: chatText.trim() } });
      setChatText("");
    });
  }

  async function deleteAndClose() {
    await runAction(async () => {
      if (!window.confirm("Удалить поток навсегда?")) return;
      await deleteStream({ variables: { id } });
      navigate("/");
    });
  }

  async function saveStream(event) {
    event.preventDefault();
    await runAction(async () => {
      await update({
        variables: {
          id,
          sourceUrl: editSourceUrl.trim() || null,
          description: editDescription.trim(),
        },
      });
      setEditing(false);
    });
  }

  return (
    <article className="mx-auto max-w-2xl rounded-2xl bg-sr-surface/80 p-6">
      <p className="text-sm text-sr-muted">{KIND_LABELS[s.kind]} · {t.icon} {t.label} · {CATEGORY_LABELS[s.category]}</p>
      <h2 className="mt-1 text-3xl font-bold">{s.name}</h2>
      {s.conversationTopic && <p className="mt-3 text-lg">💬 Тема: {s.conversationTopic}</p>}
      {s.description && <p className="mt-3 text-sr-text/90">{s.description}</p>}
      <p className="mt-4 text-sm text-sr-lime">👥 {s.listeners} слушателей · ★ {s.rating || "—"}</p>
      {s.sourceUrl
        ? <AudioPlayer src={s.sourceUrl} name={s.name} />
        : <p className="mt-5 rounded-lg bg-[#051a12] p-3 text-sm text-sr-muted">Источник звука пока не указан.</p>}
      <section className="mt-6 rounded-xl bg-[#051a12] p-4">
        <h3 className="font-semibold">Оценка потока</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) =>
            <button key={value} onClick={() => runAction(() => rate({ variables: { id, value } }))} className="min-h-11 w-11 rounded-full bg-sr-surface">
              ★ {value}
            </button>,
          )}
        </div>
      </section>
      <section className="mt-4 rounded-xl bg-[#051a12] p-4">
        <h3 className="font-semibold">Чат эфира</h3>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {(chatData?.chatMessages ?? []).map((message) =>
            <p key={message.id} className="rounded-lg bg-sr-surface/50 px-3 py-2 text-sm">
              <span className="text-sr-muted">{message.userId.slice(0, 8)}:</span> {message.body}
            </p>,
          )}
        </div>
        {loggedIn ? (
          <form onSubmit={submitChat} className="mt-3 flex gap-2">
            <input value={chatText} onChange={(event) => setChatText(event.target.value)} maxLength={500} className="min-h-11 min-w-0 flex-1 rounded-lg bg-sr-surface px-3" placeholder="Сообщение…" />
            <button className="min-h-11 rounded-full bg-sr-green px-4 font-semibold text-[#051a12]">Отправить</button>
          </form>
        ) : <p className="mt-3 text-sm text-sr-muted">Войдите, чтобы писать в чат.</p>}
      </section>
      {loggedIn && s.ownerId === userId && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => runAction(() => setStatus({ variables: { id, status: s.status === "HIDDEN" ? "LIVE" : "HIDDEN" } }))} className="min-h-11 rounded-full bg-sr-surface px-4">
            {s.status === "HIDDEN" ? "Показать" : "Скрыть"}
          </button>
          <button onClick={() => {
            setEditSourceUrl(s.sourceUrl || "");
            setEditDescription(s.description || "");
            setEditing((value) => !value);
          }} className="min-h-11 rounded-full bg-sr-surface px-4">Изменить источник</button>
          <button onClick={deleteAndClose} className="min-h-11 rounded-full bg-red-900/60 px-4">Удалить поток</button>
        </div>
      )}
      {editing && s.ownerId === userId && (
        <form onSubmit={saveStream} className="mt-4 space-y-3 rounded-xl bg-[#051a12] p-4">
          <label className="block">HTTPS-адрес аудио
            <input value={editSourceUrl} onChange={(event) => setEditSourceUrl(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg bg-sr-surface px-3" inputMode="url" />
          </label>
          <label className="block">Описание
            <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} maxLength={500} className="mt-1 w-full rounded-lg bg-sr-surface p-3" rows={3} />
          </label>
          <button className="min-h-11 rounded-full bg-sr-green px-4 font-semibold text-[#051a12]">Сохранить</button>
        </form>
      )}
      {loggedIn && s.ownerId !== userId && (
        <button onClick={() => {
          const reason = window.prompt("Причина жалобы:");
          if (reason) void runAction(() => report({ variables: { streamId: id, reason } }));
        }} className="mt-4 min-h-11 rounded-full bg-sr-surface px-4">Пожаловаться</button>
      )}
      {actionMessage && <p role="alert" className="mt-3 text-sm text-red-300">{actionMessage}</p>}
    </article>
  );
}
