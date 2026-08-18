export const GAME_WORDS = [
  "react", "typescript", "developer", "frontend", "backend",
  "javascript", "algorithm", "keyboard", "computer", "internet",
  "battle", "coding", "victory", "performance", "database",
  "interface", "component", "variable", "function", "promise",
  "async", "await", "syntax", "compiler", "debugging",
  "framework", "library", "repository", "commit", "merge",
  "branch", "terminal", "console", "object", "array",
  "string", "boolean", "number", "undefined", "null",
  "responsive", "animation", "motion", "framer", "tailwind",
  "style", "design", "system", "architecture", "server",
  "client", "network", "protocol", "security", "encryption",
  "password", "authentication", "authorization", "token", "session",
  "cookie", "cache", "memory", "storage", "processor",
  "graphics", "display", "resolution", "pixel", "vector",
  "canvas", "context", "rendering", "paint", "layout",
  "flexbox", "grid", "margin", "padding", "border",
  "shadow", "radius", "opacity", "transition", "transform",
  "scale", "rotate", "translate", "skew", "matrix"
];

export function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
