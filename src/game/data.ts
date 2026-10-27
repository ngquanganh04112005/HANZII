import hero from "@/assets/hero.png";
import heroine from "@/assets/heroine.png";
import sword from "@/assets/sword.png";
import talisman from "@/assets/talisman.png";
import fox from "@/assets/monster.png";
import wolf from "@/assets/m-wolf.png";
import stone from "@/assets/m-stone.png";
import bird from "@/assets/m-bird.png";
import water from "@/assets/m-water.png";

export type CharacterId = "sword" | "talisman";

export interface CharacterDef {
  id: CharacterId;
  name: string;
  path: string;
  pathVi: string;
  description: string;
  image: string;
  projectile: string;
  attackName: string;
  /** base damage per correct answer */
  damage: number;
  /** extra damage per combo step */
  comboBonus: number;
  /** seconds the enemy is bound (cannot move) after a hit */
  bind: number;
  knockback: number;
}

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  sword: {
    id: "sword",
    name: "Kiếm Tu",
    path: "剑修",
    pathVi: "jiàn xiū",
    description:
      "Ngự kiếm phi hành. Phi kiếm cực nhanh, sát thương tăng mạnh theo chuỗi liên kích.",
    image: hero,
    projectile: sword,
    attackName: "御剑术!",
    damage: 30,
    comboBonus: 6,
    bind: 0,
    knockback: 0.12,
  },
  talisman: {
    id: "talisman",
    name: "Phù Tu",
    path: "符修",
    pathVi: "fú xiū",
    description:
      "Phù lục vàng phong ấn yêu thú. Mỗi lá bùa trói chân kẻ địch trong giây lát.",
    image: heroine,
    projectile: talisman,
    attackName: "定身符!",
    damage: 26,
    comboBonus: 3,
    bind: 2,
    knockback: 0.05,
  },
};

export type Motion = "run" | "dash" | "stomp" | "fly" | "slide";

export interface MonsterDef {
  id: string;
  name: string;
  nameVi: string;
  image: string;
  hp: number;
  /** fraction of the battlefield crossed per second */
  speed: number;
  attack: number;
  motion: Motion;
  /** relative display size */
  scale: number;
}

export const MONSTERS: MonsterDef[] = [
  { id: "fox", name: "青角灵狐", nameVi: "Linh Hồ Ngọc Giác", image: fox, hp: 60, speed: 0.07, attack: 12, motion: "run", scale: 1 },
  { id: "wolf", name: "暗影妖狼", nameVi: "Ám Ảnh Yêu Lang", image: wolf, hp: 75, speed: 0.12, attack: 18, motion: "dash", scale: 1 },
  { id: "stone", name: "石甲玄兽", nameVi: "Thạch Giáp Huyền Thú", image: stone, hp: 170, speed: 0.035, attack: 28, motion: "stomp", scale: 1.15 },
  { id: "bird", name: "赤焰魔鸟", nameVi: "Xích Diễm Ma Điểu", image: bird, hp: 85, speed: 0.08, attack: 15, motion: "fly", scale: 0.95 },
  { id: "water", name: "碧波水灵", nameVi: "Bích Ba Thủy Linh", image: water, hp: 110, speed: 0.055, attack: 16, motion: "slide", scale: 1 },
];

export const DEFAULT_COLLECTION = "HSK 1–2";

export const SEED_WORDS: Array<[string, string, string]> = [
  ["保护", "bǎohù", "bảo vệ"],
  ["修炼", "xiūliàn", "tu luyện"],
  ["朋友", "péngyou", "bạn bè"],
  ["学习", "xuéxí", "học tập"],
  ["山", "shān", "núi"],
  ["水", "shuǐ", "nước"],
  ["剑", "jiàn", "kiếm"],
  ["老师", "lǎoshī", "thầy giáo"],
  ["喜欢", "xǐhuan", "thích"],
  ["今天", "jīntiān", "hôm nay"],
  ["明天", "míngtiān", "ngày mai"],
  ["吃饭", "chīfàn", "ăn cơm"],
  ["中国", "Zhōngguó", "Trung Quốc"],
  ["汉语", "Hànyǔ", "tiếng Hán"],
  ["天空", "tiānkōng", "bầu trời"],
  ["月亮", "yuèliang", "mặt trăng"],
];

export const RANKS = ["练气", "筑基", "金丹", "元婴", "化神"] as const;
