import type { ReactNode } from "react";

export function Kpi({ label, value, note, tone = "default" }: { label: string; value: ReactNode; note?: string; tone?: "default" | "good" | "bad" | "blue" }) {
  return <div className={`kpi kpi-${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}
