import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import StreamPage from "./pages/StreamPage";
import CreateStreamForm from "./components/CreateStreamForm";
const AccountPage = lazy(() => import("./pages/AccountPage"));
import { getAccessToken, logout as endSession } from "./auth";

export default function App() {
  const loggedIn = Boolean(getAccessToken());
  const username = localStorage.getItem("sparrow_radio_user");
  const logout = async () => {
    try {
      await endSession();
    } catch (error) {
      window.alert(error instanceof Error ? `Сессия на сервере не отозвана: ${error.message}` : "Не удалось отозвать сессию.");
    } finally {
      window.location.assign("/");
    }
  };
  return (
    <div className="mx-auto max-w-5xl px-4 pb-16">
      <header className="flex items-center justify-between gap-3 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/icon.svg" alt="" width="44" height="44" />
          <span><span className="block text-2xl font-bold leading-none tracking-tight">Sparrow Radio</span>
            <span className="text-sm text-sr-muted">Онлайн-радио</span></span>
        </Link>
        {loggedIn ? (
          <div className="flex items-center gap-2">
            <Link to="/create" className="min-h-11 rounded-full bg-sr-green px-4 py-2.5 font-semibold text-[#051a12]">+ Создать поток</Link>
            <button onClick={logout} className="min-h-11 rounded-full bg-sr-surface px-4" title={username || "Аккаунт"}>Выйти</button>
          </div>
        ) : <Link to="/account" className="min-h-11 rounded-full bg-sr-green px-5 py-2.5 font-semibold text-[#051a12]">Войти</Link>}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateStreamForm />} />
          <Route path="/account" element={<Suspense fallback={<p>Загрузка входа…</p>}><AccountPage /></Suspense>} />
          <Route path="/stream/:id" element={<StreamPage />} />
          <Route path="*" element={<p>Страница не найдена.</p>} />
        </Routes>
      </main>
    </div>
  );
}
