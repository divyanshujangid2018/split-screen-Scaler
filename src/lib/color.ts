export const REFERENCE_COLOR = "#7f1d1d";

/** Muted, professional neutral tones cycled across comparison user headers. */
const PALETTE = [
  "#334155", // slate
  "#3f3f46", // zinc
  "#44403c", // stone
  "#1e3a5f", // deep blue
  "#3f2f1e", // brown
  "#2d3a2e", // muted green
  "#3a2f4a", // muted violet
  "#4a2f3a", // muted maroon-gray
];

export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}
