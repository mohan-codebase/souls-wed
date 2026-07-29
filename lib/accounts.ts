/**
 * ACCOUNT RESOLUTION
 *
 * The platform stores its three roles in three collections — `User`, `Vendor`
 * and `Admin` — which means anything acting on "the signed-in account" has to
 * branch on `session.role`. That branching was copy-pasted in several places
 * and, in the 2FA endpoints, simply omitted: they hardcoded `User`, so admins
 * and vendors could not enable two-factor auth at all. Admin was therefore the
 * most privileged role with the weakest available authentication.
 *
 * One place to resolve a session to its document.
 */

import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Vendor } from "@/lib/models/Vendor";
import { Admin } from "@/lib/models/Admin";
import type { SessionData } from "@/lib/session";

export type AccountRole = "user" | "vendor" | "admin";

/**
 * The fields callers actually touch on a resolved account, plus `save()`.
 * Deliberately narrow rather than `any`: the three models have different
 * shapes, and this is the intersection anything role-agnostic should rely on.
 */
export interface AccountDocument {
  _id: unknown;
  email: string;
  name: string;
  twoFactorEnabled?: boolean;
  loginAlertsEnabled?: boolean;
  sessionTimeoutDays?: number;
  save: () => Promise<unknown>;
}

/** The slice of a Mongoose model this module needs. */
interface AccountModel {
  findById: (id: string) => Promise<AccountDocument | null>;
}

const MODELS = { user: User, vendor: Vendor, admin: Admin } as const;

/** Whether a string is one of the three roles we know about. */
export function isAccountRole(role: unknown): role is AccountRole {
  return role === "user" || role === "vendor" || role === "admin";
}

/**
 * The Mongoose document behind a session, whichever collection it lives in.
 * Returns null when the session is unusable or the account has been deleted.
 *
 * The document is returned hydrated (not `.lean()`) so callers can mutate and
 * `.save()` it.
 */
export async function getAccountForSession(
  session: Pick<SessionData, "isLoggedIn" | "userId" | "role">
): Promise<{ account: AccountDocument; role: AccountRole } | null> {
  if (!session?.isLoggedIn || !session.userId || !isAccountRole(session.role)) {
    return null;
  }

  await connectDB();

  const model = MODELS[session.role] as unknown as AccountModel;
  const account = await model.findById(session.userId);
  if (!account) return null;

  return { account, role: session.role };
}

/**
 * Who counts as a "customer" in the admin panel.
 *
 * The Customers list and the dashboard's "Registered Users" tile disagreed —
 * 5 vs 6 — because they each carried their own hand-written filter. Besides the
 * role exclusions there is also a `User` document for the admin's own address,
 * which the list hides and the counter didn't. Both now import this.
 *
 * Exported as a function because Mongoose mutates filter objects it is handed.
 */
export function customerFilter() {
  return {
    role: { $nin: ["admin", "superadmin"] },
    email: { $ne: "admin@soulswed.com" },
    name: { $ne: "Admin User" },
  };
}
