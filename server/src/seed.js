import { readCollection, writeCollection } from "./store.js";
import { hashPin } from "./auth.js";

const DEFAULT_PARENT_PIN = "0000";
const DEFAULT_CHILD_PIN = "0000";

export async function seedIfEmpty() {
  const config = await readCollection("config", null);
  if (!config) {
    await writeCollection("config", {
      parentPinHash: hashPin(DEFAULT_PARENT_PIN),
      sessionTtlMinutes: 120,
    });
  }
  const children = await readCollection("children", null);
  if (!children) {
    await writeCollection("children", [
      { id: "haolin", name: "王颢霖", emoji: "👧", color: "pink", pinHash: hashPin(DEFAULT_CHILD_PIN) },
      { id: "zhongxian", name: "王仲贤", emoji: "👦", color: "blue", pinHash: hashPin(DEFAULT_CHILD_PIN) },
    ]);
  }
  if ((await readCollection("tasks", null)) === null) {
    await writeCollection("tasks", [
      { id: "t_homework", name: "完成作业", emoji: "📚", points: 10, dailyLimit: 1, enabled: true },
      { id: "t_read", name: "主动阅读", emoji: "📖", points: 2, dailyLimit: 2, enabled: true },
      { id: "t_clean", name: "打扫卫生", emoji: "🧹", points: 6, dailyLimit: 1, enabled: true },
      { id: "t_help", name: "主动帮助他人", emoji: "💗", points: 3, dailyLimit: 2, enabled: true },
    ]);
  }
  if ((await readCollection("rewards", null)) === null) {
    await writeCollection("rewards", [
      { id: "r_freeday", name: "自己安排一天", emoji: "🌈", category: "spirit", cost: 200, stock: null, enabled: true },
      { id: "r_icecream", name: "冰淇淋", emoji: "🍦", category: "material", cost: 60, stock: null, enabled: true },
      { id: "r_coins", name: "虚拟游戏币×100", emoji: "🎮", category: "material", cost: 50, stock: null, enabled: true },
    ]);
  }
  if ((await readCollection("events", null)) === null) await writeCollection("events", []);
  if ((await readCollection("redemptions", null)) === null) await writeCollection("redemptions", []);
}