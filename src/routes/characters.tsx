import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { CHARACTERS, type CharacterId } from "@/game/data";
import { useGame } from "@/game/store";
import { Seal, SectionTitle, Shell } from "@/components/game/ui";

export const Route = createFileRoute("/characters")({
  head: () => ({
    meta: [
      { title: "Chọn nhân vật — Hanzii" },
      { name: "description", content: "Choose your path: Sword Cultivator or Talisman Cultivator." },
      { property: "og:title", content: "Chọn nhân vật — Hanzii" },
      { property: "og:description", content: "Sword Cultivator or Talisman Cultivator — pick your path." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CharacterSelect,
});

function CharacterSelect() {
  const { state, setCharacter, setPlayerName, collections, setCollection, activeWords } = useGame();
  const navigate = useNavigate();
  const ids: CharacterId[] = ["sword", "talisman"];
  const [nameInput, setNameInput] = useState(state.playerName);

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed) setPlayerName(trimmed);
  };

  return (
    <Shell>
      <SectionTitle cn="择灵根" vi="Chọn con đường tu luyện" />

      {/* Đặt tên nhân vật */}
      <div className="panel corner mb-6 rounded-sm p-5">
        <h2 className="mb-3 font-display text-2xl text-gold">道号 · Đặt đạo hiệu</h2>
        <div className="flex gap-2">
          <input
            className="field flex-1 font-display text-xl"
            placeholder="Nhập tên đạo hiệu của bạn…"
            value={nameInput}
            maxLength={20}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleNameSave(); }}
          />
          <button
            onClick={handleNameSave}
            disabled={!nameInput.trim()}
            className="btn-jade px-5 py-2"
          >
            {state.playerName && nameInput.trim() === state.playerName ? "✓ Đã lưu" : "Lưu"}
          </button>
        </div>
        {state.playerName && (
          <p className="mt-2 text-xs text-jade-glow">
            Đạo hiệu hiện tại: <span className="font-display text-lg">{state.playerName}</span>
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {ids.map((id) => {
          const c = CHARACTERS[id];
          const selected = state.character === id;
          return (
            <article
              key={id}
              className={`panel corner flex flex-col overflow-hidden rounded-sm transition ${selected ? "ring-2 ring-jade-glow" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="relative h-72 md:h-96">
                <div className={`absolute inset-x-10 top-6 bottom-0 ${selected ? "opacity-70" : "opacity-25"}`}>
                  <Seal char={id === "sword" ? "剑" : "符"} />
                </div>
                <img
                  src={c.image}
                  alt={c.name}
                  width={1024}
                  height={1024}
                  className={`relative mx-auto h-full object-contain drop-shadow-[0_12px_24px_oklch(0_0_0/0.6)] ${selected ? "anim-bob" : ""}`}
                />
                <img src={c.projectile} alt="" className="absolute bottom-6 right-4 w-40 opacity-80 anim-fly" />
              </div>
              <div className="space-y-2 border-t border-gold/30 p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold">{c.name}</h2>
                  <span className="font-display text-3xl text-jade-glow">{c.path}</span>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-gold">{c.pathVi}</p>
                <p className="text-sm text-foreground/75">{c.description}</p>
                <button
                  onClick={() => setCharacter(id)}
                  className={`${selected ? "btn-jade" : "btn-ghost"} mt-2 w-full py-2.5`}
                >
                  {selected ? "✓ Đã chọn" : "Chọn nhân vật"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="panel corner mt-6 flex flex-col gap-3 rounded-sm p-4 md:flex-row md:items-center md:justify-between">
        <label className="flex items-center gap-3 text-sm">
          <span className="text-gold">Bộ từ vựng</span>
          <select className="field" value={state.collection} onChange={(e) => setCollection(e.target.value)}>
            <option value="__all__">Tất cả</option>
            {collections.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="text-foreground/60">{activeWords.length} từ</span>
        </label>
        <button
          disabled={!state.character || activeWords.length === 0}
          onClick={() => navigate({ to: "/combat" })}
          className="btn-jade px-8 py-3 font-display text-2xl"
        >
          开始修炼 <span className="font-serif text-xs">Bắt đầu tu luyện</span>
        </button>
      </div>
    </Shell>
  );
}
