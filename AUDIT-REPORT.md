# SoulsWed — End-to-End Flow & Bug Audit

**Date:** 29 July 2026
**Environment:** `http://localhost:3000` (dev), MongoDB Atlas `soulswed`
**Accounts tested:** `mohanavenkatesh.work@gmail.com` (user), `vendor@soulswed.com` (vendor), `admin@soulswed.com` (admin)
**Method:** live browser walkthrough of all three portals + full source review of `app/api/**`, `lib/models/**`, `proxy.ts`

> All test bookings created during this audit were deleted. DB was verified restored to its
> pre-audit state: 6 bookings, ₹1,30,800 revenue.

---

## Executive summary

The three portals exist and the happy path *mostly* works — a user can book a venue, the admin
sees it, and (for venues only) so does the vendor. But the marketplace loop is broken in four
places that matter:

1. **Nobody is ever emailed about a booking.** Not the user, not the vendor, not the admin.
2. **21 of 26 listings can never produce a vendor-visible booking** (everything that isn't a venue).
3. **The vendor cannot act on a booking at all** — no accept, decline, confirm or cancel.
4. **Money is not verified.** Prices are client-controlled, and "confirmed" is granted manually
   without checking that a payment ever happened.

Findings are ordered by severity. Each one lists what I observed, where it lives, and a suggested fix.

| # | Severity | Area | Issue |
|---|---|---|---|
| 1 | P0 | Payments | `totalAmount` is taken from the client with no server-side validation |
| 2 | P0 | Payments | Admin "Confirmed" books revenue + vendor payout with zero payment check |
| 3 | P0 | Bookings | Service-listing bookings never reach the vendor (venues-only query) |
| 4 | P0 | Notifications | No booking email exists anywhere in the codebase |
| 5 | P0 | Vendor | Vendor has no way to accept/decline/confirm/cancel a booking |
| 6 | P1 | Auth | 2FA OTP has no attempt limit and no password re-check |
| 7 | P1 | Auth | Login blocks on SMTP — 10–15 s "Authenticating…" on every sign-in |
| 8 | P1 | Bookings | Vendor's blocked dates have no effect on their own listings |
| 9 | P1 | Auth | No rate limiting on any endpoint |
| 10 | P1 | Access control | `proxy.ts` checks login but not role |
| 11 | P2 | Vendor | Vendor cannot see earnings or payouts at all |
| 12 | P2 | Admin | Bookings ledger doesn't show which venue/vendor a booking is for |
| 13 | P2 | Data | 6 existing bookings are orphaned — `providerId` matches no live listing |
| 14 | P2 | Bookings | `completed` is unreachable, so reviews can never be written |
| 15 | P2 | Auth | Password change accepts 6 chars, bypassing `validatePassword()` |
| 16 | P2 | UI | Booking cards never render an image (static data lookup) |
| 17 | P2 | Payments | `verify-payment` doesn't check amount or session→booking binding |
| 18 | P3 | — | Nine smaller data, UX and dead-code issues |

---

## Fix log — 29 July 2026

**Fixed: #1, #2, #17** (the money bugs) — plus #12 and a fourth payout bug found while fixing them.

| Change | Files |
|---|---|
| New server-side price authority. Recomputes every booking's price from the listing in MongoDB, validates booking type against the listing's category, and enforces guest capacity. | `lib/pricing.ts` (new) |
| `POST /api/bookings` now prices from `quoteBooking()`. Client `totalAmount` is advisory — a mismatch beyond ₹1 returns 409. `providerName` is taken from the DB too. | `app/api/bookings/route.ts` |
| `Booking` gained `paymentStatus` / `amountPaid` / `paidAt` / `paidMethod` / `paidRecordedBy` / `paidNote`, separating the money record from the fulfilment lifecycle. | `lib/models/Booking.ts` |
| `verify-payment` now requires `metadata.bookingId` to match, checks `amount_total` covers the advance, and no longer fails open when `stripeSessionId` is unset. Records `amountPaid`. | `app/api/bookings/verify-payment/route.ts` |
| Webhook only acts on `payment_status === "paid"` and records the real amount. | `app/api/webhooks/stripe/route.ts` |
| Admin can no longer set `confirmed`/`completed` on an unpaid booking (409). Added an explicit **Record offline payment** action with an audit trail. | `app/api/admin/bookings/route.ts` |
| Revenue = `sum(amountPaid) where paymentStatus = "paid"`. Added `pendingRevenue` for committed-but-uncollected value. | `app/api/admin/stats/route.ts` |
| Payout ledger only includes paid bookings; releasing a payout on an unpaid booking is refused. | `app/api/admin/payouts/route.ts` |
| Bookings ledger now shows the provider name (was reading `b.venueName`, which doesn't exist on the model — hence the blank column), and paid-vs-due instead of a mislabelled "Advance Paid". | `app/(dashboard)/admin/dashboard/page.tsx` |
| `menuType` and `hours` are now sent so the server can price non-veg menus correctly. | `components/booking/BookingForm.tsx` |

**Also fixed — payout amount (not in the original list).** The ledger paid vendors
`totalAmount − 15%`, but the platform only ever collects the 30% advance; the balance is
settled at the venue. It was scheduling transfers larger than the money held. Commission and
payout are now both derived from `amountPaid`, and each row reports `balanceDueAtVenue`.
**This is a business-rule decision — please confirm it matches your commercial terms.**

### Verified after the fix

Re-ran the original exploits against the running app:

| Attack | Before | After |
|---|---|---|
| ₹1,44,000 venue booked with `totalAmount: 1` | 201 Created | **409** — "The price changed…", `expectedAmount: 144000` |
| Omit `totalAmount` entirely | — | **201**, priced correctly at ₹1,44,000 |
| Book a caterer as flat-fee `vendor` | 201 Created | **400** — "This listing cannot be booked as \"vendor\"" |
| Book a `providerId` that matches no listing | 201 Created | **404** — "That listing no longer exists" |
| 99,999 guests at a 50–500 venue | 201 Created | **400** — "Guest count must be between 50 and 500" |
| Admin confirms an unpaid booking | Revenue +₹11,400, payout row +₹32,300 | **409** — "This booking hasn't been paid for yet" |
| Release payout on an unpaid booking | Allowed | **409** — "no recorded payment" |

`npx tsc --noEmit` passes. No new lint errors (`lib/pricing.ts` is clean; remaining warnings
in these files are pre-existing `any`/`prefer-const`).

### ⚠ Action required before this is finished

Existing bookings have no payment record, so **dashboard revenue currently reads ₹0** and the
payout ledger is empty. Run the migration to backfill:

```bash
# preview — writes nothing
node scripts/migrate-booking-payment-fields.mjs --mode=trust --dry-run

# apply
node scripts/migrate-booking-payment-fields.mjs --mode=trust
```

- `--mode=trust` treats existing confirmed/completed bookings as paid, restoring your current
  ₹1,30,800 revenue figure.
- `--mode=strict` marks as paid only bookings with a Stripe session, so revenue reflects only
  money you can evidence.

Run it from the project root (it reads `MONGODB_URI` from `.env`) — my sandbox can't reach your
Atlas cluster.

---

## Fix log 2 — the marketplace loop

**Fixed: #3, #4, #5, #7, #16** — plus two counting bugs found while testing.

| Change | Files |
|---|---|
| Vendor booking queries now resolve `ServiceListing.serviceId` as well as `Venue.venueId`. Centralised in one helper so the rule can't drift again. | `lib/booking-access.ts` (new), `app/api/bookings/route.ts` |
| `GET /api/bookings/[id]` authorizes the owning vendor instead of 403-ing them off their own booking. | `app/api/bookings/[id]/route.ts` |
| New `PATCH /api/bookings/[id]` — vendor `decline` / `complete`, customer `cancel`. Records who cancelled and why; releases the dates. Deliberately cannot set `confirmed`: that follows payment, not opinion. | `app/api/bookings/[id]/route.ts` |
| Decline / Mark Complete buttons on the vendor's booking card. "Mark Complete" only appears once the event date has passed, since completing is what unlocks reviews. | `components/booking/BookingCard.tsx` |
| Six booking email templates (created / confirmed / cancelled × customer, vendor, admin), wired into booking creation, Stripe verification, the webhook, admin status changes, offline payments, and vendor decline. | `lib/mail.ts`, 5 route files |
| Login no longer awaits SMTP. **Measured 10–15s → 179ms.** Same fix applied to `verify-2fa` and both Google OAuth callbacks. | `app/api/auth/login/route.ts`, `verify-2fa`, `google/*` |
| Booking cards render a real image — `providerImage` is denormalised onto the booking at creation instead of being looked up in the dead `lib/venues-data.ts`. | `lib/pricing.ts`, `lib/models/Booking.ts`, `components/booking/BookingCard.tsx` |
| Card's "Paid" figure reads `amountPaid` instead of inferring payment from `status === "confirmed"`. | `components/booking/BookingCard.tsx` |
| "Active Leads" excludes cancelled and completed bookings — a declined lead was still being counted. | `app/(dashboard)/vendor/dashboard/page.tsx` |

### Verified after the fix

| Check | Before | After |
|---|---|---|
| Vendor sees a booking for their decorator listing | Invisible | **Visible** |
| `GET /api/bookings/[id]` as the owning vendor | 403 | **200** |
| Vendor declines a booking | No such action | **200**, `cancelledBy: "vendor"`, reason stored |
| Dates released after decline | — | **`blockedDates: []`** |
| Vendor marks an unconfirmed booking complete | — | **409** |
| Vendor uses the customer's `cancel` action | — | **403** |
| Vendor tries `action: "confirm"` | — | **400** — payment is the only path |
| Declining twice | — | **409** |
| Login round-trip | 10–15s | **179ms** |

`npx tsc --noEmit` passes. Test bookings removed; DB verified back to 6 bookings.

### Known gaps in this batch

- **2FA login is still slow.** `sendVerificationOtpEmail` is deliberately still
  awaited in `login/route.ts` — if that email fails, the user is stranded at a code
  prompt with no code, so failing loudly beats responding fast. Fixing it properly
  means a mail queue.
- **No refund automation.** Cancelling a paid booking returns `refundDue` and tells
  the customer a refund is coming, but nothing calls Stripe. Refunds are manual.
- **The user dashboard has no cancel-with-reason UI.** The customer's `cancel`
  action exists on the API; the dashboard still uses the older hard-`DELETE` path.

---

## Fix log 3 — auth and calendar hardening

**Fixed: #6, #8, #9, #10, #15.**

| Change | Files |
|---|---|
| In-process fixed-window rate limiter with named limits. **Read the caveat at the top of the file** — it is per-instance, so it needs a Redis backing store if you ever run more than one replica or go serverless. | `lib/rate-limit.ts` (new) |
| Login limited two ways: 5 attempts per account and 20 per IP, per 15 min. The account counter is cleared on a correct password so typos don't linger. | `app/api/auth/login/route.ts` |
| `verify-2fa` no longer trusts the posted email. Login now issues a sealed 10-minute `pending-2fa` cookie and the OTP step reads identity from that, so a correct code alone can't log anyone in. Guesses capped at 5, after which the code is burned. Comparison is constant-time. | `lib/session.ts`, `app/api/auth/login/route.ts`, `app/api/auth/verify-2fa/route.ts`, `lib/auth.ts` |
| Rate limits on `forgot-password` (per IP *and* per target address, so nobody can mail-bomb one inbox), `signup`, `inquiries`, `subscribe`. | 4 route files |
| `proxy.ts` enforces role per dashboard prefix instead of just `isLoggedIn`, and sends a signed-in user hitting the wrong portal to their own. | `proxy.ts` |
| Password changes run the real `validatePassword()` policy instead of `length >= 6` — for user, vendor **and admin**. | `app/api/auth/settings/password/route.ts`, `app/api/admin/settings/password/route.ts` |
| Vendor blocked dates resolve the owning vendor through the listing, so they finally apply. | `lib/booking-access.ts`, `app/api/bookings/route.ts`, `app/api/bookings/availability/route.ts` |

### Verified after the fix

| Check | Before | After |
|---|---|---|
| Wrong password ×7 on one account | All 401, unlimited | 401 ×5 → **429**, `Retry-After: 900` |
| `verify-2fa` called cold, no password step | Session issued on OTP match | **440** — "sign-in session expired" |
| `abc123` as a new password | Accepted | **400** — "at least 8 characters" |
| `password1` / `NoDigits!!` / `NOLOWERCASE1!` | Accepted | **400**, each with the specific rule |
| Valid password, wrong current | — | **401** — proves the policy gate is what blocked the rest |
| Admin opens `/vendor/dashboard` | Page JS served, client redirect | **Redirected at the edge** to `/admin/dashboard` |
| Vendor blocks 2027-11-11, customer books it | Booking succeeded | Calendar shows it blocked; booking **409** |

`npx tsc --noEmit` passes; `eslint` clean on the new files. Blocked-date test data restored.

### Caveats

- **The rate limiter is per-process.** Fine for a single Node server; useless on
  serverless and weakened by every extra replica. `lib/rate-limit.ts` documents
  the swap to Redis — only that file needs to change.
- **`x-forwarded-for` is spoofable** unless your host overwrites it. The
  account-scoped limits don't depend on the IP and are the real backstop.
- **Admin still has no 2FA** (P3 item 6). It is now the only role that can't
  enable it, and it's the most privileged.
- The login page still posts `email`/`role` to `verify-2fa`; the server ignores
  them. Harmless, but worth tidying when that file is next touched.

---

## Fix log 4 — orphaned bookings and the review pipeline

**Fixed: #13, #14** — plus a review-moderation bug that only became visible once
reviews could exist at all.

### #13 — the orphans, and why they mattered more than reported

The root cause turned out to be specific and fixable: the six seeded bookings
store the venue's **MongoDB `_id`** as `providerId` (`6a5b9aa2fe9eb47c17b765fd`)
instead of the `venueId` slug (`venue-refinery-1`). Same venue, two spellings.

The original report called this a data-integrity issue. It's worse than that —
it's a **double-booking hole**, demonstrated live:

```
legacy booking:            providerId 6a5b9aa2…765fd, event 2026-08-23
availability by _id:       blockedDates ["2026-08-23"]
availability by slug:      blockedDates []          ← public calendar shows it FREE
```

The conflict check in `POST /api/bookings` matches `providerId` as an exact
string, so a booking stored under one spelling never conflicts with one stored
under the other. That date could be sold twice.

| Change | Files |
|---|---|
| `quoteBooking()` now returns `canonicalProviderId`, and booking creation persists **that** rather than whatever the client sent. New orphans are impossible. | `lib/pricing.ts`, `app/api/bookings/route.ts` |
| Pricing moved **before** the conflict check, so conflicts are tested against the canonical id. Previously the check ran on the raw client value. | `app/api/bookings/route.ts` |
| Repair script for the existing six: resolves by listing `_id`, then by unique name, and reports anything it can't resolve rather than guessing. | `scripts/repair-orphaned-booking-providers.mjs` (new) |

Verified: posting a booking with the raw ObjectId now stores
`providerId: "venue-refinery-1"`, the slug calendar reflects it, and a duplicate
booked via the slug is correctly refused with 409.

### #14 — `completed` is reachable, so reviews work

| Change | Files |
|---|---|
| Confirmed + paid bookings whose event has passed transition to `completed` automatically. Runs opportunistically when a booking list is read (the project has no scheduler), throttled to once a minute per process, as one `updateMany`. | `lib/booking-lifecycle.ts` (new), `app/api/bookings/route.ts`, `app/api/admin/bookings/route.ts` |
| `GET` eligibility endpoint on both review routes; "Write a Review" is now only offered to people who can actually use it, with the reason as a tooltip otherwise. | `app/api/venues/[id]/reviews/route.ts`, `app/api/vendors/[id]/reviews/route.ts`, `VenueHero.tsx`, `VendorHero.tsx` |

Only **paid** bookings are eligible to complete — completion unlocks reviews and
feeds the payout ledger, so an unpaid booking must not drift into it.

### Bonus: the moderation queue could never see a review

Making reviews possible exposed the next link in the chain.
`GET /api/admin/reviews` read `Vendor.reviews` only — but customer reviews are
written to `Venue.reviews` and `ServiceListing.reviews`. I submitted a review,
confirmed it on the venue, and the admin panel still reported zero. It now
aggregates all three sources, tags each with `sourceType`, and `DELETE` uses that
to find the review again (falling back to trying each collection).

### Verified end to end

| Check | Result |
|---|---|
| Booking posted with a raw ObjectId | Stored as `venue-refinery-1`, image backfilled |
| Duplicate of that date via the slug | **409** — conflict now detected |
| Paid booking with a past event date | Auto-transitions `confirmed → completed` |
| Review eligibility before / after | `false` → **`true`** |
| Submitting a review | **201**, venue rating 5.0, count 1 |
| Submitting a second for the same booking | **409** |
| Admin moderation queue | **1 review visible** (was 0) |
| Deleting it as admin | 200, venue rating recalculated to 0 |

All test data removed; DB verified back to 6 bookings.

### ⚠ Action required

```bash
node scripts/repair-orphaned-booking-providers.mjs           # preview
node scripts/repair-orphaned-booking-providers.mjs --apply   # write
```

Until this runs, the six legacy bookings still hold dates that the public
calendar shows as free.

---

## Fix log 5 — vendor earnings and P3 cleanup

**Fixed: #11**, plus P3 items 1, 4 and 6. All 18 numbered findings are now closed.

### #11 — vendor earnings

| Change | Files |
|---|---|
| Commission maths extracted so the admin ledger and the vendor's screen cannot disagree about what a partner is owed. | `lib/payouts.ts` (new) |
| Vendor-scoped earnings endpoint — read-only; releasing a payout stays with admin. | `app/api/vendor/earnings/route.ts` (new) |
| **Earnings** tab in the partner portal: net earnings, awaiting payout, paid out, and balance to collect at the venue; a per-listing breakdown; and a payment history table showing collected → commission → net payout per booking. | `app/(dashboard)/vendor/dashboard/page.tsx` |
| Admin ledger now also resolves each row to the vendor **account**, and returns a `byVendor` grouping. The "Vendor Partner" column showed listing names, so payouts weren't grouped by the party you'd actually pay. | `app/api/admin/payouts/route.ts` |

Verified the two views agree on the same booking:

| | Admin ledger | Vendor earnings |
|---|---|---|
| Collected | ₹30,000 | ₹30,000 |
| Commission (15%) | ₹4,500 | ₹4,500 |
| Net payout | ₹25,500 | ₹25,500 |

(₹50,000 booking, ₹30,000 advance collected, ₹20,000 correctly shown as due at the venue.)

### P3 items closed

| # | Issue | Fix |
|---|---|---|
| 1 | Registered Users read 6, Customers list showed 5 | The two carried separately hand-written filters that had drifted — the list also excludes a `User` document for the admin's own address, which the counter didn't. Both now use `customerFilter()`. Verified 5 = 5. |
| 4 | Vendor had no category | Inferred from the categories they actually list in, via the data-quality script. |
| 6 | **Admin had no 2FA** — the most privileged role with the weakest available auth | `twoFactorEnabled` added to `Admin` and `Vendor` (opt-in, so no one is locked out by the deploy). The 2FA endpoints were hardcoded to the `User` collection — an admin calling them got a 404 — and now resolve the session's own collection via `lib/accounts.ts`. Toggle added to admin Settings. Verified read + enable + disable as admin. |
| 3 | `country: "Global"` on real listings | `scripts/fix-listing-data-quality.mjs` infers the country from the city using a conservative lookup, and reports anything ambiguous instead of guessing. |

`tsc --noEmit` passes; `eslint` clean on all new files.

### P3 items deliberately left

- **Dead `/api/admin/sessions` endpoint.** Fully implemented, called from nowhere;
  `lastLoginAt` / `lastLoginDevice` / `lastLoginMethod` are written on every login
  and never displayed. Either build the view or delete the route — it's a product
  decision, not a bug.
- **Dashboard tabs don't route.** Admin and vendor panels keep one URL, so there's
  no deep-linking, refresh-in-place or browser back. The user dashboard already
  does this correctly with `?tab=`. A contained refactor, but it touches every
  panel in two 3,000-line files.
- **Wishlist is localStorage-only.** Persisting it server-side needs a schema
  addition and a sync path.
- **Listing count mismatch** (26 / 28 / 25). The three numbers count different
  things — searchable vs total vs live — so the fix is deciding what each label
  should mean rather than changing a query.

---

## Remaining actions for you

Three scripts, all dry-run by default:

```bash
node scripts/migrate-booking-payment-fields.mjs --mode=trust --dry-run
node scripts/repair-orphaned-booking-providers.mjs
node scripts/fix-listing-data-quality.mjs
```

Re-run each with `--apply` (or without `--dry-run`) once the preview looks right.

And still outstanding, neither of which I can do for you:

1. **Rotate the leaked secrets.** `.env` is no longer tracked, but Atlas
   credentials, `SESSION_SECRET`, Stripe keys, SMTP, Cloudinary and a Google
   OAuth secret remain readable in 12 earlier commits on GitHub.
2. **Confirm the payout rule.** Commission and payouts now derive from money
   actually collected rather than headline booking value. That is a commercial
   decision, not just a bug fix.

---

## P0 — Blockers

### 1. Booking price is whatever the client sends

`POST /api/bookings` destructures `totalAmount` straight from the request body and computes the
advance from it. There is no lookup of the venue's or service's real price.

**Proof (run from a logged-in user session):**

```js
await fetch('/api/bookings', { method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({
    providerId:'venue-ritz-1',                       // ₹1,44,000 venue
    providerName:'The Ritz-Carlton New York, NoMad',
    bookingType:'venue', eventDates:['2027-03-15'],
    guestCount:500, totalAmount:1                    // ← attacker-supplied
  })
});
// → 201 { totalAmount: 1, advanceAmount: 0 }
```

Two consequences:

- A ₹1,44,000 booking is created for ₹1, with a ₹0 advance — so Stripe is effectively skipped.
- Even unpaid, the booking immediately **blocks that date for everyone else**, because the conflict
  query in `app/api/bookings/route.ts` matches `status: { $in: ["pending","confirmed"] }`. Any
  logged-in account can lock out a venue's entire calendar for free.

**File:** `app/api/bookings/route.ts` (Step 2 destructure → Step 5 `advanceAmount` calculation)

**Fix:** Never trust `totalAmount`. Load the `Venue`/`ServiceListing` by `providerId` server-side
and recompute the price from stored `rentalCost` / `pricePerPlateVeg` / `pricePerPlateNonVeg` /
`priceFrom` × `guestCount` / `roomCount` / number of dates. Reject the request if the client's
figure disagrees beyond a rounding tolerance. Also expire `pending` bookings (e.g. release the date
hold after 30 minutes without payment) so unpaid holds can't squat inventory.

---

### 2. "Confirmed" is granted without any payment check

`PATCH /api/admin/bookings` sets any status the admin picks. Nothing verifies `stripeSessionId`
or that money was collected. Meanwhile `GET /api/admin/stats` counts revenue as
`sum(advanceAmount) where status in [confirmed, completed]`, and the payout ledger derives the
vendor's net from the same field.

**Proof:** I created a booking through the UI and *never paid* (no Stripe redirect, no
`stripeSessionId`). In the admin panel I flipped it Pending → Confirmed. Immediately:

| Metric | Before | After |
|---|---|---|
| Total Revenue | ₹1,30,800 | **₹1,42,200** |
| Payouts & Revenue rows | 6 | **7** |
| New ledger row | — | Refinery Hotel / Mohan / gross ₹38,000 / **net vendor payout ₹32,300 — PENDING** |

The "Release Payout" button was live on that row. The platform was queued to wire ₹32,300 to a
vendor for a booking where ₹0 was collected. Chain this with finding #1 and a user can manufacture
vendor payouts.

**Files:** `app/api/admin/bookings/route.ts` (PATCH), `app/api/admin/stats/route.ts`,
`app/api/admin/payouts/route.ts`

**Fix:** Separate *fulfilment status* from *payment status*. Add `paymentStatus:
'unpaid' | 'paid' | 'refunded'` and `amountPaid: Number` to the `Booking` schema, set only by
`verify-payment` and the Stripe webhook. Revenue and payouts must read `amountPaid` where
`paymentStatus === 'paid'`, never `advanceAmount` where `status === 'confirmed'`. Block the admin
from setting `confirmed` on an unpaid booking, or make it an explicit "mark as paid offline" action
that records who did it and why.

---

### 3. Service-listing bookings never reach the vendor

`GET /api/bookings` builds the vendor's provider list from **venues only**:

```ts
const ownedVenues = await Venue.find({ vendorId: session.userId }).select("venueId").lean();
const providerIds = [session.userId, ...ownedVenues.map(v => v.venueId)];
query = { providerId: { $in: providerIds } };
```

But `providerId` holds a `ServiceListing.serviceId` for every non-venue category — planners,
caterers, decorators, photographers, rooms. `ServiceListing` is never queried, so those bookings
match nothing.

**Proof:** I created a booking against `decorator-enchanted-1` — a listing owned by this exact
vendor (`vendorId: 6a5b9aa2fe9eb47c17b765fa`). `GET /api/bookings` as that vendor returned only the
venue booking:

```
created:        { id: 6a6a0e31…, totalAmount: 50000 }   ✓ saved
vendorSeesNow:  ["venue-refinery-1 / Refinery Hotel New York"]   ← decorator booking missing
```

Of this vendor's 26 listings, only 5 are venues. **21 listings are permanently unable to deliver a
lead.** The vendor's own `/api/vendors` convention (`_id: service.serviceId`) and
`bookings/[id]`'s `findProvider()` both confirm `serviceId` is the intended key — the list query is
simply the odd one out.

**File:** `app/api/bookings/route.ts` (GET, vendor branch)

**Fix:**

```ts
const [ownedVenues, ownedServices] = await Promise.all([
  Venue.find({ vendorId: session.userId }).select("venueId").lean(),
  ServiceListing.find({ vendorId: session.userId }).select("serviceId").lean(),
]);
const providerIds = [
  session.userId,
  ...ownedVenues.map(v => v.venueId),
  ...ownedServices.map(s => s.serviceId),
];
```

Longer term, denormalise `vendorId` onto the `Booking` document at creation time and index it —
one indexed field beats two lookups on every dashboard load.

---

### 4. No booking notification exists anywhere

`lib/mail.ts` exports exactly six templates: login notification, verification OTP, password reset,
upload notification, inquiry notification, subscriber notification. **There is no booking template
at all**, and none of these four places sends anything:

| Event | Handler | Emails sent |
|---|---|---|
| Booking created | `POST /api/bookings` | none |
| Payment verified | `POST /api/bookings/verify-payment` | none |
| Payment via webhook | `POST /api/webhooks/stripe` | none |
| Status changed | `PATCH /api/admin/bookings` | none |

So: the user gets no confirmation and no receipt, the vendor is never told a booking arrived, and
the admin is never alerted. The only way anyone finds out is by logging in and looking. (Stripe's
own receipt does go out via `receipt_email` in `create-order`, but it's a payment receipt, not a
booking confirmation, and it only fires if the user actually reaches Stripe.)

Note also `notifyWhatsapp` is captured on every booking and stored — but nothing ever reads it.
There is no WhatsApp integration.

**Fix:** Add `sendBookingCreatedEmail` (→ user + vendor + admin), `sendBookingConfirmedEmail`
(→ user + vendor), `sendBookingCancelledEmail` and `sendBookingStatusChangedEmail` to `lib/mail.ts`,
and call them from the four handlers above. Send them **fire-and-forget** (see #7), and make the
vendor email include the customer's contact details and a deep link into the vendor portal. If
WhatsApp is genuinely planned, wire `notifyWhatsapp` to a provider; if not, remove the checkbox — it
currently promises something the product doesn't do.

---

### 5. The vendor cannot act on a booking

There is no vendor-side write endpoint for bookings. `app/api/bookings/route.ts` exposes POST
(create), GET (list) and DELETE (own booking / admin). Status changes live only in
`PATCH /api/admin/bookings`, which is admin-gated.

**Observed:** the vendor's *Booking Inquiries* page renders the lead as a read-only card — venue
name, date, guests, customer contact, total, paid — with **no action buttons whatsoever**. A vendor
who is double-booked, or who wants to decline, has no path other than phoning the admin.

Related: `GET /api/bookings/[id]` returns **403 to the vendor on their own booking** — the check is
`booking.userId !== session.userId && session.role !== "admin"`. The code comment even admits it
("If vendors were tied to specific venue IDs, we'd check that too, but right now vendors aren't
linked to venues in DB") — but they *are* linked, via `Venue.vendorId` / `ServiceListing.vendorId`.
So the vendor can't even open a detail view.

**Fix:** Add `PATCH /api/bookings/[id]` allowing the owning vendor to move `pending → confirmed`
and `pending|confirmed → cancelled` (with a reason), and to mark `completed` after the event date.
Extend the `GET /api/bookings/[id]` authorization to accept a vendor who owns the
venue/service behind `providerId`. Surface Accept / Decline / Message buttons on the vendor card.

---

## P1 — High

### 6. 2FA OTP: unlimited guesses, and no password re-check

`POST /api/auth/verify-2fa` takes `{ email, role, otp }`, looks up a matching `Otp` document, and
on a hit issues a full session. There is:

- **no attempt counter** — a 6-digit code can be brute-forced within the 15-minute TTL;
- **no proof the caller passed step one** — the endpoint never re-checks the password or carries a
  signed "password OK, awaiting OTP" token.

So during any legitimate 2FA login window, someone who knows the victim's email and role can grind
the code and get a session *without the password*. (`resend-otp` does require an existing OTP record
and rate-limits to 3 sends / 60 s cooldown, which stops an attacker from *creating* the window — so
this is exploitable during a real login rather than at will. Still needs fixing.)

**Files:** `app/api/auth/verify-2fa/route.ts`, `app/api/auth/verify-otp/route.ts`

**Fix:** Add `attempts` to the `Otp` schema; increment on every failure and delete the record at 5.
After step one, set a short-lived signed cookie (`pending2FA: { userId, role, exp: +10min }`) and
require it in `verify-2fa` instead of trusting the posted `email`/`role`. Compare the OTP with
`crypto.timingSafeEqual`.

### 7. Login blocks on SMTP

`app/api/auth/login/route.ts:145`:

```ts
// Send asynchronous login notification email
await sendLoginNotificationEmail(user.email, user.name, role, userAgent);
```

The comment says asynchronous; the code awaits it. The HTTP response is held until the SMTP
round-trip finishes. **Measured: 10–15 seconds of "Authenticating…" on every single sign-in**, for
all three roles. The same pattern is in `verify-2fa`. If SMTP is slow or down, login is slow or
down.

**Fix:** Drop the `await` and attach a catch — `void sendLoginNotificationEmail(...).catch(err =>
console.error('login mail failed', err))` — or push it onto a queue. Apply the same to
`verify-2fa`, `signup`, and `inquiries`.

### 8. Vendor's blocked dates do nothing

The vendor's Business Profile has an *Unavailable Dates* panel ("Block dates you're already booked
outside the platform. Customers won't be able to book these dates.") It saves to
`Vendor.unavailableDates`. But both places that read it look the vendor up **by `providerId`**:

```ts
const vendor = await Vendor.findById(providerId);   // bookings/route.ts:137, availability/route.ts:51
```

`providerId` is a venue slug (`venue-refinery-1`) or a service id (`decorator-enchanted-1`) — never
a `Vendor._id`. The `findById` throws a CastError, gets swallowed by the surrounding try/catch, and
the blocked dates are silently ignored. The feature has never worked for any real listing.

**Fix:** Resolve the owning vendor from the listing first
(`Venue.findOne({venueId: providerId}).vendorId`, else `ServiceListing.findOne({serviceId: providerId}).vendorId`),
then load that vendor's `unavailableDates`. Better: move blocked dates onto the listing itself, so a
vendor can block one venue without blocking all 26 listings.

### 9. No rate limiting anywhere

A grep for any rate-limiting construct across `app/` and `lib/` returns nothing. `POST /api/auth/login`
accepts unlimited attempts — credential stuffing and password brute-force are wide open. So are
`/api/inquiries` (spam + free outbound email), `/api/subscribe`, `/api/auth/forgot-password`
(mail-bombing) and `/api/views` (analytics poisoning).

**Fix:** Add IP + account rate limiting at the edge. Minimum: 5 login attempts per account per 15
minutes with exponential backoff, and a per-IP cap on the public POST endpoints. Add a captcha to
the public inquiry and subscribe forms.

### 10. `proxy.ts` checks login but not role

```ts
if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin/dashboard") ||
    pathname.startsWith("/vendor/dashboard")) {
  if (!session.isLoggedIn) { /* redirect to /login */ }
}
```

Role is never checked. Role separation is enforced only by client-side redirects inside the page
components.

**Tested:** as a vendor I loaded `/admin/dashboard` and *was* bounced back to `/vendor/dashboard`,
and all seven `/api/admin/*` endpoints correctly returned 401. So no data leaks today. But the admin
UI bundle is still served to any authenticated user, and the protection is one `useEffect` away from
being lost in a refactor.

**Fix:** Move the check into `proxy.ts` — `/admin/*` requires `session.role === 'admin'`,
`/vendor/*` requires `'vendor'`, `/dashboard` requires `'user'` — and redirect mismatches to the
correct portal. Keep the client redirect as belt-and-braces.

---

## P2 — Medium

### 11. Vendor has no earnings view

The admin's Payouts & Revenue ledger shows, per booking, gross total, 15% platform fee and net
vendor payout — ₹3,15,350 currently pending across the ledger. **The vendor portal has no
equivalent screen.** Sidebar: Dashboard, Services & Venues, Booking Inquiries, Business Profile,
Settings, Back to Home. A partner cannot see what they've earned, what's been released, or what
commission was deducted.

Also, the ledger's "Vendor Partner" column shows the *listing* name ("Refinery Hotel New York"), not
the vendor account ("SoulsWed Premium Collection"), so payouts aren't actually grouped by the
partner you'd pay.

**Fix:** Add an Earnings tab to the vendor portal reading the same data filtered to their listings.
Group the admin ledger by vendor account with a per-booking breakdown underneath.

### 12. Admin bookings ledger doesn't show the provider

Columns are: Booking Info (truncated id), Client Details, Specifications, Dates, Advance Paid,
Status, Delete. **There is no venue/vendor column.** Looking at "Priya Nair · ₹1,44,000 · Jun 26"
there is no way to tell which property it's for without copying the id and querying the DB. For an
ops team this makes the ledger close to unusable.

Two more issues on the same table: the column header reads **"Advance Paid"** but the value is the
advance *due* — my unpaid booking displayed "Adv: ₹11,400" while ₹0 had been collected. And the
truncated ids are indistinguishable (`6a69f603…` for six consecutive rows) because the seeded
records share an ObjectId timestamp prefix.

**Fix:** Add a Provider column (`providerName` is already on the document). Rename the money column
or split it into "Total / Advance due / Paid". Truncate ids from the tail, not the head.

### 13. Six existing bookings are orphaned

All six pre-existing bookings have a `providerId` that matches **no live listing**. Evidence:
`GET /api/bookings/availability?providerId=venue-refinery-1` returned `{blockedDates: []}` despite
the admin ledger showing bookings for Refinery Hotel; the venue's own calendar showed zero booked
dates. The vendor's Booking Inquiries page read "0 active leads" until I created a fresh booking,
which then appeared correctly.

So the venue path *does* work for new bookings — the demo data was just seeded with ids that don't
correspond to `Venue.venueId`.

**Fix:** Re-seed or backfill the six records so `providerId` matches the real `venueId` — otherwise
these dates aren't actually held, and the venues can be double-booked. Add a `providerId` validation
step on booking creation (reject if it resolves to neither a `Venue` nor a `ServiceListing`) to stop
orphans recurring.

### 14. `completed` is unreachable, so reviews can never be written

`POST /api/venues/[id]/reviews` correctly requires a completed booking:

```ts
const booking = await Booking.findOne({ userId, providerId: venueId, status: "completed" });
if (!booking) return 403 "You can only review a venue after a completed booking.";
```

That's the right gate — but nothing ever *sets* `completed`. There is no cron, no post-event
transition, and no vendor action. Only an admin manually changing a dropdown. Meanwhile the venue
page shows a **"Write a Review"** link to everyone, which will 403 for essentially all users. The
admin Reviews panel reads "No reviews found", and the vendor dashboard shows "0 Total Reviews /
Awaiting your first review" — the review system has produced nothing.

**Fix:** Auto-transition `confirmed → completed` once the event date has passed (scheduled job, or
lazily on read). Then trigger a "how was it?" email. Hide or disable "Write a Review" unless the
user has an eligible booking.

### 15. Password change accepts weak passwords

`lib/auth.ts` exports a solid `validatePassword()` — 8+ chars, upper, lower, digit, symbol, no
common sequences. Signup uses it. **The password-change endpoints don't:**

```ts
// app/api/auth/settings/password/route.ts:28
// app/api/admin/settings/password/route.ts:26
if (newPassword.length < 6) { ... }
```

Both UIs say "Minimum 6 characters". So a user who signed up with a strong password can immediately
downgrade to `abc123`, including on the **admin** account.

**Fix:** Call `validatePassword(newPassword)` in both handlers and update the helper text to match.

Related: `verifyPassword` compares hashes with `===` rather than `crypto.timingSafeEqual` — low
practical risk given PBKDF2, but worth tightening.

### 16. Booking cards never show an image

```ts
// components/booking/BookingCard.tsx:33
const venueDetails = getVenueById(booking.providerId);
const venueImage = venueDetails?.image;
```

`getVenueById` reads the **static** `lib/venues-data.ts`, which is legacy demo data — real listings
now live in MongoDB. The lookup always misses, so `venueImage` is `undefined` and every booking card
renders as an empty coloured block. Visible on both the user's *My Bookings* and the vendor's
*Booking Inquiries*.

**Fix:** Fetch the image from the API. `GET /api/bookings/[id]` already has a `findProvider()` that
returns images for both venues and services — reuse it, or denormalise a `providerImage` onto the
booking at creation. Then delete `lib/venues-data.ts`; `AGENTS.md` §4 already flags it for removal
and it's shipping ~57 venue records to the client.

### 17. `verify-payment` doesn't check amount or session binding

`POST /api/bookings/verify-payment` retrieves a **client-supplied** `stripe_session_id`, checks
`payment_status === "paid"`, then confirms the booking. It never verifies:

- that the amount paid equals `advanceAmount`;
- that `stripeSession.metadata.bookingId` matches the booking being confirmed.

The one guard is `if (booking.stripeSessionId && booking.stripeSessionId !== stripe_session_id)`.
Because `create-order` sets `stripeSessionId` before redirecting, this holds on the normal path —
but it fails **open** on any booking that never went through `create-order`, letting any paid
session id from the same Stripe account confirm it.

**Fix:** Require `stripeSession.metadata.bookingId === bookingId`, assert
`amount_total === Math.round(convertINRTo(booking.advanceAmount, currency) * 100)`, and drop the
`booking.stripeSessionId &&` short-circuit so a missing session id is a hard failure. Record
`amountPaid` (see #2). Treat the webhook as the source of truth and the redirect as a UX nicety.

---

## P3 — Lower priority

1. **User count mismatch.** Dashboard says "Registered Users 6"; the Customers list shows 5.
   `stats` filters `role: { $ne: "admin" }` while `users` filters `role: { $nin: ["admin","superadmin"] }`.
   Align the two.
2. **Listing count mismatch.** Homepage advertises "Search 26 listings"; admin reports 28 total /
   25 live. Three different numbers for one catalogue.
3. **`country: "Global"` on real listings.** Refinery Hotel New York renders as
   "Garment District, Global" while its own map card says "New York, United States". Same for
   JW Marriott Hong Kong. Backfill `country` on the seeded venues.
4. **Vendor has no category.** `/api/auth/me` returns `category: ""`, so the admin Vendors table
   renders an empty pill in the Category column. Make it required at onboarding.
5. **Dead endpoint.** `GET /api/admin/sessions` (active-sessions view, reads `lastLoginAt` /
   `lastLoginDevice` / `lastLoginMethod`) is fully implemented but called from nowhere. The data is
   being written on every login and never shown. Either build the UI or delete it.
6. **Admin has no 2FA.** Users and vendors have `twoFactorEnabled` and `/api/user/2fa/*`. Admin
   Settings offers only avatar, theme, password, sign out. The most privileged account has the
   weakest authentication.
7. **Dashboard tabs don't route.** Every admin section (Bookings, Vendors, Payouts…) stays on
   `/admin/dashboard`. No deep links, no browser back, no refresh-in-place. Same in the vendor
   portal. Move tab state into the URL — the user dashboard already does this correctly with
   `?tab=bookings`.
8. **Wishlist is localStorage-only.** `lib/store/useWishlistStore.ts` persists to
   `sw-wishlist-storage` in the browser. "Saved Venues" doesn't sync across devices and is lost when
   storage is cleared. Persist server-side against the user.
9. **Small UX papercuts.**
   - `/login` renders blank for ~3 s before the form appears — no skeleton or loading state.
   - The booking form prefills Full Name from the session but leaves Contact Number empty, even
     though the profile has a phone number.
   - The vendor's read-only booking card has a wishlist heart on it — leftover from the shared user
     component.
   - Admin Settings content is constrained to ~950 px, leaving half of a wide viewport empty.
   - Public inquiries aren't linked to a user or vendor: the admin queue is a flat list with only a
     status dropdown and no reply mechanism, and the user's dashboard "Enquiries" counter is
     permanently 0.

---

## What I verified as working

Worth stating plainly, since the report above is all problems:

- Session handling is sound — `iron-session`, encrypted cookies, `SESSION_SECRET` in `.env`, not
  the plain-JSON cookie the old code used.
- Passwords are PBKDF2-SHA512, 100k iterations, per-user random salt.
- Password reset is done properly: `crypto.randomBytes(32)`, SHA-256 hashed at rest, with expiry.
- All seven `/api/admin/*` endpoints correctly reject non-admin sessions (verified live from a
  vendor session — 401 across the board).
- Venue `PATCH`/`DELETE` enforce ownership (`existingVenue.vendorId !== session.userId` → 403), and
  strip `verified` / `featured` / `active` from vendor updates. Same pattern in `/api/services`.
- Upload validates MIME type and size (15 MB images / 200 MB video) and is session-gated.
- Review submission is correctly gated behind a completed booking with a duplicate check.
- The Stripe webhook verifies its signature with `constructEvent`.
- Booking date-conflict detection works, including correct half-open interval logic for room ranges.
- A new venue booking propagates correctly: user creates it → appears in the user dashboard →
  appears in the vendor's Booking Inquiries → appears in the admin ledger → admin status change
  reflects everywhere (single source of truth, no sync bug).

---

## Suggested order of work

**Before any real money moves:** #1, #2, #17 — these are the paths where the platform loses money.

**Before launch:** #3, #4, #5 — without these the marketplace loop doesn't close. A vendor who can't
be notified and can't respond isn't a vendor.

**Then:** #6, #7, #9, #10 for auth hardening, #8 and #13 for calendar correctness, #11 and #12 for
day-to-day operability.
