// Shared by the page (live preview) and the API routes (final save),
// so the code you see in the form is exactly what gets stored.
//
// How the code is built
//   1. LETTERS  -> shortest letters-only code from the name (initials of the words + consonants)
//   2. NUMBERS  -> any number written in the name is added at the end ("01" -> 1, "02" -> 2)
//
//   "Aeration Tank 01 (A/O)" -> ATA1
//   "Aeration Tank 02 (A/O)" -> ATA2     (same letters, only the number changes)
//   "Aeration Tank 01 (MBR)" -> ATM1
//   "Daily Testing"          -> DT
//   "Daily Test"             -> DTS      (DT is taken, so one more letter is used)
//
// Extra letters are only added when two DIFFERENT names would get the same code.

const skeleton = (word: string) => word[0] + word.slice(1).replace(/[AEIOU]/g, "");

export function generateUniqueCode(name: string, takenCodes: Set<string> | string[] = []): string {
  const taken = new Set(Array.from(takenCodes).map((c) => c.toUpperCase()));
  const upper = (name || "").toUpperCase();

  // numbers written in the name: "01" -> "1", "10" -> "10"
  const numbers = (upper.match(/\d+/g) || []).map((n) => String(parseInt(n, 10))).join("");

  const words = upper
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Z]/g, ""))
    .filter(Boolean);

  if (words.length === 0 && !numbers) return "";

  // ----- letter part: candidates from shortest to longest -----
  const candidates: string[] = [];
  const add = (c: string) => {
    if (c && !candidates.includes(c)) candidates.push(c);
  };

  if (words.length === 0) {
    add("N"); // name has only numbers, e.g. "01"
  } else {
    if (words.length > 1) {
      // initials of all words but the last + growing consonant skeleton of the last word
      const head = words.slice(0, -1).map((w) => w[0]).join("");
      const last = skeleton(words[words.length - 1]);
      for (let n = 1; n <= last.length; n++) add(head + last.slice(0, n));
    } else {
      const sk = skeleton(words[0]);
      for (let n = Math.min(2, sk.length); n <= sk.length; n++) add(sk.slice(0, n));
    }

    // Skeleton exhausted? grow using the full letters (vowels included)
    const letters = words.join("");
    for (let n = Math.min(2, letters.length); n <= letters.length; n++) add(letters.slice(0, n));
  }

  // ----- first candidate whose "letters + number" is free -----
  for (const c of candidates) {
    const code = c + numbers;
    if (!taken.has(code)) return code;
  }

  // ----- very rare: every candidate is taken (e.g. "Tank 1" vs "Tank-1") -----
  const base = candidates[0] + numbers;
  for (const ch of "BCDEFGHIJKLMNOPQRSTUVWXYZ") {
    if (!taken.has(base + ch)) return base + ch;
  }
  let i = 2;
  while (taken.has(`${base}${i}`)) i++;
  return `${base}${i}`;
}