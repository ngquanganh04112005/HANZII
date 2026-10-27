import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MASTERY_LABEL, mastery, parseImport, type Mastery, type Word } from "@/game/logic";
import { DEFAULT_COLLECTION } from "@/game/data";
import { useGame } from "@/game/store";
import { SectionTitle, Shell } from "@/components/game/ui";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Tàng Kinh Các — Hanzii" },
      { name: "description", content: "Manage your personal Chinese vocabulary library: add, import, search and track mastery." },
      { property: "og:title", content: "Tàng Kinh Các — Hanzii" },
      { property: "og:description", content: "Your personal Chinese vocabulary library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Library,
});

const MASTERY_CLS: Record<Mastery, string> = {
  new: "border-foreground/30 text-foreground/70",
  learning: "border-jade/60 text-jade",
  difficult: "border-blood/70 text-blood",
  mastered: "border-gold/70 text-gold",
};

function Library() {
  const g = useGame();
  const { state, collections } = g;
  const [q, setQ] = useState("");
  const [filterCol, setFilterCol] = useState("__all__");
  const [filterM, setFilterM] = useState<"all" | Mastery>("all");
  const [editing, setEditing] = useState<Word | null>(null);
  const [form, setForm] = useState({ hanzi: "", pinyin: "", meaning: "", collection: DEFAULT_COLLECTION });
  const [importText, setImportText] = useState("");
  const [importCol, setImportCol] = useState("");
  const [msg, setMsg] = useState("");

  // --- Tra từ: tiếng Việt → tiếng Trung + pinyin ---
  const [lookupInput, setLookupInput] = useState("");
  const [lookupResult, setLookupResult] = useState<{ hanzi: string; pinyin: string; meaning: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const doLookup = async () => {
    const q = lookupInput.trim();
    if (!q) return;
    // Tìm trong thư viện trước
    const local = state.words.find((w) => w.meaning.toLowerCase().includes(q.toLowerCase()));
    if (local) {
      setLookupResult({ hanzi: local.hanzi, pinyin: local.pinyin, meaning: local.meaning });
      setLookupError("");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      // Google Translate unofficial API: vi → zh-CN, trả về hanzi + romanization (pinyin)
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=zh-CN&dt=t&dt=rm&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      const hanzi: string = data[0]?.map((x: unknown[]) => x[0]).join("") ?? "";
      const pinyin: string = data[0]?.map((x: unknown[]) => x[3] ?? "").join(" ").trim() ?? "";
      if (!hanzi || !/[\u4e00-\u9fff]/.test(hanzi)) {
        setLookupError("Không dịch được. Thử từ khác.");
      } else {
        setLookupResult({ hanzi, pinyin, meaning: q });
      }
    } catch {
      setLookupError("Lỗi kết nối. Kiểm tra internet.");
    } finally {
      setLookupLoading(false);
    }
  };

  const addFromLookup = () => {
    if (!lookupResult) return;
    g.addWord({ hanzi: lookupResult.hanzi, pinyin: lookupResult.pinyin, meaning: lookupResult.meaning, collection: form.collection || DEFAULT_COLLECTION });
    setMsg(`Đã thêm “${lookupResult.hanzi}” vào thư viện!`);
    setLookupResult(null);
    setLookupInput("");
  };

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.words
      .filter((w) => filterCol === "__all__" || w.collection === filterCol)
      .filter((w) => filterM === "all" || mastery(w) === filterM)
      .filter((w) => !needle || [w.hanzi, w.pinyin, w.meaning].some((f) => f.toLowerCase().includes(needle)))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [state.words, q, filterCol, filterM]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const pagedList = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset về trang 1 khi filter/search thay đổi
  const setQ2 = (v: string) => { setQ(v); setPage(1); };
  const setFilterCol2 = (v: string) => { setFilterCol(v); setPage(1); };
  const setFilterM2 = (v: "all" | Mastery) => { setFilterM(v); setPage(1); };

  const startEdit = (w: Word) => {
    setEditing(w);
    setForm({ hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, collection: w.collection });
  };
  const resetForm = () => {
    setEditing(null);
    setForm((f) => ({ hanzi: "", pinyin: "", meaning: "", collection: f.collection }));
  };
  const save = () => {
    const entry = { ...form, hanzi: form.hanzi.trim(), collection: form.collection.trim() || DEFAULT_COLLECTION };
    if (!/[\u4e00-\u9fff]/.test(entry.hanzi)) return setMsg("Chữ Hán không hợp lệ.");
    if (editing) g.updateWord(editing.id, entry);
    else g.addWord(entry);
    setMsg(editing ? `Đã sửa “${entry.hanzi}”.` : `Đã thêm “${entry.hanzi}”.`);
    resetForm();
  };
  const doImport = () => {
    const entries = parseImport(importText);
    if (!entries.length) return setMsg("Không tìm thấy dòng hợp lệ nào.");
    const col = importCol.trim() || DEFAULT_COLLECTION;
    const n = g.importWords(entries, col);
    setMsg(`Đã nhập ${n} từ mới vào “${col}”${entries.length - n ? ` (bỏ qua ${entries.length - n} từ trùng)` : ""}.`);
    setImportText("");
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    setImportText(await f.text());
    if (!importCol) setImportCol(f.name.replace(/\.[^.]+$/, ""));
  };

  return (
    <Shell>
      <SectionTitle cn="藏经阁" vi="Tàng Kinh Các · Kho từ vựng cá nhân" />
      {msg && (
        <div className="panel mb-4 flex items-center justify-between rounded-sm px-4 py-2 text-sm text-jade-glow">
          {msg}
          <button onClick={() => setMsg("")} className="text-foreground/50 hover:text-foreground" aria-label="Đóng">✕</button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          {/* Panel Tra từ */}
          <section className="panel corner space-y-3 rounded-sm p-4">
            <h2 className="font-display text-2xl text-gold">查词 · Tra từ Việt</h2>
            <p className="text-xs text-foreground/60">Nhập nghĩa tiếng Việt → ra chữ Hán + pinyin</p>
            <div className="flex gap-2">
              <input
                className="field flex-1"
                placeholder="ví dụ: học tập…"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doLookup(); }}
              />
              <button onClick={doLookup} disabled={lookupLoading || !lookupInput.trim()} className="btn-jade px-4 py-2">
                {lookupLoading ? "⏳" : "查"}
              </button>
            </div>
            {lookupError && <p className="text-xs text-blood">{lookupError}</p>}
            {lookupResult && (
              <div className="panel rounded-sm p-3 text-center">
                <div className="font-display text-5xl text-foreground glow-text">{lookupResult.hanzi}</div>
                <div className="mt-1 text-sm text-jade-glow">{lookupResult.pinyin}</div>
                <div className="mt-0.5 text-xs text-foreground/60">{lookupResult.meaning}</div>
                <button onClick={addFromLookup} className="btn-jade mt-3 w-full py-2 text-sm">
                  + Thêm vào thư viện
                </button>
              </div>
            )}
          </section>

          <section className="panel corner space-y-3 rounded-sm p-4">
            <h2 className="font-display text-2xl text-gold">{editing ? "修订 · Sửa từ" : "新词 · Thêm từ"}</h2>
            <input className="field w-full font-display text-2xl" placeholder="汉字" value={form.hanzi} onChange={(e) => setForm({ ...form, hanzi: e.target.value })} />
            <input className="field w-full" placeholder="Pinyin" value={form.pinyin} onChange={(e) => setForm({ ...form, pinyin: e.target.value })} />
            <input className="field w-full" placeholder="Nghĩa tiếng Việt" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} />
            <input className="field w-full" list="cols" placeholder="Bộ từ" value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} />
            <datalist id="cols">{collections.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="flex gap-2">
              <button onClick={save} className="btn-jade flex-1 py-2">{editing ? "Lưu" : "Thêm"}</button>
              {editing && <button onClick={resetForm} className="btn-ghost px-4 py-2">Hủy</button>}
            </div>
          </section>

          <section className="panel corner space-y-3 rounded-sm p-4">
            <h2 className="font-display text-2xl text-gold">导入 · Nhập hàng loạt</h2>
            <p className="text-xs text-foreground/60">Mỗi dòng: 汉字, pinyin, nghĩa (phân cách bằng tab, dấu phẩy, | hoặc ;). Hỗ trợ tệp .txt / .csv / .tsv.</p>
            <textarea
              className="field h-28 w-full font-mono text-sm"
              placeholder={"学习\txuéxí\thọc tập\n朋友, péngyou, bạn bè"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <input className="field w-full" list="cols" placeholder="Tên bộ từ" value={importCol} onChange={(e) => setImportCol(e.target.value)} />
            <div className="flex gap-2">
              <label className="btn-ghost flex-1 cursor-pointer py-2 text-sm">
                Chọn tệp
                <input type="file" accept=".txt,.csv,.tsv,text/plain,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <button onClick={doImport} disabled={!importText.trim()} className="btn-jade flex-1 py-2">Nhập</button>
            </div>
          </section>

          <section className="panel corner space-y-2 rounded-sm p-4">
            <h2 className="font-display text-2xl text-gold">出战 · Bộ từ chiến đấu</h2>
            <select className="field w-full" value={state.collection} onChange={(e) => g.setCollection(e.target.value)}>
              <option value="__all__">Tất cả ({state.words.length})</option>
              {collections.map((c) => (
                <option key={c} value={c}>{c} ({state.words.filter((w) => w.collection === c).length})</option>
              ))}
            </select>
          </section>
        </div>

        <section className="panel corner rounded-sm p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <input className="field min-w-48 flex-1" placeholder="Tìm chữ Hán, pinyin, nghĩa…" value={q} onChange={(e) => setQ2(e.target.value)} />
            <select className="field" value={filterCol} onChange={(e) => setFilterCol2(e.target.value)}>
              <option value="__all__">Mọi bộ từ</option>
              {collections.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="field" value={filterM} onChange={(e) => setFilterM2(e.target.value as "all" | Mastery)}>
              <option value="all">Mọi trạng thái</option>
              {(Object.keys(MASTERY_LABEL) as Mastery[]).map((m) => <option key={m} value={m}>{MASTERY_LABEL[m]}</option>)}
            </select>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-foreground/60">{list.length} từ · Trang {page}/{totalPages}</p>
            {state.words.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Xóa toàn bộ ${state.words.length} từ? Hành động này không thể hoàn tác!`))
                    g.clearAllWords();
                }}
                className="btn-ghost px-3 py-1 text-xs hover:border-blood! hover:text-blood!"
              >
                Xóa tất cả
              </button>
            )}
          </div>
          <ul className="divide-y divide-gold/15">
            {pagedList.map((w) => {
              const m = mastery(w);
              return (
                <li key={w.id} className="flex items-center gap-4 py-2.5">
                  <span className="w-24 shrink-0 font-display text-3xl text-foreground">{w.hanzi}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-jade-glow">{w.pinyin}</div>
                    <div className="truncate text-sm text-foreground/75">{w.meaning}</div>
                    <div className="text-[11px] text-foreground/45">{w.collection}</div>
                  </div>
                  <div className="hidden text-right text-xs text-foreground/60 sm:block">
                    <div>✓ {w.correct} · ✗ {w.wrong}</div>
                    <span className={`mt-1 inline-block rounded-sm border px-1.5 py-0.5 text-[10px] ${MASTERY_CLS[m]}`}>{MASTERY_LABEL[m]}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(w)} className="btn-ghost px-2.5 py-1 text-xs">Sửa</button>
                    <button
                      onClick={() => { if (confirm(`Xóa “${w.hanzi}”?`)) g.deleteWord(w.id); }}
                      className="btn-ghost px-2.5 py-1 text-xs hover:border-blood! hover:text-blood!"
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              );
            })}
            {!list.length && <li className="py-10 text-center text-sm text-foreground/50">Không có từ nào phù hợp.</li>}
          </ul>

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
              <button onClick={() => setPage(1)} disabled={page === 1} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">‹ Trước</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`e-${i}`} className="px-1 text-foreground/40">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`rounded-sm border px-3 py-1 text-xs transition ${page === p ? "border-gold bg-gold/10 text-gold" : "btn-ghost"}`}
                    >{p}</button>
                  )
                )}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">Sau ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">»</button>
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
