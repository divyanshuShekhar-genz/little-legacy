/** The prototype's simple column chart (style.css `.bars` / `.bar`, colours from folder-alignment.css). */
const COLORS = ['#93b9ef', '#818cf8', '#67bcb5'];

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex h-[215px] items-end gap-[30px] border-b border-line px-6 pb-[35px] pt-5">
      {data.map((d, i) => (
        <div
          key={d.label}
          className="relative min-h-[4px] flex-1 rounded-t-lg"
          style={{ height: Math.max(3, (d.value / max) * 145), background: COLORS[i % COLORS.length] }}
        >
          <b className="absolute -top-6 w-full text-center text-xs font-medium">{d.value}</b>
          <span className="absolute -bottom-[26px] left-0 w-full text-center text-[11px] text-[#8b8191]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
