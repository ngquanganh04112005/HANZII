import { RANKS } from "./data";

export interface Word {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  collection: string;
  correct: number;
  wrong: number;
  /** consecutive correct answers */
  streak: number;
  createdAt: number;
}

export type Mastery = "new" | "learning" | "difficult" | "mastered";

export function mastery(w: Pick<Word, "correct" | "wrong" | "streak">): Mastery {
  if (w.correct === 0 && w.wrong === 0) return "new";
  if (w.streak >= 3 && w.correct >= 3) return "mastered";
  if (w.wrong > 0 && (w.wrong >= w.correct || w.streak === 0)) return "difficult";
  return "learning";
}

export const MASTERY_LABEL: Record<Mastery, string> = {
  new: "Mới",
  learning: "Đang học",
  difficult: "Khó",
  mastered: "Thuần thục",
};

/** Difficult words get picked much more often; mastered words rarely. */
export function wordWeight(w: Word): number {
  const m = mastery(w);
  if (m === "mastered") return 0.4;
  if (m === "difficult") return 3 + w.wrong;
  if (m === "new") return 1.5;
  return 1;
}

export function pickWord(words: Word[], avoidId?: string, rand = Math.random): Word | undefined {
  const pool = words.length > 1 ? words.filter((w) => w.id !== avoidId) : words;
  if (!pool.length) return undefined;
  const total = pool.reduce((s, w) => s + wordWeight(w), 0);
  let r = rand() * total;
  for (const w of pool) {
    r -= wordWeight(w);
    if (r <= 0) return w;
  }
  return pool[pool.length - 1];
}

export interface ParsedEntry {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

/** One entry per line: 汉字 <sep> pinyin <sep> nghĩa. Separators: tab, comma, |, ; */
export function parseImport(text: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\t|\||;|,|，/).map((p) => p.trim());
    const hanzi = parts[0];
    if (!hanzi || !/[\u4e00-\u9fff]/.test(hanzi)) continue;
    out.push({ hanzi, pinyin: parts[1] ?? "", meaning: parts.slice(2).join(", ") });
  }
  return out;
}

export function normalizeAnswer(s: string) {
  return s.replace(/[\s，。！？、,.!?]/g, "");
}

export function isCorrect(input: string, w: Pick<Word, "hanzi">) {
  return normalizeAnswer(input) === normalizeAnswer(w.hanzi) && input.trim().length > 0;
}

/** 9 layers per realm, 5 correct answers per layer. */
export function cultivationRank(totalCorrect: number) {
  const layer = Math.floor(totalCorrect / 5);
  const realm = Math.min(RANKS.length - 1, Math.floor(layer / 9));
  const inRealm = realm === RANKS.length - 1 ? Math.min(8, layer - realm * 9) : layer % 9;
  const cn = ["一", "二", "三", "四", "五", "六", "七", "八", "九"][inRealm];
  return { realm: RANKS[realm], layer: inRealm + 1, label: `${RANKS[realm]} · ${cn}层`, progress: (totalCorrect % 5) / 5 };
}
