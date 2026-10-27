import { createFileRoute, Link } from "@tanstack/react-router";
import bg from "@/assets/bg.jpg";
import { CHARACTERS } from "@/game/data";
import { useGame } from "@/game/store";
import { cultivationRank } from "@/game/logic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hanzii — Học tiếng Trung, tu luyện thành tiên" },
      { name: "description", content: "A chibi xianxia RPG: type Chinese to cast sword arts and talismans against spirit beasts." },
      { property: "og:title", content: "Hanzii" },
      { property: "og:description", content: "A chibi xianxia language-learning RPG." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MainMenu,
});

function MainMenu() {
  const { state } = useGame();
  const char = state.character ? CHARACTERS[state.character] : null;
  const rank = cultivationRank(state.stats.totalCorrect);
  const items = [
    { to: "/characters", cn: "择灵根", vi: "Chọn nhân vật" },
    { to: "/library", cn: "藏经阁", vi: "Tàng Kinh Các · Từ vựng" },
    { to: "/stats", cn: "道途", vi: "Tiến độ & Thống kê" },
  ] as const;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-ink p-4 font-serif text-foreground">
      <img src={bg} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/40 to-ink/90" />
      <div className="absolute inset-x-[-10%] bottom-[25%] h-40 anim-mist bg-gradient-to-t from-transparent via-jade-glow/15 to-transparent blur-2xl" />

      <div className="relative flex w-full max-w-5xl flex-col items-center gap-6 px-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="text-center md:text-left">
          <h1 className="font-display leading-none text-foreground glow-text" style={{ fontSize: "clamp(4rem, 16vw, 9rem)" }}>汉语</h1>
          {char && (
            <p className="mt-4 text-sm text-foreground/75">
              {state.playerName || char.name} · <span className="font-display text-jade-glow">{char.path}</span> · {rank.label}
            </p>
          )}
        </div>

        <div className="panel corner flex w-full max-w-xs flex-col gap-2 rounded-sm p-4 sm:gap-2.5 sm:p-5">
          <Link to={char ? "/combat" : "/characters"} className="btn-jade py-3 font-display text-2xl">
            {char ? "开始修炼" : "踏上仙途"}
            <span className="font-serif text-xs">{char ? "Vào tu luyện" : "Bắt đầu"}</span>
          </Link>
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="btn-ghost justify-between px-4 py-2.5">
              <span className="font-display text-lg">{i.cn}</span>
              <span className="text-xs text-foreground/60">{i.vi}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
