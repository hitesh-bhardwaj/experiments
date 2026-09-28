/**
 * Glyph ramps for CubeBackgroundAscii.
 *
 * Each set is sorted lightest → heaviest ink at startup and brightness indexes
 * the result, so the entries here are unordered - only membership matters.
 *
 * A " " entry is a real ramp slot that draws nothing: it has no ink, so it
 * sorts to index 0 and the atlas-alpha test drops the cell to background. More
 * spaces = sparser output, so each set keeps roughly a fifth of its slots blank
 * and switching sets does not change how dense the frame reads.
 *
 * Lives in its own module because both the effect (which compiles the set into
 * the shader) and the leva panel (which lists the names) need it, and the panel
 * must stay a leaf that index.jsx can dynamically import without a cycle.
 */
export const CHAR_SETS = {
  hyperiux: [" ", " ","@", "H", "P", "E", "R", "I", "U", "X"],
  binary: [" ", "0", "1","0", "1"],
  numbers: [" ", " ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  symbols: [" ", " ", "#", "$", "&", "*", "@", "!"],
  currency: ["$"," ", " "," ", " "," ", " "," ", " "],
};

export const CHAR_SET_NAMES = Object.keys(CHAR_SETS);

export const DEFAULT_CHAR_SET = "hyperiux";

export function resolveCharSet(name) {
  return CHAR_SETS[name] ?? CHAR_SETS[DEFAULT_CHAR_SET];
}
