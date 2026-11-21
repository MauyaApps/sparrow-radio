import { TYPES } from "../meta";

const OPTIONS = [["", "Все"], ...Object.entries(TYPES).map(([k, v]) => [k, `${v.icon} ${v.label}`])];

export default function StreamFilter({ value, onChange }) {
  return (
    <div role="group" aria-label="Тип контента" className="flex flex-wrap gap-2">
      {OPTIONS.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}
          className={`min-h-11 rounded-full px-4 text-sm font-medium transition ${
            value === key ? "bg-sr-green text-[#051a12]" : "bg-sr-surface text-sr-text hover:bg-sr-green/30"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}
