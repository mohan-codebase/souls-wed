import VenuesDirectory from "@/components/venues/VenuesDirectory";
import { parseSearchParams } from "@/lib/config/search";

export const dynamic = "force-dynamic";

/**
 * Server shell so the hero search query arrives as a prop.
 *
 * This page used to be a client component reading `useSearchParams`. On a
 * prerendered route that hook suspends, and the Suspense fallback never
 * resolved — `/venues?city=…` rendered a spinner and nothing else.
 */
export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <VenuesDirectory initialQuery={parseSearchParams(await searchParams)} />;
}
