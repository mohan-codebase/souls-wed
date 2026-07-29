import { notFound } from "next/navigation";
import mongoose from "mongoose";
import PublicVendorDirectory, { PublicVendor } from "@/components/vendors/PublicVendorDirectory";
import PublicVendorDetailPage from "@/components/vendors/PublicVendorDetailPage";
import { connectDB } from "@/lib/mongodb";
import { Vendor } from "@/lib/models/Vendor";
import { categoryBySlug, parseSearchParams } from "@/lib/config/search";
import { findListings, resolveCategorySlug } from "@/lib/search/query";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Every slug in VENDOR_CATEGORIES resolves here. The old hand-written map
// covered 8 of 39, so 33 categories in the hero dropdown 404'd
// (docs/hero-search-analysis.md §2.1) — the list now comes from the same config
// the dropdown renders, so the two cannot drift apart again.
//
// The query itself lives in lib/search/query.ts, shared with /vendors and with
// the hero's live result count.
// ─────────────────────────────────────────────────────────────────────────────

export default async function VendorCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { category: rawSegment } = await params;
  const segment = resolveCategorySlug(rawSegment);
  const query = parseSearchParams(await searchParams);

  const config = categoryBySlug(segment);

  if (config) {
    return (
      <PublicVendorDirectory
        vendors={await findListings(segment, query)}
        activeCategory={config.name}
        categorySlug={config.slug}
        initialQuery={query}
      />
    );
  }

  // Not a category — treat the segment as a vendor id for the detail page.
  if (!mongoose.Types.ObjectId.isValid(segment)) notFound();

  await connectDB();
  const dbVendor = await Vendor.findById(segment).select("-passwordHash").lean();
  if (!dbVendor) notFound();

  const mappedVendor: PublicVendor = {
    ...dbVendor,
    _id: dbVendor._id.toString(),
  } as unknown as PublicVendor;

  return <PublicVendorDetailPage vendor={mappedVendor} />;
}
