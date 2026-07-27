import type { Venue } from "./venues-data";

export interface VenueFaq {
  question: string;
  answer: string;
}

/** The real advance percentage — kept in sync with app/api/bookings/route.ts. */
const ADVANCE_PERCENTAGE = 30;

/**
 * A vendor almost never fills in the FAQ list, so the section was hiding
 * itself on every live venue. These fill the gap with questions couples
 * actually ask, answered from fields the venue *did* fill in — never a
 * specific claim (cancellation terms, exact policies) we don't hold data for.
 */
function derivedFaqs(venue: Venue): VenueFaq[] {
  const faqs: VenueFaq[] = [];

  faqs.push({
    question: "How do I confirm my booking at " + venue.name + "?",
    answer: `A ${ADVANCE_PERCENTAGE}% advance secures your date, paid securely through SoulsWed via Stripe. The remaining balance is settled directly with the venue.`,
  });

  if (Number(venue.maxGuests) > 0) {
    faqs.push({
      question: "What is the guest capacity?",
      answer: `${venue.name} hosts between ${Number(venue.minGuests) || 0} and ${venue.maxGuests} guests. Share your expected headcount when you enquire so the venue can confirm the right space.`,
    });
  }

  if (venue.catering) {
    faqs.push({
      question: "Does the venue provide catering?",
      answer:
        venue.pricePerPlateVeg || venue.pricePerPlateNonVeg
          ? "Yes, catering is in-house. See the Pricing section above for the per-plate veg and non-veg rates."
          : "Yes, catering is in-house. Contact the venue for a per-plate quote.",
    });
  } else {
    faqs.push({
      question: "Does the venue provide catering?",
      answer: "In-house catering isn't listed for this venue — ask them which outside caterers they work with.",
    });
  }

  if (venue.indoor || venue.outdoor) {
    const spaces = venue.indoor && venue.outdoor
      ? "both an indoor banquet space and an outdoor lawn/garden"
      : venue.outdoor
        ? "an outdoor lawn/garden space"
        : "an indoor banquet space";
    faqs.push({
      question: "Does the venue have indoor and outdoor spaces?",
      answer: `${venue.name} offers ${spaces}. See Areas Available above for capacity details on each.`,
    });
  }

  faqs.push({
    question: "Is parking available for guests?",
    answer: venue.parking
      ? "Yes, on-site parking is available for your guests."
      : "On-site parking isn't listed for this venue — check with them directly about parking arrangements nearby.",
  });

  if (Number(venue.rooms) > 0) {
    faqs.push({
      question: "Are guest rooms available on site?",
      answer: `Yes, ${venue.rooms} guest rooms are available on the property for out-of-town guests.`,
    });
  }

  faqs.push({
    question: "How do I contact the venue directly?",
    answer: venue.contactPhone
      ? `You can call the venue directly at ${venue.contactPhone}, or use the contact button at the top of this page.`
      : "Use the contact button at the top of this page, or send an enquiry through the booking form and the venue will reach out.",
  });

  return faqs;
}

/**
 * Vendor-authored FAQs (if any) lead, since they're specific to the venue.
 * Derived FAQs fill in behind them, skipping any question that's already
 * covered so the list doesn't repeat itself.
 */
export function mergeFaqs(venue: Venue): VenueFaq[] {
  const authored = (venue.faqs ?? []).filter((f) => f.question?.trim() && f.answer?.trim());
  const askedAlready = new Set(authored.map((f) => f.question.trim().toLowerCase()));

  const fallback = derivedFaqs(venue).filter(
    (f) => !askedAlready.has(f.question.trim().toLowerCase())
  );

  return [...authored, ...fallback];
}
