import StreamCard from "./StreamCard";

export default function StreamList({ page, loading, error, onPage }) {
  if (error) return <p role="alert" className="rounded-xl bg-red-900/40 p-4">Не удалось загрузить потоки. Попробуйте позже.</p>;
  if (!page) return <p className="text-sr-muted">Загрузка…</p>;
  if (page.items.length === 0)
    return <p className="rounded-xl bg-sr-surface/60 p-6 text-center text-sr-muted">Потоков пока нет. Создайте первый!</p>;

  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  return (
    <div aria-busy={loading}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {page.items.map((s) => <li key={s.id}><StreamCard stream={s} /></li>)}
      </ul>
      {pages > 1 && (
        <nav aria-label="Страницы" className="mt-6 flex items-center justify-center gap-4">
          <button className="min-h-11 rounded-full bg-sr-surface px-4 disabled:opacity-40" disabled={page.page <= 1} onClick={() => onPage(page.page - 1)}>← Назад</button>
          <span className="text-sm text-sr-muted">{page.page} / {pages}</span>
          <button className="min-h-11 rounded-full bg-sr-surface px-4 disabled:opacity-40" disabled={page.page >= pages} onClick={() => onPage(page.page + 1)}>Вперёд →</button>
        </nav>
      )}
    </div>
  );
}
