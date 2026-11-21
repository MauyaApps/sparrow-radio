import { useState } from "react";
import StreamFilter from "../components/StreamFilter";
import StreamList from "../components/StreamList";
import { useStreams } from "../hooks/useStreams";

export default function HomePage() {
  const [contentType, setContentType] = useState("");
  const [sort, setSort] = useState("POPULAR");
  const [pageNo, setPageNo] = useState(1);
  const { page, loading, error } = useStreams({ contentType, sort, page: pageNo });

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <StreamFilter value={contentType} onChange={(v) => { setContentType(v); setPageNo(1); }} />
        <label className="text-sm text-sr-muted">Сортировка{" "}
          <select value={sort} onChange={(e) => { setSort(e.target.value); setPageNo(1); }}
            className="min-h-11 rounded-lg bg-sr-surface px-3 text-sr-text">
            <option value="POPULAR">По популярности</option>
            <option value="RATING">По рейтингу</option>
            <option value="NEWEST">Сначала новые</option>
          </select>
        </label>
      </div>
      <StreamList page={page} loading={loading} error={error} onPage={setPageNo} />
    </section>
  );
}
