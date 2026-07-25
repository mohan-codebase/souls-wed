/**
 * Hosts allowed through the Next.js image optimizer.
 *
 * Kept in its own module so `next.config.ts` and `CustomImage` stay in sync —
 * a host listed here is optimized, anything else is served as-is.
 */
export const OPTIMIZED_IMAGE_HOSTS: string[] = [
  "images.unsplash.com",
  "img.youtube.com",
  "i.ytimg.com",
  "res.cloudinary.com",
  "soulswed.com",
  "lh3.googleusercontent.com",
];

/**
 * Vendors can paste an image URL from any host in the gallery editor. Hosts we
 * haven't whitelisted would otherwise get a 400 from the optimizer, so we let
 * them through unoptimized instead — the same behaviour the whole site had
 * before, now scoped to just the exception.
 */
export function isOptimizableSrc(src: string): boolean {
  // Local paths (/uploads/…, /soulswed/…) are always safe to optimize.
  if (!/^https?:\/\//i.test(src)) return true;
  try {
    return OPTIMIZED_IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}
