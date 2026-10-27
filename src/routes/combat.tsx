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

function Combat() {
  const { state, activeWords, recordAnswer, recordBattle } = useGame();
  const char = CHARACTERS[state.character!];
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const wordsRef = useRef(activeWords);
  wordsRef.current = activeWords;

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
    <main className="relative h-screen min-h-[620px] w-full overflow-hidden bg-ink font-serif text-foreground">
      <img src={bg} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/80" />
      <div className="pointer-events-none absolute inset-x-[-10%] bottom-[22%] h-40 anim-mist bg-gradient-to-t from-transparent via-jade-glow/15 to-transparent blur-2xl" />

      {/* Top HUD */}
      <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 md:p-5">
        <div className="panel corner flex w-60 items-center gap-3 rounded-sm p-3 md:w-80">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-gold/70 bg-ink">
            <img src={char.image} alt="" className="h-16 w-16 translate-y-2 object-cover" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold">{state.playerName || char.name}</span>
              <span className="whitespace-nowrap font-display text-sm text-jade-glow">{rank.label}</span>
            </div>
            <Bar value={(s.hp / PLAYER_MAX_HP) * 100} kind="hp" label="血" />
            <Bar value={s.qi} kind="qi" label="灵" />
          </div>
        </div>

        <div className="panel corner hidden rounded-sm px-4 py-2 lg:block">
          <GameNav compact />
          <div className="mt-1 text-center text-[10px] uppercase tracking-[0.3em] text-foreground/60">
            Ải {s.encounter} · {state.collection === "__all__" ? "Tất cả" : state.collection}
          </div>
        </div>

        <div className="panel corner w-52 rounded-sm p-3 md:w-64">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] tracking-widest text-gold">功德 SCORE</span>
            <span className="font-display text-2xl text-jade-glow">{s.score.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-foreground/70">
            <span>词汇 · Thuần thục</span>
            <span>{mastered} / {activeWords.length}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-[1px] bg-foreground/15">
            <div className="h-full bg-jade" style={{ width: `${(mastered / Math.max(1, activeWords.length)) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px]">
            <span className="text-gold/80">连击 Combo ×{s.combo}</span>
            <span className="text-foreground/70">斩 {s.kills}</span>
          </div>
        </div>
      </header>

      {/* Battlefield */}
      <section className="absolute inset-x-0 bottom-[150px] top-[120px] md:bottom-[170px]">
        {/* hero */}
        <div className="absolute bottom-0 left-[4%] w-[22vw] min-w-[160px] max-w-[320px]">
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
            style={{ left: `${monsterLeft}%`, width: `calc(clamp(170px, 22vw, 340px) * ${m.def.scale})`, bottom: m.def.motion === "fly" ? "18%" : 0 }}
          >
            <div className="absolute bottom-full left-1/2 mb-2 w-max -translate-x-1/2 text-center">
              {s.word && !m.dying && (
                <div className="panel corner rounded-sm px-7 pb-3 pt-3">
                  <div className="font-display text-6xl leading-none text-foreground glow-text md:text-8xl">{s.word.hanzi}</div>
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
      <footer className="absolute inset-x-0 bottom-0 flex justify-center p-3 md:p-5">
        <form
          className={`panel corner w-full max-w-3xl rounded-sm p-3 md:p-4 ${shake ? "anim-hurt" : ""}`}
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className="mb-2 flex items-center justify-between text-[11px] tracking-widest text-gold/80">
            <span>输入汉字 · Gõ chữ Hán bằng bộ gõ tiếng Trung</span>
            <span className="flex items-center gap-3">
              <span className={s.timeLeft < 3 ? "text-blood" : ""}>⏳ {Math.max(0, Math.ceil(s.timeLeft))}s</span>
              <span className="hidden sm:inline">Enter ↵ 出招</span>
            </span>
          </div>
          <div className="mb-2 h-1 overflow-hidden rounded-sm bg-foreground/10">
            <div className="h-full bar-qi" style={{ width: `${(Math.max(0, s.timeLeft) / TURN_SECONDS) * 100}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              {composing && (
                <div className="panel absolute -top-11 left-2 rounded-sm px-3 py-1.5 text-sm text-jade-glow">
                  拼音 · {composing}
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
                className="h-14 w-full rounded-sm border border-jade/50 bg-ink/80 px-4 font-display text-3xl text-foreground outline-none placeholder:text-foreground/25 focus:border-jade-glow"
              />
            </div>
            <button type="submit" disabled={s.over} className="btn-jade h-14 px-6 font-display text-2xl">
              {char.id === "sword" ? "御剑" : "发符"}
            </button>
          </div>
        </form>
      </footer>

      {s.over && (
        <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-sm">
          <div className="panel corner w-full max-w-sm rounded-sm p-7 text-center">
            <h2 className="font-display text-5xl text-blood glow-text">道消</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-foreground/60">Tu vi tạm tan · Hết máu</p>
            <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-foreground/60">Điểm</dt><dd className="font-display text-2xl text-jade-glow">{s.score}</dd></div>
              <div><dt className="text-foreground/60">Hạ gục</dt><dd className="font-display text-2xl text-jade-glow">{s.kills}</dd></div>
              <div><dt className="text-foreground/60">Liên kích</dt><dd className="font-display text-2xl text-jade-glow">{s.maxCombo}</dd></div>
            </dl>
            <div className="mt-6 flex gap-2">
              <button onClick={restart} className="btn-jade flex-1 py-2.5">Tu luyện lại</button>
              <Link to="/stats" className="btn-ghost flex-1 py-2.5">Xem tiến độ</Link>
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
