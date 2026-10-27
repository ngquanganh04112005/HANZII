import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_COLLECTION, SEED_WORDS, type CharacterId } from "./data";
import type { ParsedEntry, Word } from "./logic";

export interface Stats {
  battles: number;
  kills: number;
  totalCorrect: number;
  totalWrong: number;
  bestScore: number;
  bestCombo: number;
  damageTaken: number;
}

export interface GameState {
  character: CharacterId | null;
  playerName: string;
  collection: string; // "__all__" = every word
  words: Word[];
  stats: Stats;
}

const EMPTY_STATS: Stats = { battles: 0, kills: 0, totalCorrect: 0, totalWrong: 0, bestScore: 0, bestCombo: 0, damageTaken: 0 };

function seedState(): GameState {
  return {
    character: null,
    playerName: "",
    collection: DEFAULT_COLLECTION,
    stats: { ...EMPTY_STATS },
    words: SEED_WORDS.map(([hanzi, pinyin, meaning], i) => ({
      id: `seed-${i}`, hanzi, pinyin, meaning, collection: DEFAULT_COLLECTION,
      correct: 0, wrong: 0, streak: 0, createdAt: i,
    })),
  };
}

// ---- IndexedDB (single key-value store) ----
const DB = "han-ngu-tu-tien";
const STORE = "kv";
const KEY = "state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function loadState(): Promise<GameState | undefined> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const r = db.transaction(STORE).objectStore(STORE).get(KEY);
    r.onsuccess = () => res(r.result as GameState | undefined);
    r.onerror = () => rej(r.error);
  });
}
async function saveState(s: GameState) {
  const db = await openDb();
  db.transaction(STORE, "readwrite").objectStore(STORE).put(s, KEY);
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));

interface Ctx {
  ready: boolean;
  state: GameState;
  collections: string[];
  activeWords: Word[];
  setCharacter: (c: CharacterId) => void;
  setPlayerName: (name: string) => void;
  setCollection: (c: string) => void;
  addWord: (e: ParsedEntry & { collection: string }) => void;
  updateWord: (id: string, patch: Partial<Word>) => void;
  deleteWord: (id: string) => void;
  importWords: (entries: ParsedEntry[], collection: string) => number;
  clearAllWords: () => void;
  recordAnswer: (id: string, ok: boolean) => void;
  recordBattle: (patch: { kills: number; score: number; combo: number; damage: number }) => void;
  resetProgress: () => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(seedState);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    loadState()
      .then((s) => {
        if (s) setState({ ...seedState(), ...s, stats: { ...EMPTY_STATS, ...s.stats } });
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) saveState(state).catch(() => {});
  }, [state]);

  const update = useCallback((fn: (s: GameState) => GameState) => setState(fn), []);

  const value = useMemo<Ctx>(() => {
    const collections = Array.from(new Set(state.words.map((w) => w.collection))).sort();
    const activeWords = state.collection === "__all__" ? state.words : state.words.filter((w) => w.collection === state.collection);
    const mapWord = (id: string, f: (w: Word) => Word) => update((s) => ({ ...s, words: s.words.map((w) => (w.id === id ? f(w) : w)) }));
    return {
      ready, state, collections,
      activeWords: activeWords.length ? activeWords : state.words,
      setCharacter: (character) => update((s) => ({ ...s, character })),
      setPlayerName: (playerName) => update((s) => ({ ...s, playerName })),
      setCollection: (collection) => update((s) => ({ ...s, collection })),
      addWord: (e) => update((s) => ({ ...s, words: [...s.words, { ...e, id: uid(), correct: 0, wrong: 0, streak: 0, createdAt: Date.now() }] })),
      updateWord: (id, patch) => mapWord(id, (w) => ({ ...w, ...patch })),
      deleteWord: (id) => update((s) => ({ ...s, words: s.words.filter((w) => w.id !== id) })),
      importWords: (entries, collection) => {
        const existing = new Set(state.words.filter((w) => w.collection === collection).map((w) => w.hanzi));
        const fresh = entries.filter((e) => !existing.has(e.hanzi));
        const now = Date.now();
        update((s) => ({
          ...s,
          words: [...s.words, ...fresh.map((e, i) => ({ ...e, collection, id: uid(), correct: 0, wrong: 0, streak: 0, createdAt: now + i }))],
        }));
        return fresh.length;
      },
      clearAllWords: () => update((s) => ({ ...s, words: [] })),
      recordAnswer: (id, ok) =>
        update((s) => ({
          ...s,
          stats: { ...s.stats, totalCorrect: s.stats.totalCorrect + (ok ? 1 : 0), totalWrong: s.stats.totalWrong + (ok ? 0 : 1) },
          words: s.words.map((w) =>
            w.id !== id ? w : ok ? { ...w, correct: w.correct + 1, streak: w.streak + 1 } : { ...w, wrong: w.wrong + 1, streak: 0 },
          ),
        })),
      recordBattle: ({ kills, score, combo, damage }) =>
        update((s) => ({
          ...s,
          stats: {
            ...s.stats,
            battles: s.stats.battles + 1,
            kills: s.stats.kills + kills,
            bestScore: Math.max(s.stats.bestScore, score),
            bestCombo: Math.max(s.stats.bestCombo, combo),
            damageTaken: s.stats.damageTaken + damage,
          },
        })),
      resetProgress: () =>
        update((s) => ({ ...s, stats: { ...EMPTY_STATS }, words: s.words.map((w) => ({ ...w, correct: 0, wrong: 0, streak: 0 })) })),
    };
  }, [state, ready, update]);

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame must be used inside GameProvider");
  return c;
}
