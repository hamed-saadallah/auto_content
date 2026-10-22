import assert from "node:assert/strict";
import { test } from "node:test";
import matter from "gray-matter";

import {
  buildPostPayload,
  categorySlugForFile,
  toWpDate,
} from "./sync-wordpress.mjs";

test("keeps the calendar day when YAML parses the date into a Date", () => {
  // What gray-matter hands back for an unquoted `date: 2026-08-28`.
  const parsed = new Date("2026-08-28T00:00:00.000Z");
  assert.equal(toWpDate(parsed), "2026-08-28T09:00:00");
});

test("keeps the author-specified time when the date carries one", () => {
  const parsed = new Date("2026-08-28T14:30:15.000Z");
  assert.equal(toWpDate(parsed), "2026-08-28T14:30:15");
});

test("pads single-digit month, day, and time components", () => {
  assert.equal(toWpDate(new Date("2026-01-05T00:00:00.000Z")), "2026-01-05T09:00:00");
  assert.equal(toWpDate(new Date("2026-01-05T04:05:06.000Z")), "2026-01-05T04:05:06");
});

test("still accepts the quoted date-only string form", () => {
  assert.equal(toWpDate("2026-08-28"), "2026-08-28T09:00:00");
  assert.equal(toWpDate(" 2026-08-28 "), "2026-08-28T09:00:00");
});

test("passes through a full datetime string untouched", () => {
  assert.equal(toWpDate("2026-08-28T14:30:00"), "2026-08-28T14:30:00");
});

test("returns undefined for missing or unusable values", () => {
  assert.equal(toWpDate(undefined), undefined);
  assert.equal(toWpDate(null), undefined);
  assert.equal(toWpDate(""), undefined);
  assert.equal(toWpDate("   "), undefined);
  assert.equal(toWpDate(new Date("not a date")), undefined);
  assert.equal(toWpDate(42), undefined);
});

test("buildPostPayload sends a date for real unquoted frontmatter", () => {
  const raw = [
    "---",
    'sujet: "Example post"',
    "date: 2026-08-28",
    "platform: blog",
    'seo_title: "Example SEO title"',
    'meta_description: "Example excerpt."',
    "---",
    "",
    "# Example post",
    "",
    "Body text.",
  ].join("\n");

  const { data } = matter(raw);
  assert.ok(data.date instanceof Date, "YAML should parse the date into a Date");

  const payload = buildPostPayload(data, "2026-08-28-example", "<p>Body text.</p>");
  assert.equal(payload.date, "2026-08-28T09:00:00");
  assert.equal(payload.title, "Example SEO title");
  assert.equal(payload.excerpt, "Example excerpt.");
  assert.equal(payload.slug, "2026-08-28-example");
  assert.equal(payload.status, "publish");
});

test("buildPostPayload omits date when frontmatter has none", () => {
  const payload = buildPostPayload({ sujet: "No date" }, "no-date", "<p>x</p>");
  assert.ok(!("date" in payload));
  assert.equal(payload.title, "No date");
});

test("buildPostPayload falls back from seo_title to sujet to slug", () => {
  assert.equal(buildPostPayload({ sujet: "S" }, "slug", "").title, "S");
  assert.equal(buildPostPayload({}, "slug", "").title, "slug");
});

test("categorySlugForFile maps blog and tutorial directories", () => {
  assert.equal(categorySlugForFile("content/blog/a.md"), "blog");
  assert.equal(categorySlugForFile("content/tutorials/a.md"), "tutorials");
  assert.throws(() => categorySlugForFile("content/linkedin/a.md"), /must be under/);
  assert.throws(() => categorySlugForFile("content/other/a.md"), /must be under/);
});

test("importing the module does not run the CLI", () => {
  // A bare import would previously call main() and exit(1) on missing env vars.
  // Reaching this assertion at all proves the direct-invocation guard works.
  assert.equal(typeof toWpDate, "function");
});
