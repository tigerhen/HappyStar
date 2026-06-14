import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// server/src -> project root -> data
export const DATA_DIR = process.env.HAPPY_STAR_DATA || join(here, "..", "..", "data");

export const FILES = {
  config: "config.json",
  children: "children.json",
  tasks: "tasks.json",
  rewards: "rewards.json",
  events: "events.json",
  redemptions: "redemptions.json",
};

export function filePath(name) {
  return join(DATA_DIR, FILES[name]);
}
