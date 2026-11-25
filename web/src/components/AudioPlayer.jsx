import { useEffect, useRef, useState } from "react";

export default function AudioPlayer({ src, name }) {
  const audio = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = audio.current;
    if (!element || !src) return;
    setError("");
    const handleMediaError = () => setError("Источник не загрузился. Проверьте адрес аудио и разрешение CORS.");
    element.addEventListener("error", handleMediaError);

    if (/\.m3u8(?:$|[?#])/i.test(src)) {
      if (element.canPlayType("application/vnd.apple.mpegurl")) {
        element.src = src;
        element.load();
        return () => element.removeEventListener("error", handleMediaError);
      }

      let disposed = false;
      let hls;
      void import("hls.js/light").then(({ default: Hls }) => {
        if (disposed) return;
        if (!Hls.isSupported()) {
          element.src = src;
          element.load();
          return;
        }
        hls = new Hls({ enableWorker: true });
        hls.loadSource(src);
        hls.attachMedia(element);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setError("Не удалось загрузить аудиопоток. Проверьте ссылку и CORS источника.");
        });
      }).catch(() => {
        if (!disposed) setError("Не удалось загрузить HLS-плеер.");
      });
      return () => {
        disposed = true;
        hls?.destroy();
        element.removeEventListener("error", handleMediaError);
      };
    }

    element.src = src;
    element.load();
    return () => element.removeEventListener("error", handleMediaError);
  }, [src]);

  return (
    <div className="mt-5">
      <audio ref={audio} className="w-full" controls preload="none" aria-label={`Плеер: ${name}`} />
      {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}
