import PublicVendorDirectory, { type PublicVendor } from "@/components/vendors/PublicVendorDirectory";
import { parseSearchParams } from "@/lib/config/search";
import { findListings } from "@/lib/search/query";

export const dynamic = "force-dynamic";

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseSearchParams(await searchParams);

  let vendors: PublicVendor[];
  try {
    vendors = await findListings(null, query);
  } catch (err) {
    console.error("Failed to fetch public vendors:", err);
    vendors = [];
  }

  return <PublicVendorDirectory vendors={vendors} initialQuery={query} />;
}
