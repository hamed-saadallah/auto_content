---
name: content-studio
description: >-
  Publishes approved blog, tutorial, or LinkedIn drafts through the Content
  Studio API (NestJS) instead of opening a GitHub PR. Use when STUDIO_API_URL
  is configured, or when the user asks to publish via the studio / Railway app.
---

# Content Studio publish (no PR)

Use this path when the user wants the same generate → review → approve → publish flow as the skills, but **without** a pull request or GitHub Action.

Requires environment:

| Variable | Meaning |
|----------|---------|
| `STUDIO_API_URL` | Public API origin, no trailing slash (e.g. `https://studio-api.up.railway.app`) |
| `STUDIO_EMAIL` | `ADMIN_EMAIL` |
| `STUDIO_PASSWORD` | `ADMIN_PASSWORD` |

## Workflow

1. Follow the matching skill (`create-blog-post`, `create-tutorial-for-blog`, `linkedin-post`, `linkedin-post-bernard`, `linkedin-product-showcase`, or `linkedin-explain-concept`) for **ask → generate in chat → revise until approval**. Do not write `content/**` or open a PR if this API is configured. Bernard posts still publish as `type: "LINKEDIN"`.
2. On explicit approval (`ok` / `approve` / `approuve` / `valide`):
   - `POST $STUDIO_API_URL/api/auth/login` with `{ "email", "password" }`. Save `accessToken`.
   - `POST /api/contents` with `{ "type": "BLOG" | "TUTORIAL" | "LINKEDIN", "sujet", "audience", "objectif", "generate": false }`.
   - `PATCH /api/contents/:id` with the approved `{ "body" }`.
   - `POST /api/contents/:id/approve` (cover + SEO on the server).
   - `POST /api/contents/:id/publish` with `{ "channel": "WORDPRESS" }` for blog/tutorial or `{ "channel": "LINKEDIN" }` for LinkedIn posts.
3. Reply with the studio content id plus `wordpressUrl` or `linkedinPostId`.
4. If login or publish fails, keep the draft in chat, do **not** silently fall back to a PR unless the user asks.

`type` values are uppercase enums. Do not send LinkedIn posts to WordPress.
