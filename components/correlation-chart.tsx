"use client";

type Med = { drug_name: string; start_date: string | null };
type Skill = { completed_on: string | null };

/** Son kaç Pazartesi haftası gösterilecek (bugüne kadar geriye) */
const CHART_WEEKS = 52;

/** YYYY-MM-DD (veya ISO datetime) → yerel takvim günü */
function parseLocalDay(s: string): Date {
  const day = s.slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function isPlausibleDate(d: Date): boolean {
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= 2000 && y <= 2100;
}

/** Yerel Pazartesi 00:00 (hafta başı) */
function startOfLocalWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay(); // 0 Pazar … 6 Cumartesi
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Grafik ekseni: ardışık N hafta (Pazartesi başlangıç), en eski solda */
function buildWeekStarts(anchor: Date, count: number): Date[] {
  const end = startOfLocalWeek(anchor);
  const out: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const w = new Date(end);
    w.setDate(w.getDate() - i * 7);
    out.push(w);
  }
  return out;
}

function weekIndexForDate(weekStarts: Date[], day: Date): number {
  const w = startOfLocalWeek(day);
  for (let i = 0; i < weekStarts.length; i++) {
    if (sameDay(w, weekStarts[i])) return i;
  }
  return -1;
}

function shortWeekLabel(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

export function CorrelationChart({
  medications,
  skills,
}: {
  medications: Med[];
  skills: Skill[];
}) {
  const now = new Date();
  const weekStarts = buildWeekStarts(now, CHART_WEEKS);
  const counts = weekStarts.map(() => 0);

  let skippedOutsideWindow = 0;
  let skippedBadYear = 0;

  for (const s of skills) {
    if (!s.completed_on) continue;
    const d = parseLocalDay(s.completed_on);
    if (!isPlausibleDate(d)) {
      skippedBadYear += 1;
      continue;
    }
    const idx = weekIndexForDate(weekStarts, d);
    if (idx >= 0) counts[idx] += 1;
    else skippedOutsideWindow += 1;
  }

  const medEvents = medications
    .filter((m) => m.start_date)
    .map((m) => {
      const d = parseLocalDay(m.start_date!);
      if (!isPlausibleDate(d)) {
        skippedBadYear += 1;
        return { idx: -1, label: m.drug_name };
      }
      const idx = weekIndexForDate(weekStarts, d);
      if (idx < 0) skippedOutsideWindow += 1;
      return { idx, label: m.drug_name };
    })
    .filter((e) => e.idx >= 0);

  const maxCount = Math.max(0, ...counts);
  const maxY = Math.max(1, maxCount);
  /** Geniş viewBox + büyük font: dar ekranda ölçeklenince eksen rakamları okunaklı kalsın */
  const w = 640;
  const h = 360;
  const pad = { t: 22, r: 20, b: 58, l: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const yForCount = (c: number) => pad.t + innerH * (1 - c / maxY);

  const points = counts.map((c, i) => {
    const x = pad.l + (innerW * (i + 0.5)) / counts.length;
    const y = yForCount(c);
    return `${x},${y}`;
  });

  const yTicks =
    maxY <= 1 ? [0, 1] : [0, Math.round(maxY / 2), maxY];

  const hasAnySkill = counts.some((c) => c > 0);
  const hasAnyMed = medEvents.length > 0;
  const hasChartData = hasAnySkill || hasAnyMed;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="text-sm font-medium text-neutral-900">
        Korelasyon: ilaç başlangıçları ve haftalık beceri kazanımı
      </h3>
      <p className="mt-1 text-xs text-neutral-500">
        Mavi çizgi: son <strong>{CHART_WEEKS} haftada</strong> (Pazartesi başlangıçlı
        haftalar) tamamlanan <strong>beceri sayısı</strong> (soldaki rakamlar).
        Turuncu çizgiler: aynı aralıkta ilaç başlangıç haftası. Grafiğe tarih
        yazmazsınız; tarihler <strong>Terapist ve eğitim</strong> (beceri
        tamamlanma) ile <strong>Tıbbi konsültasyon</strong> (ilaç başlangıcı)
        kayıtlarından otomatik okunur.
      </p>
      {!hasChartData ? (
        <p className="mt-3 text-sm text-amber-800">
          Bu aralıkta grafikte nokta yok: terapist/eğitimde becerilere{" "}
          <strong>tamamlanma tarihi</strong>, tıbbi modülde ilaçlara{" "}
          <strong>başlangıç tarihi</strong> girilmeli ve tarihler{" "}
          <strong>2000–2100</strong> aralığında, mümkünse son bir yıl içinde
          olmalıdır.
        </p>
      ) : null}
      {hasChartData && skippedOutsideWindow > 0 ? (
        <p className="mt-2 text-xs text-neutral-600">
          Not: {skippedOutsideWindow} kayıt son {CHART_WEEKS} haftanın dışında
          kaldığı için bu grafikte gösterilmiyor (ör. çok eski ilaç başlangıcı).
        </p>
      ) : null}
      {skippedBadYear > 0 ? (
        <p className="mt-2 text-xs text-red-700">
          {skippedBadYear} kayıtta hatalı veya mantık dışı tarih var (ör. yıl
          13213); düzeltince grafikte görünür.
        </p>
      ) : null}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-4 h-auto w-full max-w-full"
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
        {yTicks.map((tick) => {
          const y = yForCount(tick);
          return (
            <g key={`yt-${tick}`}>
              {tick > 0 ? (
                <line
                  x1={pad.l}
                  y1={y}
                  x2={pad.l + innerW}
                  y2={y}
                  stroke="#f5f5f5"
                  strokeWidth={1}
                />
              ) : null}
              <text
                x={pad.l - 8}
                y={y + 5}
                textAnchor="end"
                fill="#404040"
                fontSize={15}
                fontWeight={600}
              >
                {tick}
              </text>
            </g>
          );
        })}
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(" ")}
        />
        {weekStarts.map((ws, i) => {
          const x = pad.l + (innerW * (i + 0.5)) / weekStarts.length;
          /** ~6 haftada bir etiket: mobilde üst üste binmesin, yazı büyük olabilsin */
          const showX = i % 6 === 0;
          return (
            <text
              key={ws.getTime()}
              x={x}
              y={h - 14}
              textAnchor="middle"
              fill="#525252"
              fontSize={13}
              fontWeight={500}
            >
              {showX ? shortWeekLabel(ws) : ""}
            </text>
          );
        })}
        {medEvents.map((e, i) => {
          const x = pad.l + (innerW * (e.idx + 0.5)) / weekStarts.length;
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
              <text x={x + 4} y={pad.t + 14} fill="#c2410c" fontSize={12} fontWeight={600}>
                {e.label.length > 14 ? `${e.label.slice(0, 12)}…` : e.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
