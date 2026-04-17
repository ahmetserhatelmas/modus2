"use client";

type Med = { drug_name: string; start_date: string | null };
type Skill = { completed_on: string | null };

function weekKey(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const w = Math.ceil(((+x - +y) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(w).padStart(2, "0")}`;
}

export function CorrelationChart({
  medications,
  skills,
}: {
  medications: Med[];
  skills: Skill[];
}) {
  const now = new Date();
  const weeks: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    weeks.push(weekKey(d));
  }

  const skillCounts = new Map<string, number>();
  for (const w of weeks) skillCounts.set(w, 0);
  for (const s of skills) {
    if (!s.completed_on) continue;
    const wk = weekKey(new Date(s.completed_on));
    if (skillCounts.has(wk)) skillCounts.set(wk, (skillCounts.get(wk) ?? 0) + 1);
  }

  const medEvents = medications
    .filter((m) => m.start_date)
    .map((m) => ({
      week: weekKey(new Date(m.start_date!)),
      label: m.drug_name,
    }))
    .filter((e) => weeks.includes(e.week));

  const counts = weeks.map((w) => skillCounts.get(w) ?? 0);
  const maxY = Math.max(1, ...counts);
  const w = 640;
  const h = 220;
  const pad = { t: 16, r: 24, b: 36, l: 40 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const points = weeks.map((_, i) => {
    const x = pad.l + (innerW * (i + 0.5)) / weeks.length;
    const y = pad.t + innerH * (1 - counts[i] / maxY);
    return `${x},${y}`;
  });

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium text-neutral-900">
        Korelasyon: ilaç başlangıçları ve haftalık beceri kazanımı
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Mavi çizgi: haftalık tamamlanan beceri sayısı. Dikey çizgiler: ilaç
        başlangıç haftası (PDF’teki çift eksenli fikrin sade görünümü).
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-4 w-full max-w-full"
        role="img"
        aria-label="İlaç ve eğitsel ilerleme grafiği"
      >
        <line
          x1={pad.l}
          y1={pad.t + innerH}
          x2={pad.l + innerW}
          y2={pad.t + innerH}
          stroke="#e5e5e5"
        />
        <line
          x1={pad.l}
          y1={pad.t}
          x2={pad.l}
          y2={pad.t + innerH}
          stroke="#e5e5e5"
        />
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          points={points.join(" ")}
        />
        {weeks.map((_, i) => {
          const x = pad.l + (innerW * (i + 0.5)) / weeks.length;
          return (
            <text
              key={weeks[i]}
              x={x}
              y={h - 8}
              textAnchor="middle"
              fill="#a3a3a3"
              fontSize={9}
            >
              {i % 2 === 0 ? String(i + 1) : ""}
            </text>
          );
        })}
        {medEvents.map((e, i) => {
          const idx = weeks.indexOf(e.week);
          if (idx < 0) return null;
          const x = pad.l + (innerW * (idx + 0.5)) / weeks.length;
          return (
            <g key={`${e.label}-${i}`}>
              <line
                x1={x}
                y1={pad.t}
                x2={x}
                y2={pad.t + innerH}
                stroke="#f97316"
                strokeDasharray="4 3"
                opacity={0.85}
              />
              <text
                x={x + 4}
                y={pad.t + 12}
                fill="#ea580c"
                fontSize={9}
              >
                {e.label.length > 14 ? `${e.label.slice(0, 12)}…` : e.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
