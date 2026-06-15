const CHILD = {
  pink: { header: "#ffe3ec", ink: "#b14a6b", soft: "#e7a8bd", bar: "#ffd2e0" },
  blue: { header: "#e6f1fb", ink: "#185fa5", soft: "#9cc2e8", bar: "#cfe3f7" },
};
const FALLBACK = { header: "#fff0cc", ink: "#8a6a10", soft: "#e0c98a", bar: "#ffe6a8" };

export function childTheme(color) {
  return CHILD[color] || FALLBACK;
}
