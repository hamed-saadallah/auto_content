#!/usr/bin/env node
/**
 * Sync Markdown blog posts and tutorials to WordPress via REST API.
 *
 * Usage:
 *   node scripts/sync-wordpress.mjs content/blog/2026-08-26-slug.md [...]
 *   node scripts/sync-wordpress.mjs content/tutorials/2026-08-26-slug.md [...]
 *
 * Env:
 *   WP_URL                     Site base URL (no trailing slash)
 *   WP_USER                    WordPress username
 *   WP_APP_PASSWORD            Application Password
 *   WP_BLOG_CATEGORY_SLUG      Category for content/blog/ (default: blog)
 *   WP_TUTORIAL_CATEGORY_SLUG  Category for content/tutorials/ (default: tutorials)
 *
 * Blog posts and tutorials may set frontmatter `featured_image` (path relative
 * to the .md file). That file is uploaded to /wp/v2/media and attached as
 * featured_media.
 * Existing media with the same slug is reused; the file is not re-uploaded.
 * If `image_alt` is set, reused media gets its alt_text updated.
 *
 * SEO (when present in frontmatter):
 *   seo_title         → post title (fallback: sujet, then filename slug)
 *   meta_description  → post excerpt (or `excerpt` if meta_description absent)
 *   image_alt         → media alt_text (fallback on upload: post title)
 *   focus_keyword     → stored in git only; not sent to WordPress yet
 *
 * LinkedIn markdown under content/linkedin/ is not synced.
 *
 * Frontmatter `date` accepts both the unquoted YAML form (`date: 2026-08-28`,
 * which YAML parses into a Date) and a quoted string. Date-only values publish
 * at 09:00 local site time. See toWpDate().
 */

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { marked } from "marked";

const WP_URL = (process.env.WP_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_USER || "";
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";
const WP_BLOG_CATEGORY_SLUG = process.env.WP_BLOG_CATEGORY_SLUG || "blog";
const WP_TUTORIAL_CATEGORY_SLUG =
  process.env.WP_TUTORIAL_CATEGORY_SLUG || "tutorials";

const categoryIdCache = new Map();

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function authHeader() {
  const token = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  return `Basic ${token}`;
}

async function wpFetch(apiPath, options = {}) {
  const url = `${WP_URL}/wp-json/wp/v2${apiPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  return parseJsonResponse(res, options.method || "GET", apiPath);
}

async function resolveCategoryId(slug) {
  const existing = await wpFetch(`/categories?slug=${encodeURIComponent(slug)}`);
  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`Category "${slug}" found (id=${existing[0].id})`);
    return existing[0].id;
  }

  console.log(`Category "${slug}" missing — creating…`);
  const created = await wpFetch("/categories", {
    method: "POST",
    body: JSON.stringify({
      name: slug,
      slug,
    }),
  });
  console.log(`Category "${slug}" created (id=${created.id})`);
  return created.id;
}

async function findPostBySlug(slug) {
  const posts = await wpFetch(
    `/posts?slug=${encodeURIComponent(slug)}&status=publish,draft,future,pending,private`
  );
  return Array.isArray(posts) && posts.length > 0 ? posts[0] : null;
}

async function findMediaBySlug(slug) {
  const media = await wpFetch(`/media?slug=${encodeURIComponent(slug)}`);
  return Array.isArray(media) && media.length > 0 ? media[0] : null;
}

function mimeForExt(ext) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function parseJsonResponse(res, method, apiPath) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null
        ? JSON.stringify(data)
        : String(data);
    throw new Error(`${method} ${apiPath} → ${res.status}: ${detail}`);
  }

  return data;
}

async function wpUploadMedia(filePath, { title, altText }) {
  const abs = path.resolve(filePath);
  const buf = await readFile(abs);
  const filename = path.basename(abs);
  const mime = mimeForExt(path.extname(filename));
  const params = new URLSearchParams();
  if (title) params.set("title", String(title));
  if (altText) params.set("alt_text", String(altText));
  const qs = params.toString();
  const apiPath = `/media${qs ? `?${qs}` : ""}`;
  const url = `${WP_URL}/wp-json/wp/v2${apiPath}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename}"`,
      Accept: "application/json",
    },
    body: buf,
  });

  return parseJsonResponse(res, "POST", apiPath);
}

async function resolveFeaturedMediaId(mdAbsPath, frontmatter, title) {
  const rel = frontmatter.featured_image;
  if (!rel || typeof rel !== "string") return undefined;

  const imagePath = path.resolve(path.dirname(mdAbsPath), rel);
  try {
    await access(imagePath);
  } catch {
    throw new Error(`featured_image not found: ${imagePath}`);
  }

  const mediaSlug = path.basename(imagePath, path.extname(imagePath));
  const altText = frontmatter.image_alt
    ? String(frontmatter.image_alt)
    : String(title);

  const existing = await findMediaBySlug(mediaSlug);
  if (existing) {
    console.log(`Media "${mediaSlug}" found (id=${existing.id}) — reusing`);
    if (frontmatter.image_alt) {
      await wpFetch(`/media/${existing.id}`, {
        method: "POST",
        body: JSON.stringify({ alt_text: String(frontmatter.image_alt) }),
      });
      console.log(`Media "${mediaSlug}" alt_text updated`);
    }
    return existing.id;
  }

  const uploaded = await wpUploadMedia(imagePath, {
    title: String(title),
    altText,
  });
  console.log(`Media "${mediaSlug}" uploaded (id=${uploaded.id})`);
  return uploaded.id;
}

export function categorySlugForFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (normalized.includes("content/blog/")) {
    return WP_BLOG_CATEGORY_SLUG;
  }
  if (normalized.includes("content/tutorials/")) {
    return WP_TUTORIAL_CATEGORY_SLUG;
  }
  throw new Error(
    `File must be under content/blog/ or content/tutorials/: ${filePath}`
  );
}

async function categoryIdForSlug(slug) {
  if (categoryIdCache.has(slug)) {
    return categoryIdCache.get(slug);
  }
  const id = await resolveCategoryId(slug);
  categoryIdCache.set(slug, id);
  return id;
}

/**
 * Normalize a frontmatter `date` to what WordPress expects: a local datetime
 * without timezone, YYYY-MM-DDTHH:MM:SS.
 *
 * YAML turns an unquoted `date: 2026-08-28` into a Date at UTC midnight, so the
 * Date branch reads UTC components to keep the calendar day that was written in
 * the file. A value sitting exactly on UTC midnight carries no author-chosen
 * time, so it gets the same 09:00 default as the date-only string form.
 */
export function toWpDate(dateValue) {
  if (!dateValue) return undefined;

  const pad = (n) => String(n).padStart(2, "0");

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return undefined;
    const day = [
      dateValue.getUTCFullYear(),
      pad(dateValue.getUTCMonth() + 1),
      pad(dateValue.getUTCDate()),
    ].join("-");
    const h = dateValue.getUTCHours();
    const m = dateValue.getUTCMinutes();
    const s = dateValue.getUTCSeconds();
    const time =
      h === 0 && m === 0 && s === 0
        ? "09:00:00"
        : [pad(h), pad(m), pad(s)].join(":");
    return `${day}T${time}`;
  }

  if (typeof dateValue !== "string") return undefined;

  const trimmed = dateValue.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T09:00:00`;
  }
  return trimmed;
}

/**
 * Core REST payload from Markdown frontmatter.
 * Plugin SEO meta (Yoast / Rank Math) can be added here later without
 * changing the skill's frontmatter keys.
 */
export function buildPostPayload(frontmatter, slug, html) {
  const title = String(frontmatter.seo_title || frontmatter.sujet || slug);
  const payload = {
    title,
    slug,
    content: html,
    status: "publish",
  };
  const date = toWpDate(frontmatter.date);
  if (date) payload.date = date;
  const excerpt = frontmatter.meta_description || frontmatter.excerpt;
  if (excerpt) payload.excerpt = String(excerpt);
  return payload;
}

async function syncFile(filePath, categoryId) {
  const abs = path.resolve(filePath);
  const raw = await readFile(abs, "utf8");
  const { data: frontmatter, content } = matter(raw);
  const slug = path.basename(filePath, path.extname(filePath));
  const html = marked.parse(content.trim(), { async: false });

  const payload = buildPostPayload(frontmatter, slug, html);
  payload.categories = [categoryId];

  const featuredMediaId = await resolveFeaturedMediaId(
    abs,
    frontmatter,
    payload.title
  );
  if (featuredMediaId) payload.featured_media = featuredMediaId;

  const existing = await findPostBySlug(slug);
  if (existing) {
    const updated = await wpFetch(`/posts/${existing.id}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`Updated: ${slug} (id=${updated.id}) → ${updated.link}`);
    return updated;
  }

  const created = await wpFetch("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`Created: ${slug} (id=${created.id}) → ${created.link}`);
  return created;
}

async function main() {
  const files = process.argv.slice(2).filter((f) => f.endsWith(".md"));

  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    fail("WP_URL, WP_USER, and WP_APP_PASSWORD must be set");
  }
  if (files.length === 0) {
    console.log("No Markdown files to sync — nothing to do.");
    return;
  }

  console.log(`Syncing ${files.length} file(s) to ${WP_URL}`);
  console.log(`Blog category slug: ${WP_BLOG_CATEGORY_SLUG}`);
  console.log(`Tutorial category slug: ${WP_TUTORIAL_CATEGORY_SLUG}`);

  let errors = 0;
  for (const file of files) {
    try {
      const categorySlug = categorySlugForFile(file);
      const categoryId = await categoryIdForSlug(categorySlug);
      await syncFile(file, categoryId);
    } catch (err) {
      errors += 1;
      console.error(`Failed ${file}: ${err.message}`);
    }
  }

  if (errors > 0) {
    fail(`${errors} file(s) failed to sync`);
  }
  console.log("Done.");
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => fail(err.message || String(err)));
}
