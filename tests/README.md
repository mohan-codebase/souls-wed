# Tests

Added after the July 2026 audit. Every case here corresponds to a bug that was
actually found and fixed — the suite exists to notice if any of them returns.

No test framework is installed. These use Node's built-in runner
(`node --test`), so there is nothing to `npm install` and nothing to configure.

The `test:unit` script passes `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON`.
Node otherwise warns that the `lib/*.ts` files being imported have no declared
module type. The fix Node suggests — adding `"type": "module"` to the root
`package.json` — would flip every `.js` file in the project to ESM and break the
PostCSS and Next configs, so the warning is suppressed instead. It refers only
to a module-detection overhead, which is irrelevant at this scale.

## Running

```bash
npm test            # unit tests — fast, no database, no server
npm run test:unit   # same thing

# integration tests need the app running and a database
npm run dev         # terminal 1
TEST_ADMIN_EMAIL=admin@example.com \
TEST_ADMIN_PASSWORD='...' \
TEST_VENDOR_EMAIL=vendor@example.com \
TEST_VENDOR_PASSWORD='...' \
npm run test:api    # terminal 2
```

Credentials come from the environment so nothing secret lands in the repo. The
vendor pair is optional — those tests skip themselves if it's missing.

## What's covered

### `tests/unit/` — 44 tests, no I/O

| File | Why it matters |
|---|---|
| `payouts.test.ts` | The money maths. Commission comes off what was *collected*, never the headline booking value; commission + payout must reconstitute the collected amount exactly; a payout can never exceed what was collected, or go negative. |
| `auth.test.ts` | Password hashing, the strength policy (each rule that the change-password route used to skip), and constant-time OTP comparison. |
| `rate-limit.test.ts` | Window expiry, per-key isolation, `Retry-After`, and that a successful login clears the counter. |

### `tests/api/regression.test.mjs` — integration

One `describe` per audit finding:

- **#1** pricing is server-authoritative — tampered `totalAmount` rejected, omitted amount priced server-side, capacity enforced, wrong booking type refused
- **#2** payment state separate from status — unpaid bookings can't be confirmed or paid out; revenue moves only by amounts actually recorded
- **#13** `providerId` normalised — a booking made with a raw ObjectId is stored under the slug, and the same date then conflicts
- **#3/#5/#11** vendor visibility, decline, and earnings agreeing with the admin ledger
- **#14** review gating and the admin moderation queue
- **#6/#9/#10/#15** authorization, rate limiting, 2FA binding, password policy
- **P3** admin count consistency

## Things to know before running the API suite

**It writes to whatever database the app points at.** Bookings it creates are
torn down in an `after` hook, but a crashed run can leave rows behind — they're
identifiable by `userName` starting `ATEST-`. Point it at a development
database, never production.

**It deliberately trips the login rate limiter.** That test uses a nonexistent
address so no real account is locked out, and the suite logs in once up front
and reuses the session. If the admin login in `before()` returns 429, a previous
run is still cooling down — wait out the 15-minute window.

**It records offline payments**, which is a real state change. The bookings are
deleted afterwards, so revenue returns to where it started.

## Known gaps

- **`lib/pricing.ts` has no unit tests.** It imports Mongoose models through the
  `@/` path alias, which Node's type stripping can't resolve. Its behaviour is
  covered at the API level instead — which is where its bugs actually lived. If
  you want unit coverage, extract the pure formula (per-plate vs rental, day
  multiplication) into a module with no imports and test that directly.
- **Nothing covers the real Stripe flow.** `create-order`, the redirect and the
  webhook are untested; only the offline-payment path is exercised end to end.
  Testing the rest needs Stripe test keys and the CLI to forward webhooks.
- **Email delivery is unverified.** The code dispatches without blocking, but
  nothing asserts a message reaches an inbox.
## CI

`.github/workflows/ci.yml` runs on every push and pull request.

**Blocking** (all green today, so a failure is a real regression): the env-file
guard, a credential scan, `tsc --noEmit`, `npm test`, and `npm run build`.

**Advisory:** ESLint. It reports ~283 problems (153 errors), essentially all
pre-existing `any` and `prefer-const` in the original codebase. Making it
blocking would paint CI red on day one and train everyone to ignore it. It runs
with `continue-on-error` and prints the count to the job summary — drive that to
zero, then delete `continue-on-error` and move the job into `verify`.

The env-file guard exists because `.gitignore` did not prevent `.env` being
committed 12 times: gitignore doesn't apply to files git already tracks. This
check does, and fails the build if any env file is tracked again.
