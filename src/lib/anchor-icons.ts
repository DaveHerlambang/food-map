// No imports: unit-tested with `node --test`.

/** Icons a saved starting point can have, in picker order. */
export const ANCHOR_ICONS = ["home", "work", "campus", "gym", "family", "cafe", "star", "pin"] as const
export type AnchorIcon = (typeof ANCHOR_ICONS)[number]

export const ANCHOR_ICON_LABELS: Record<AnchorIcon, string> = {
  home: "Home",
  work: "Work",
  campus: "Campus",
  gym: "Gym",
  family: "Family",
  cafe: "Café",
  star: "Favorite",
  pin: "Other",
}

export function isAnchorIcon(value: unknown): value is AnchorIcon {
  return typeof value === "string" && (ANCHOR_ICONS as readonly string[]).includes(value)
}

/** Unknown or missing icons show as the plain pin. */
export function anchorIconOf(value: unknown): AnchorIcon {
  return isAnchorIcon(value) ? value : "pin"
}

// English and Indonesian words people put in a place's name.
const GUESSES: [AnchorIcon, RegExp][] = [
  ["work", /\b(office|kantor|work|kerja|coworking)\b/],
  ["home", /\b(home|house|rumah|kos|kost|apartemen|apartment)\b/],
  ["campus", /\b(campus|kampus|school|sekolah|univ\w*|kuliah)\b/],
  ["gym", /\b(gym|fitness)\b/],
  ["family", /\b(mom|mum|dad|parents?|mama|papa|ibu|bapak|ortu|family|keluarga|nenek|kakek|oma|opa)\b/],
  ["cafe", /\b(cafe|café|coffee|kopi)\b/],
]

/** A sensible icon from the name ("Her office" → work), or null if nothing fits. */
export function guessAnchorIcon(name: string): AnchorIcon | null {
  const text = name.toLowerCase()
  return GUESSES.find(([, re]) => re.test(text))?.[0] ?? null
}
