/**
 * Escape regex metacharacters so a user-supplied string is matched literally
 * inside a MongoDB `$regex` query.
 *
 * Kept in its own import-free module so it can be unit-tested directly: the
 * rest of lib/search/filters.ts imports the Booking model, and once a module
 * pulls in `@/lib/...` the test runner's type-stripping can't resolve the path
 * alias. Same split as lib/rate-limit-config.ts.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
