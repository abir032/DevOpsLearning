/* The six parts of every lesson, in their fixed order. */
export const PARTS = [
  ["problem", "The problem"],
  ["idea", "The idea"],
  ["see", "See it"],
  ["doit", "Do it"],
  ["quiz", "Check yourself"],
  ["cheat", "Cheat sheet"],
] as const;
export type PartId = (typeof PARTS)[number][0];
