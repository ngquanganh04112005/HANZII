import { createFileRoute, Link } from "@tanstack/react-router";
import { MASTERY_LABEL, cultivationRank, mastery, type Mastery } from "@/game/logic";
import { useGame } from "@/game/store";
import { SectionTitle, Shell } from "@/components/game/ui";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Tiến độ tu luyện — Hanzii" },
      { name: "description", content: "Cultivation rank, battle records and vocabulary mastery statistics." },
      { property: "og:title", content: "Tiến độ tu luyện — Hanzii" },
      { property: "og:description", content: "Your cultivation and vocabulary progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { state, resetProgress } = useGame();
  const s = state.stats;
  const rank = cultivationRank(s.totalCorrect);
  const total = s.totalCorrect + s.totalWrong;
  const acc = total ? Math.round((s.totalCorrect / total) * 100) : 0;
  const counts = state.words.reduce(
    (acc, w) => ({ ...acc, [mastery(w)]: acc[mastery(w)] + 1 }),
    { new: 0, learning: 0, difficult: 0, mastered: 0 } as Record<Mastery, number>,
  );
  const hardest = [...state.words].filter((w) => w.wrong > 0).sort((a, b) => b.wrong - b.correct - (a.wrong - a.correct)).slice(0, 8);
  const cards = [
    ["Trận đấu", s.battles], ["Yêu thú hạ gục", s.kills], ["Điểm cao nhất", s.bestScore],
    ["Liên kích dài nhất", s.bestCombo], ["Độ chính xác", `${acc}%`], ["Sát thương nhận", s.damageTaken],
  ] as const;
  const barCls: Record<Mastery, string> = { new: "bg-foreground/30", learning: "bg-jade", difficult: "bg-blood", mastered: "bg-gold" };

  return (
    <Shell>
      <SectionTitle cn="道途" vi="Tiến độ & Thống kê" />
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="panel corner rounded-sm p-5 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/60">Cảnh giới</p>
          <p className="mt-2 font-display text-6xl text-jade-glow glow-text">{rank.realm}</p>
          <p className="font-display text-2xl text-gold">第{rank.layer}层</p>
          <div className="mx-auto mt-4 h-2 max-w-48 overflow-hidden rounded-sm bg-foreground/15">
            <div className="h-full bar-qi" style={{ width: `${rank.progress * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-foreground/60">{s.totalCorrect} câu đúng · mỗi 5 câu lên 1 tầng</p>
          <Link to="/combat" className="btn-jade mt-5 px-6 py-2">Tiếp tục tu luyện</Link>
        </section>

        <section className="panel corner grid grid-cols-2 gap-3 rounded-sm p-5 lg:col-span-2 md:grid-cols-3">
          {cards.map(([k, v]) => (
            <div key={k} className="rounded-sm border border-gold/20 bg-ink/50 p-3">
              <p className="text-xs text-foreground/60">{k}</p>
              <p className="font-display text-3xl text-foreground">{v}</p>
            </div>
          ))}
        </section>

        <section className="panel corner rounded-sm p-5 lg:col-span-2">
          <h2 className="mb-3 font-display text-2xl text-gold">词汇掌握 · Mức thuần thục</h2>
          <div className="flex h-4 overflow-hidden rounded-sm bg-foreground/10">
            {(Object.keys(counts) as Mastery[]).map((m) => (
              <div key={m} className={barCls[m]} style={{ width: `${(counts[m] / Math.max(1, state.words.length)) * 100}%` }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            {(Object.keys(counts) as Mastery[]).map((m) => (
              <span key={m} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-sm ${barCls[m]}`} /> {MASTERY_LABEL[m]}: {counts[m]}
              </span>
            ))}
          </div>
        </section>

        <section className="panel corner rounded-sm p-5">
          <h2 className="mb-3 font-display text-2xl text-gold">难词 · Từ khó</h2>
          {hardest.length ? (
            <ul className="space-y-1.5">
              {hardest.map((w) => (
                <li key={w.id} className="flex items-baseline justify-between">
                  <span className="font-display text-2xl">{w.hanzi}</span>
                  <span className="text-xs text-foreground/60">{w.pinyin} · ✗{w.wrong} ✓{w.correct}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/50">Chưa có từ khó.</p>
          )}
        </section>
      </div>
      <div className="mt-6 text-right">
        <button
          onClick={() => { if (confirm("Đặt lại toàn bộ tiến độ? Từ vựng vẫn được giữ.")) resetProgress(); }}
          className="btn-ghost px-4 py-1.5 text-xs hover:border-blood! hover:text-blood!"
        >
          Đặt lại tiến độ
        </button>
      </div>
    </Shell>
  );
}
