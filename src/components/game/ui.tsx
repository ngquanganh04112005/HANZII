import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import bg from "@/assets/bg.jpg";

export function Bar({ value, kind, label }: { value: number; kind: "hp" | "qi"; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 font-serif text-[11px] text-gold">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-sm border border-gold/40 bg-ink/80">
        <div
          className={`h-full transition-[width] duration-300 ${kind === "hp" ? "bar-hp" : "bar-qi"}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function Seal({ char = "印" }: { char?: string }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full anim-spin text-jade-glow" fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="92" strokeWidth="1.5" opacity=".8" />
      <circle cx="100" cy="100" r="78" strokeWidth="0.8" strokeDasharray="4 6" />
      <polygon points="100,22 168,140 32,140" strokeWidth="1.2" />
      <polygon points="100,178 32,60 168,60" strokeWidth="1.2" />
      <circle cx="100" cy="100" r="30" strokeWidth="1.5" />
      <text x="100" y="112" textAnchor="middle" fontSize="34" fill="currentColor" stroke="none" fontFamily="Ma Shan Zheng">
        {char}
      </text>
    </svg>
  );
}

const NAV = [
  { to: "/characters", cn: "择灵根", vi: "Nhân vật" },
  { to: "/combat", cn: "修炼", vi: "Tu luyện" },
  { to: "/library", cn: "藏经阁", vi: "Tàng Kinh Các" },
  { to: "/stats", cn: "道途", vi: "Tiến độ" },
] as const;

export function GameNav({ compact = false }: { compact?: boolean }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      <Link to="/" className="mr-2 font-display text-xl tracking-widest text-gold">
        汉语
      </Link>
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          className="btn-ghost px-3 py-1 text-xs"
          activeProps={{ className: "border-gold! text-gold!" }}
        >
          <span className="font-display text-sm">{n.cn}</span>
          {!compact && <span className="hidden text-foreground/60 md:inline">{n.vi}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Background + nav frame used by the non-combat screens. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-ink font-serif text-foreground">
      <img src={bg} alt="" width={1920} height={1088} className="fixed inset-0 h-full w-full object-cover" />
      <div className="fixed inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/90" />
      <div className="relative mx-auto max-w-6xl px-4 py-5 md:px-8">
        <div className="panel corner mb-6 rounded-sm px-4 py-2.5">
          <GameNav />
        </div>
        {children}
      </div>
    </main>
  );
}

export function SectionTitle({ cn, vi }: { cn: string; vi: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-4xl text-gold glow-text md:text-5xl">{cn}</h1>
      <p className="text-xs uppercase tracking-[0.35em] text-foreground/60">{vi}</p>
    </div>
  );
}
