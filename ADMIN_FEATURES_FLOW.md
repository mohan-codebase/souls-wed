# SoulsWed Admin Features Architecture & Workflow Guide

This document details the operational flow, data lifecycle, and backend architecture of the core admin features implemented in the **SoulsWed Admin Control Panel**.

---

## 1. 📨 Inquiries Queue Flow (Lead Management)

```
[Couple submits Contact / Quote Form]
                │
                ▼
  [Database: Inquiry Document Created]
  (status: "new", firstName, email, message)
                │
                ▼
  [Admin Dashboard: "Inquiries Queue" Tab]
  (Shows unread badge counter in Sidebar)
                │
         ┌──────┴──────┐
         ▼             ▼
 [Admin Reviews]  [Admin Action]
                 ├── Change Status: "New" ➔ "Responded" ➔ "Closed"
                 └── Delete spam / invalid inquiries
```

### Operational Steps
1. **Submission**: A couple submits an inquiry form anywhere on SoulsWed (e.g., contact page or vendor inquiry modal).
2. **Database Record**: Saved to MongoDB via [`lib/models/Inquiry.ts`](file:///Users/mohan/Developer/Projects/souls-wed/lib/models/Inquiry.ts) with initial status `"new"`.
3. **Admin Monitoring**:
   - The **Inquiries Queue** sidebar item displays a red badge count for all `"new"` inquiries.
   - Admin filters by **All / New / Responded / Closed** or searches by customer name/email.
4. **Action**: Admin updates the dropdown status to `"responded"` once handled or `"closed"` when resolved.
5. **API Endpoint**: Handled by [`app/api/admin/inquiries/route.ts`](file:///Users/mohan/Developer/Projects/souls-wed/app/api/admin/inquiries/route.ts) (`GET`, `PATCH`, `DELETE`).

---

## 2. 💰 Payouts & Revenue Flow (Financial Ledger)

```
[Couple Completes Booking Payment]
                │
                ▼
  [Booking Status: "confirmed" or "completed"]
  (grossTotal = ₹5,00,000 | advance = ₹1,50,000)
                │
                ▼
  [Admin Dashboard: "Payouts & Revenue" Tab]
  ├── Gross Volume: Total value of bookings
  ├── Platform Fee (15%): Commission earned (e.g. ₹75,000)
  └── Net Vendor Payout: Amount owed to vendor (e.g. ₹4,25,000)
                │
                ▼
  [Admin Releases Payout to Vendor Bank Account]
  (Status toggled from "Pending" ➔ "Released")
```

### Operational Steps
1. **Trigger**: When a couple books a venue or service and payment is verified, the booking is saved with status `"confirmed"`.
2. **Automated Calculation**: 
   - [`app/api/admin/payouts/route.ts`](file:///Users/mohan/Developer/Projects/souls-wed/app/api/admin/payouts/route.ts) automatically calculates the **15% Platform Commission** and **Net Vendor Payout** for each booking.
3. **Financial Overview**:
   - **Gross Volume Card**: Total booking value across the platform.
   - **Platform Fee (15%) Card**: SoulsWed's platform revenue.
   - **Pending Payouts Card**: Accumulated amount waiting to be remitted to vendors.
4. **Payout Execution**:
   - Once the event is completed, Admin clicks **"Release Payout"**. The status changes to `"released"` and updates `payoutStatus` in [`lib/models/Booking.ts`](file:///Users/mohan/Developer/Projects/souls-wed/lib/models/Booking.ts).

---

## 3. ⭐ Customer Reviews Moderation Flow

```
[User Posts Review on Vendor Profile]
                │
                ▼
  [Review Added to Vendor's embedded reviews array]
  (rating: 5, author, comment text, date)
                │
                ▼
  [Admin Dashboard: "Reviews" Tab]
  (Aggregates reviews across all vendor profiles)
                │
         ┌──────┴──────┐
         ▼             ▼
 [Audit Rating & Text] [Delete Spam / Inappropriate Review]
                       └── Recalculates vendor's overall rating average
```

### Operational Steps
1. **Submission**: User leaves a star rating and comment on a vendor profile.
2. **Admin Moderation**:
   - Admin navigates to the **Reviews** tab in [`app/(dashboard)/admin/dashboard/page.tsx`](file:///Users/mohan/Developer/Projects/souls-wed/app/%28dashboard%29/admin/dashboard/page.tsx).
   - Admin views the author name, target vendor, exact star rating (1–5 stars), comment snippet, and posting date.
3. **Moderation Action**:
   - If a review contains spam, abusive content, or fake ratings, Admin clicks the **Trash Icon** (Delete).
   - The API ([`app/api/admin/reviews/route.ts`](file:///Users/mohan/Developer/Projects/souls-wed/app/api/admin/reviews/route.ts)) pulls the review from the vendor record and **automatically recalculates** the vendor's average rating score and total review count.

---

## 4. 🛡️ Vendor Badging & Verification Flow

```
[Admin opens "Vendors" Directory Tab]
                │
                ▼
   ┌────────────┴────────────┐
   ▼                         ▼
[Toggle "Verified"]     [Toggle "Featured"]
(verified: true/false)  (featured: true/false)
   │                         │
   ▼                         ▼
  [Public Listing Card updates immediately]
  (Displays "Verified Partner" shield / "Featured" badge)
```

### Operational Steps
1. **Verification**: Admin reviews registered vendor business documents or credentials in the **Vendors** directory.
2. **One-Click Badging**:
   - Clicking **"Verified" / "Pending"** toggles the `verified` flag on [`lib/models/Vendor.ts`](file:///Users/mohan/Developer/Projects/souls-wed/lib/models/Vendor.ts).
   - Clicking **"Featured" / "Regular"** toggles the `featured` flag for homepage / top search promotion spots.
3. **Public Display**: Public search results and listing cards instantly display the *SoulsWed Verified* shield badge or *Featured* tag to couples.
