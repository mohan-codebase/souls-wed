import { NextResponse } from "next/server";
import { categoryBySlug, parseSearchParams } from "@/lib/config/search";
import { countListings, resolveCategorySlug } from "@/lib/search/query";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/search/count?category=&city=&guests=&start=&end=&budget=&q=
//
// How many listings the current hero selection would return. Runs the same
// `findListings` the results page runs, so the number on the Search button is
// the number of cards the user will actually land on.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawCategory = searchParams.get("category");
  const slug = rawCategory ? resolveCategorySlug(rawCategory) : null;

  // An unknown slug would silently fall through to a services query for a
  // category that doesn't exist; say so instead of returning a bogus zero.
  if (slug && !categoryBySlug(slug)) {
    return NextResponse.json({ success: false, error: "unknown_category" }, { status: 400 });
  }

  try {
    const count = await countListings(slug, parseSearchParams(searchParams));
    return NextResponse.json({ success: true, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Search count failed:", message);
    // The hero must stay usable without the count — it is an enhancement.
    return NextResponse.json({ success: false, count: null }, { status: 200 });
  }
}
