/**
 * Password hashing, the strength policy, and constant-time comparison.
 *
 * The policy tests matter because the change-password routes used to bypass
 * validatePassword() entirely and accept any 6-character string — so a user,
 * or an admin, could downgrade to a weak password immediately after signup.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateEmail,
  validatePhone,
  validateName,
  timingSafeEqualStr,
} from "../../lib/auth.ts";

describe("password hashing", () => {
  test("a correct password verifies", () => {
    const hash = hashPassword("C0rrect&Horse!");
    assert.equal(verifyPassword("C0rrect&Horse!", hash), true);
  });

  test("a wrong password does not", () => {
    const hash = hashPassword("C0rrect&Horse!");
    assert.equal(verifyPassword("c0rrect&horse!", hash), false);
    assert.equal(verifyPassword("", hash), false);
  });

  test("the same password hashes differently every time (random salt)", () => {
    const a = hashPassword("Same&Password1");
    const b = hashPassword("Same&Password1");
    assert.notEqual(a, b, "identical hashes would mean a static salt");
    // ...but both still verify.
    assert.equal(verifyPassword("Same&Password1", a), true);
    assert.equal(verifyPassword("Same&Password1", b), true);
  });

  test("a malformed stored hash is rejected rather than throwing", () => {
    assert.equal(verifyPassword("anything", ""), false);
    assert.equal(verifyPassword("anything", "no-colon-here"), false);
  });
});

describe("password policy", () => {
  test("accepts a strong password", () => {
    assert.equal(validatePassword("Str0ng&Valid!x"), null);
  });

  // Each of these was accepted by the change-password route before the fix.
  const rejected: [string, RegExp][] = [
    ["abc123", /8 characters/],
    ["Sh0rt!", /8 characters/],
    ["nouppercase1!", /uppercase/],
    ["NOLOWERCASE1!", /lowercase/],
    ["NoDigitsHere!", /number/],
    ["NoSymbols123", /special character/],
    ["Password123!", /predictable/],
    ["Qwerty123!x", /predictable/],
  ];

  for (const [password, expected] of rejected) {
    test(`rejects ${JSON.stringify(password)}`, () => {
      const err = validatePassword(password);
      assert.ok(err, "expected a rejection message");
      assert.match(err!, expected);
    });
  }
});

describe("timing-safe comparison", () => {
  test("matches identical strings", () => {
    assert.equal(timingSafeEqualStr("123456", "123456"), true);
  });

  test("rejects different strings, including different lengths", () => {
    assert.equal(timingSafeEqualStr("123456", "123457"), false);
    assert.equal(timingSafeEqualStr("123456", "1234567"), false);
    assert.equal(timingSafeEqualStr("", "123456"), false);
  });

  test("does not throw on null or undefined", () => {
    // OTP codes arrive from user input, so this must never crash the route.
    assert.doesNotThrow(() => timingSafeEqualStr(undefined as never, "123456"));
    assert.equal(timingSafeEqualStr(undefined as never, "123456"), false);
  });
});

describe("field validation", () => {
  test("email", () => {
    assert.equal(validateEmail("someone@example.com"), null);
    assert.ok(validateEmail("not-an-email"));
    assert.ok(validateEmail(""));
  });

  test("phone rejects obvious dummies", () => {
    assert.equal(validatePhone("+917200470762"), null);
    assert.ok(validatePhone("1234567890"), "sequential");
    assert.ok(validatePhone("9999999999"), "repeated digits");
    assert.ok(validatePhone("5200470762"), "Indian mobiles start 6-9");
    assert.ok(validatePhone(""));
  });

  test("name rejects digits and symbols", () => {
    assert.equal(validateName("Mohan Venkatesh"), null);
    assert.equal(validateName("O'Brien-Smith"), null);
    assert.ok(validateName("Mohan123"));
    assert.ok(validateName("A"));
  });
});
