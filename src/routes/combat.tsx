import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import bg from "@/assets/bg.jpg";
import { CHARACTERS, MONSTERS, type MonsterDef } from "@/game/data";
import { cultivationRank, isCorrect, mastery, pickWord, type Word } from "@/game/logic";
import { useGame } from "@/game/store";
import { Bar, GameNav, Seal } from "@/components/game/ui";

export const Route = createFileRoute("/combat")({
  head: () => ({
    meta: [
      { title: "Tu luyện — Hanzii" },
      { name: "description", content: "Type the Chinese word to strike the approaching spirit beast." },
      { property: "og:title", content: "Tu luyện — Hanzii" },
      { property: "og:description", content: "Type Chinese to defeat spirit beasts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CombatRoute,
});

const TURN_SECONDS = 10;
const PLAYER_MAX_HP = 100;
const SPAWN_X = 1.05;

interface Fx { id: number; kind: "dmg" | "miss" | "hurt" | "kill"; text: string; at: "monster" | "hero" }
interface G {
  hp: number; qi: number; score: number; combo: number; maxCombo: number; kills: number; damageTaken: number;
  monster: { def: MonsterDef; hp: number; x: number; boundUntil: number; dying: boolean } | null;
  word: Word | undefined; timeLeft: number; over: boolean; encounter: number;
  monsterAnim: string; heroAnim: string;
}

function randomMonster(prev?: string) {
  const pool = MONSTERS.filter((m) => m.id !== prev);
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function CombatRoute() {
  const { ready, state } = useGame();
  if (!ready) return <Splash text="载入中… Đang tải" />;
  if (!state.character)
    return (
      <Splash text="Hãy chọn nhân vật trước khi tu luyện.">
        <Link to="/characters" className="btn-jade mt-4 px-6 py-2.5">Chọn nhân vật</Link>
      </Splash>
    );
  return <Combat />;
}

function Splash({ text, children }: { text: string; children?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center bg-ink font-serif text-foreground">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="panel corner relative flex flex-col items-center rounded-sm p-8 text-center">
        <p>{text}</p>
        {children}
      </div>
    </main>
  );
}

/** Track real visible height accounting for mobile software keyboard */
function useVisualViewport() {
  const [size, setSize] = useState({ height: window.innerHeight, offsetTop: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setSize({ height: vv.height, offsetTop: vv.offsetTop });
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return size;
}

function Combat() {
  const { state, activeWords, recordAnswer, recordBattle } = useGame();
  const char = CHARACTERS[state.character!];
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const wordsRef = useRef(activeWords);
  wordsRef.current = activeWords;

  // Track keyboard-adjusted viewport height (iOS/Android)
  const { height: vvHeight, offsetTop: vvTop } = useVisualViewport();

  const g = useRef<G>(null as unknown as G);
  if (!g.current) {
    g.current = {
      hp: PLAYER_MAX_HP, qi: 0, score: 0, combo: 0, maxCombo: 0, kills: 0, damageTaken: 0,
      monster: null, word: undefined, timeLeft: TURN_SECONDS, over: false, encounter: 1,
      monsterAnim: "", heroAnim: "",
    };
  }
  const [fx, setFx] = useState<Fx[]>([]);
  const [shots, setShots] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [composing, setComposing] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fxId = useRef(0);

  const pushFx = useCallback((f: Omit<Fx, "id">) => {
    const id = ++fxId.current;
    setFx((l) => [...l, { ...f, id }]);
    setTimeout(() => setFx((l) => l.filter((x) => x.id !== id)), 1000);
  }, []);

  const nextWord = useCallback(() => {
    g.current.word = pickWord(wordsRef.current, g.current.word?.id);
    g.current.timeLeft = TURN_SECONDS;
  }, []);

  const spawn = useCallback(() => {
    const def = randomMonster(g.current.monster?.def.id);
    g.current.monster = { def, hp: def.hp, x: SPAWN_X, boundUntil: 0, dying: false };
  }, []);

  const flash = (key: "monsterAnim" | "heroAnim", cls: string, ms = 450) => {
    g.current[key] = cls;
    setTimeout(() => { if (g.current[key] === cls) g.current[key] = ""; }, ms);
  };

  const restart = useCallback(() => {
    Object.assign(g.current, {
      hp: PLAYER_MAX_HP, qi: 0, score: 0, combo: 0, maxCombo: 0, kills: 0, damageTaken: 0,
      over: false, encounter: 1, monsterAnim: "", heroAnim: "",
    });
    spawn();
    nextWord();
    setInput("");
    inputRef.current?.focus();
  }, [spawn, nextWord]);

  // init
  useEffect(() => {
    spawn();
    nextWord();
    inputRef.current?.focus();
  }, [spawn, nextWord]);

  const endBattle = useCallback(() => {
    const s = g.current;
    s.over = true;
    recordBattle({ kills: s.kills, score: s.score, combo: s.maxCombo, damage: s.damageTaken });
  }, [recordBattle]);

  // game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = g.current;
      if (!s.over && s.monster && !s.monster.dying) {
        s.timeLeft -= dt;
        if (s.timeLeft <= 0) {
          if (s.word) recordAnswer(s.word.id, false);
          s.combo = 0;
          s.monster.x -= 0.08;
          pushFx({ kind: "miss", text: "时间到!", at: "hero" });
          nextWord();
        }
        if (now > s.monster.boundUntil) s.monster.x -= s.monster.def.speed * dt;
        if (s.monster.x <= 0) {
          const dmg = s.monster.def.attack;
          s.hp = Math.max(0, s.hp - dmg);
          s.damageTaken += dmg;
          s.combo = 0;
          s.monster.x = 0.5;
          flash("monsterAnim", "anim-lunge");
          flash("heroAnim", "anim-hurt");
          pushFx({ kind: "hurt", text: `-${dmg}`, at: "hero" });
          if (s.hp <= 0) endBattle();
        }
      }
      rerender();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [recordAnswer, nextWord, pushFx, endBattle]);

  const submit = () => {
    const s = g.current;
    if (s.over || !s.word || !s.monster || s.monster.dying) return;
    if (!input.trim()) return;
    if (isCorrect(input, s.word)) {
      recordAnswer(s.word.id, true);
      const dmg = char.damage + s.combo * char.comboBonus;
      s.combo += 1;
      s.maxCombo = Math.max(s.maxCombo, s.combo);
      s.qi = Math.min(100, s.qi + 12);
      s.score += 10 * s.combo;
      flash("heroAnim", "anim-cast", 350);
      const shotId = ++fxId.current;
      setShots((l) => [...l, shotId]);
      setTimeout(() => {
        setShots((l) => l.filter((x) => x !== shotId));
        const m = g.current.monster;
        if (!m || m.dying) return;
        // Gõ đúng → quái chết ngay lập tức
        m.hp = 0;
        m.dying = true;
        g.current.kills += 1;
        g.current.score += 100;
        flash("monsterAnim", "anim-hit", 350);
        pushFx({ kind: "dmg", text: `-${dmg}`, at: "monster" });
        pushFx({ kind: "kill", text: "斩!", at: "monster" });
        setTimeout(() => {
          g.current.encounter += 1;
          spawn();
          g.current.timeLeft = TURN_SECONDS;
        }, 700);
      }, 380);
      nextWord();
      setInput("");
    } else {
      recordAnswer(s.word.id, false);
      s.combo = 0;
      s.qi = Math.max(0, s.qi - 10);
      if (s.monster) s.monster.x -= 0.05;
      pushFx({ kind: "miss", text: "错!", at: "hero" });
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setInput("");
    }
  };

  const s = g.current;
  const m = s.monster;
  const rank = cultivationRank(state.stats.totalCorrect);
  const mastered = activeWords.filter((w) => mastery(w) === "mastered").length;
  const monsterLeft = m ? 24 + m.x * 54 : 100;
  const bound = m && performance.now() < m.boundUntil;
  const motionCls = m && !m.dying && !s.monsterAnim
    ? { run: "anim-run", dash: "anim-dash", stomp: "anim-stomp", fly: "anim-flyy", slide: "anim-slide" }[m.def.motion]
    : s.monsterAnim;

  return (
    <main
      className="combat-screen relative w-full overflow-hidden bg-ink font-serif text-foreground"
      style={{ height: vvHeight, marginTop: vvTop }}
    >
      <img src={bg} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/80" />
      <div className="pointer-events-none absolute inset-x-[-10%] bottom-[22%] h-40 anim-mist bg-gradient-to-t from-transparent via-jade-glow/15 to-transparent blur-2xl" />

      {/* Top HUD */}
      <header className="combat-hud absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-1.5 sm:gap-2 sm:p-2 md:gap-3 md:p-4">

        {/* ── Player panel ─────────────────────────────────────── */}
        <div className="panel corner flex min-w-0 items-center gap-1.5 rounded-sm p-1.5
                        w-[46%] sm:w-[42%] sm:gap-2 sm:p-2 md:w-64 lg:w-80">
          {/* Avatar: hidden on tiny mobile, visible sm+ */}
          <div className="hidden h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/70 bg-ink sm:grid sm:h-10 sm:w-10 md:h-12 md:w-12">
            <img src={char.image} alt="" className="h-11 w-11 translate-y-1 object-cover md:h-16 md:w-16 md:translate-y-2" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            {/* Name + rank — single line, clipped */}
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[10px] font-semibold leading-tight sm:text-[11px]">{state.playerName || char.name}</span>
              <span className="shrink-0 font-display text-[10px] text-jade-glow sm:text-xs">{rank.label}</span>
            </div>
            {/* HP bar */}
            <div className="flex items-center gap-1">
              <span className="w-4 shrink-0 text-[9px] text-gold">血</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-[2px] border border-gold/30 bg-ink/80">
                <div className="h-full bar-hp transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, (s.hp / PLAYER_MAX_HP) * 100))}%` }} />
              </div>
            </div>
            {/* Qi bar */}
            <div className="flex items-center gap-1">
              <span className="w-4 shrink-0 text-[9px] text-gold">灵</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-[2px] border border-gold/30 bg-ink/80">
                <div className="h-full bar-qi transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, s.qi))}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Center nav (desktop only) ─────────────────────────── */}
        <div className="panel corner hidden rounded-sm px-4 py-2 lg:block">
          <GameNav compact />
          <div className="mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            Ải {s.encounter} · {state.collection === "__all__" ? "Tất cả" : state.collection}
          </div>
        </div>

        {/* ── Score panel ──────────────────────────────────────── */}
        <div className="panel corner min-w-0 rounded-sm p-1.5
                        w-[46%] sm:w-[42%] sm:p-2 md:w-52 lg:w-60">
          {/* Score row */}
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-[9px] tracking-widest text-gold sm:text-[10px]">SCORE</span>
            <span className="font-display text-base leading-tight text-jade-glow sm:text-lg md:text-2xl">{s.score.toLocaleString()}</span>
          </div>
          {/* Vocab progress */}
          <div className="mt-1 h-1 overflow-hidden rounded-[1px] bg-foreground/15">
            <div className="h-full bg-jade" style={{ width: `${(mastered / Math.max(1, activeWords.length)) * 100}%` }} />
          </div>
          {/* Combo + kills */}
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[9px] text-gold/80 sm:text-[10px]">×{s.combo} 连击</span>
            <span className="text-[9px] text-foreground/70 sm:text-[10px]">斩{s.kills}</span>
          </div>
        </div>
      </header>

      {/* Battlefield */}
      <section className="combat-battlefield absolute inset-x-0" style={{ top: "18%", bottom: "20%" }}>
        {/* hero — smaller min-w on mobile */}
        <div className="absolute bottom-0 left-[3%] w-[18vw] min-w-[80px] max-w-[260px] sm:w-[22vw] sm:min-w-[110px] sm:max-w-[300px]">
          {shots.length > 0 && (
            <div className="absolute -left-[10%] top-[10%] aspect-square w-[120%] opacity-70">
              <Seal char={char.id === "sword" ? "剑" : "符"} />
            </div>
          )}
          <div className="absolute bottom-2 left-1/2 h-4 w-2/3 -translate-x-1/2 rounded-full bg-ink/60 blur-md" />
          <img
            src={char.image}
            alt={char.name}
            width={1024}
            height={1024}
            className={`relative drop-shadow-[0_10px_20px_oklch(0_0_0/0.5)] ${s.heroAnim || "anim-bob"}`}
          />
          {shots.length > 0 && (
            <div className="panel absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm px-3 py-1 font-display text-lg text-jade-glow glow-text">
              {char.attackName}
            </div>
          )}
          {fx.filter((f) => f.at === "hero").map((f) => (
            <div key={f.id} className={`absolute left-1/2 top-[20%] -translate-x-1/2 font-display text-4xl glow-text anim-floatup ${f.kind === "hurt" ? "text-blood" : "text-gold"}`}>
              {f.text}
            </div>
          ))}
        </div>

        {/* projectiles */}
        {shots.map((id) => (
          <Projectile key={id} src={char.projectile} to={monsterLeft} sword={char.id === "sword"} />
        ))}

        {/* monster */}
        {m && (
          <div
            className={`absolute bottom-0 transition-opacity duration-500 ${m.dying ? "opacity-0" : "opacity-100"}`}
            style={{ left: `${monsterLeft}%`, width: `calc(clamp(100px, 18vw, 300px) * ${m.def.scale})`, bottom: m.def.motion === "fly" ? "18%" : 0 }}
          >
            <div className="absolute bottom-full left-1/2 mb-1 w-max -translate-x-1/2 text-center">
              {s.word && !m.dying && (
                <div className="panel corner rounded-sm px-3 pb-2 pt-2 sm:px-6 sm:pb-3 sm:pt-3">
                  <div className="font-display leading-none text-foreground glow-text" style={{ fontSize: "clamp(1.8rem, 7vw, 5rem)" }}>{s.word.hanzi}</div>
                </div>
              )}

            </div>
            {m.def.motion !== "fly" && <div className="absolute bottom-2 left-1/2 h-4 w-2/3 -translate-x-1/2 rounded-full bg-ink/60 blur-md" />}
            {bound && (
              <div className="absolute inset-[10%] anim-bind text-gold">
                <Seal char="定" />
              </div>
            )}
            <img src={m.def.image} alt={m.def.nameVi} width={1024} height={1024} className={`relative ${motionCls}`} />
            {fx.filter((f) => f.at === "monster").map((f) => (
              <div key={f.id} className={`absolute left-[10%] top-[15%] font-display text-5xl glow-text anim-floatup ${f.kind === "kill" ? "text-gold" : "text-blood"}`}>
                {f.text}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Input */}
      <footer className="combat-footer absolute inset-x-0 bottom-0 flex justify-center p-1.5 sm:p-2 md:p-4">
        <form
          className={`panel corner w-full max-w-3xl rounded-sm p-1.5 sm:p-2 md:p-4 ${shake ? "anim-hurt" : ""}`}
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          {/* Timer bar + hint */}
          <div className="mb-1 flex items-center justify-between gap-2 text-[9px] tracking-widest text-gold/70 sm:text-[11px]">
            <span className="hidden sm:inline">输入汉字 · Gõ chữ Hán</span>
            <span className={`font-semibold ${s.timeLeft < 3 ? "text-blood" : ""}`}>⏳ {Math.max(0, Math.ceil(s.timeLeft))}s</span>
          </div>
          <div className="mb-1.5 h-1 overflow-hidden rounded-sm bg-foreground/10">
            <div className="h-full bar-qi transition-[width] duration-100" style={{ width: `${(Math.max(0, s.timeLeft) / TURN_SECONDS) * 100}%` }} />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative flex-1">
              {composing && (
                <div className="panel absolute -top-8 left-2 rounded-sm px-2 py-1 text-xs text-jade-glow sm:-top-11 sm:px-3 sm:py-1.5 sm:text-sm">
                  拼音·{composing}
                </div>
              )}
              <input
                ref={inputRef}
                value={input}
                lang="zh-CN"
                autoComplete="off"
                spellCheck={false}
                disabled={s.over}
                onChange={(e) => setInput(e.target.value)}
                onCompositionUpdate={(e) => setComposing(e.data)}
                onCompositionEnd={() => setComposing("")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.nativeEvent.isComposing) e.stopPropagation();
                }}
                placeholder="例如：保护"
                aria-label="Chinese answer"
                className="h-9 w-full rounded-sm border border-jade/50 bg-ink/80 px-2 font-display text-xl text-foreground outline-none placeholder:text-foreground/25 focus:border-jade-glow sm:h-12 sm:px-4 sm:text-2xl md:h-14 md:text-3xl"
              />
            </div>
            <button type="submit" disabled={s.over}
              className="btn-jade h-9 shrink-0 px-3 font-display text-base sm:h-12 sm:px-5 sm:text-xl md:h-14 md:px-6 md:text-2xl">
              {char.id === "sword" ? "御剑" : "发符"}
            </button>
          </div>
        </form>
      </footer>

      {s.over && (
        <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-sm">
          <div className="panel corner mx-3 w-full max-w-sm rounded-sm p-4 text-center sm:mx-0 sm:p-7">
            <h2 className="font-display glow-text text-blood" style={{ fontSize: "clamp(2rem, 10vw, 3rem)" }}>道消</h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-foreground/60 sm:tracking-[0.3em] sm:text-xs">Tu vi tạm tan · Hết máu</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-sm sm:mt-5">
              <div><dt className="text-[10px] text-foreground/60 sm:text-sm">Điểm</dt><dd className="font-display text-xl text-jade-glow sm:text-2xl">{s.score}</dd></div>
              <div><dt className="text-[10px] text-foreground/60 sm:text-sm">Hạ gục</dt><dd className="font-display text-xl text-jade-glow sm:text-2xl">{s.kills}</dd></div>
              <div><dt className="text-[10px] text-foreground/60 sm:text-sm">Combo</dt><dd className="font-display text-xl text-jade-glow sm:text-2xl">{s.maxCombo}</dd></div>
            </dl>
            <div className="mt-3 flex gap-2 sm:mt-6">
              <button onClick={restart} className="btn-jade flex-1 py-2 text-sm sm:py-2.5">Tu luyện lại</button>
              <Link to="/stats" className="btn-ghost flex-1 py-2 text-sm sm:py-2.5">Xem tiến độ</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Projectile({ src, to, sword }: { src: string; to: number; sword: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    ref.current?.animate(
      sword
        ? [{ left: "18%", opacity: 0.4 }, { left: `${to}%`, opacity: 1 }]
        : [{ left: "18%", transform: "rotate(0) scale(.7)" }, { left: `${to}%`, transform: "rotate(720deg) scale(1)" }],
      { duration: 380, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" },
    );
  }, [to, sword]);
  return (
    <img
      ref={ref}
      src={src}
      alt=""
      className="pointer-events-none absolute top-[45%] w-[28vw] max-w-[440px] -translate-y-1/2 drop-shadow-[0_0_20px_var(--jade-glow)]"
      style={{ left: "18%", width: sword ? undefined : "clamp(90px, 10vw, 160px)" }}
    />
  );
}
