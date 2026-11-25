import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, register } from "../auth";

export default function AccountPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        await login(username.trim(), password);
        nav("/");
      } else {
        await register(username.trim(), password);
        await login(username.trim(), password);
        nav("/");
      }
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось войти.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-2xl bg-sr-surface/80 p-6">
      <h1 className="text-2xl font-bold">{mode === "login" ? "Вход в Sparrow" : "Регистрация Sparrow"}</h1>
      <label className="block">Имя пользователя
        <input className="mt-1 min-h-11 w-full rounded-lg bg-[#051a12] px-3" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
      </label>
      <label className="block">Пароль
        <input type="password" className="mt-1 min-h-11 w-full rounded-lg bg-[#051a12] px-3" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </label>
      {message && <p role="alert" className="text-red-300">{message}</p>}
      <button disabled={busy} className="min-h-11 w-full rounded-full bg-sr-green font-semibold text-[#051a12]">
        {busy ? "Подождите…" : mode === "login" ? "Войти" : "Создать аккаунт"}
      </button>
      <button type="button" className="min-h-11 w-full text-sr-muted" onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
      </button>
    </form>
  );
}
