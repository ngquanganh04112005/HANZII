import { describe, expect, it } from "vitest";
import { cultivationRank, isCorrect, mastery, parseImport, pickWord, type Word } from "./logic";

const w = (p: Partial<Word>): Word => ({
  id: "x", hanzi: "山", pinyin: "", meaning: "", collection: "c", correct: 0, wrong: 0, streak: 0, createdAt: 0, ...p,
});

describe("game logic", () => {
  it("mastered after 3 correct in a row", () => {
    expect(mastery({ correct: 3, wrong: 1, streak: 3 })).toBe("mastered");
  });
  it("difficult when mistakes outweigh correct answers", () => {
    expect(mastery({ correct: 1, wrong: 2, streak: 1 })).toBe("difficult");
  });
  it("picks difficult words more often than mastered ones", () => {
    const hard = w({ id: "hard", correct: 0, wrong: 3 });
    const easy = w({ id: "easy", correct: 5, streak: 5 });
    let hardCount = 0;
    let seed = 0;
    for (let i = 0; i < 1000; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      if (pickWord([hard, easy], undefined, () => seed / 233280)?.id === "hard") hardCount++;
    }
    expect(hardCount).toBeGreaterThan(800);
  });
  it("parses tab, comma and pipe separated lines", () => {
    expect(parseImport("学习\txuéxí\thọc tập\n山|shān|núi\nnot chinese, x")).toEqual([
      { hanzi: "学习", pinyin: "xuéxí", meaning: "học tập" },
      { hanzi: "山", pinyin: "shān", meaning: "núi" },
    ]);
  });
  it("answer must match the Chinese characters", () => {
    expect(isCorrect(" 保护 ", { hanzi: "保护" })).toBe(true);
    expect(isCorrect("bǎohù", { hanzi: "保护" })).toBe(false);
  });
  it("rank advances one layer every 5 correct answers", () => {
    expect(cultivationRank(0).label).toBe("练气 · 一层");
    expect(cultivationRank(5).label).toBe("练气 · 二层");
    expect(cultivationRank(45).label).toBe("筑基 · 一层");
  });
});
