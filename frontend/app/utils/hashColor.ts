const AVATAR_COLORS = [
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-green-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-pink-500",
] as const;

/**
 * Returns a deterministic Tailwind background color class for a given username.
 * Uses the djb2 hash algorithm to distribute usernames across 8 colors.
 */
export function hashColor(username: string): string {
  let hash = 5381;
  for (let i = 0; i < username.length; i++) {
    hash = (hash * 33) ^ username.charCodeAt(i);
  }
  // Ensure positive index
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}
