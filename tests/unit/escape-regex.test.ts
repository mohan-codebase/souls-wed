/**
 * Regex escaping for user-supplied search input.
 *
 * The public list APIs (/api/vendors, /api/venues, /api/services) build a
 * MongoDB `$regex` from `country` / `city` / `search`. Before this was escaped,
 * `?city=^.*$` matched every document (filter bypass), `?search=(((` threw a
 * driver error that leaked to the client as a 500, and a catastrophic pattern
 * was a ReDoS vector. See AUDIT-REPORT.md / the July 30 flow re-audit.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { escapeRegex } from "../../lib/search/escape-regex.ts";

describe("escapeRegex()", () => {
  test("escapes every regex metacharacter", () => {
    assert.equal(escapeRegex(".*+?^${}()|[]\\"), "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  test("leaves ordinary text untouched", () => {
    assert.equal(escapeRegex("New Delhi"), "New Delhi");
  });

  test("a match-all payload no longer matches arbitrary values", () => {
    // The bypass: `^.*$` as a raw pattern matches anything. Escaped, it only
    // matches the literal string "^.*$".
    const re = new RegExp(escapeRegex("^.*$"), "i");
    assert.equal(re.test("Some Unrelated Venue"), false);
    assert.equal(re.test("^.*$"), true);
  });

  test("a malformed pattern becomes a valid, literal regex (no driver error)", () => {
    // `(((` used to reach the driver and throw "Regular expression is invalid".
    assert.doesNotThrow(() => new RegExp(escapeRegex("(((")));
    assert.equal(new RegExp(escapeRegex("((("), "i").test("((("), true);
  });

  test("a catastrophic-backtracking payload is defused to a literal", () => {
    // `(a+)+$` is the classic ReDoS shape; escaped, it's just text.
    const re = new RegExp(escapeRegex("(a+)+$"), "i");
    assert.equal(re.test("(a+)+$"), true);
    assert.equal(re.test("aaaaaaaaaaaaaaaaaaaa"), false);
  });
});
