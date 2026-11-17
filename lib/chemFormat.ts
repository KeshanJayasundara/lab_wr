// Shows chemical formulas and units the standard way. Users type plain text, we only change how it is DISPLAYED
// (the stored value is never changed).
//
//   TYPE            SHOWN     WHY
//   NH3             NH₃       a number right after a letter is a subscript (names / formulas)
//   H2SO4           H₂SO₄
//   Ca(OH)2         Ca(OH)₂
//   m3  (in a unit) m³        in UNIT fields a number right after a letter is a superscript
//   mg/m3           mg/m³
//   m^3             m³        ^ forces a superscript anywhere  (also  ^+  ^-  e.g. NH4^+  ->  NH₄⁺ ,  Fe^3+ ,  s^-1)
//   W\2             W2        \ keeps the next number normal size
//   W 2 / W-2       W 2/W-2   a number after a space or dash is always normal ("Tank 01")
const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻",
};

const toSub = (digits: string) => digits.replace(/\d/g, (d) => SUB[Number(d)]);
const toSup = (chars: string) => chars.replace(/[0-9+\-]/g, (c) => SUP[c]);

/**
 * mode "name" (default): parameter / chemical names -> NH3 becomes NH₃
 * mode "unit":           unit fields                -> m3 becomes m³
 */
export function formatChem(text?: string | null, mode: "name" | "unit" = "name"): string {
  if (!text) return "";
  return text.replace(
    /\^([0-9+\-]+)|([A-Za-z)\]])(\\?)(\d+)/g,
    (_m, sup: string | undefined, ch: string | undefined, esc: string | undefined, digits: string | undefined) => {
      if (sup !== undefined) return toSup(sup); // explicit superscript
      if (esc) return ch! + digits!; // escaped -> normal
      return ch! + (mode === "unit" ? toSup(digits!) : toSub(digits!));
    }
  );
}

/** Shorthand for unit fields. */
export const formatUnit = (unit?: string | null) => formatChem(unit, "unit");