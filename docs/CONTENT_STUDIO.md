# Content Studio — local app (React + NestJS + Postgres)

Draft blog posts, tutorials, and LinkedIn posts, then publish to WordPress or LinkedIn **without opening a PR**.

This is the product replacement for the Cursor skill → git → GitHub Action loop. The existing `scripts/publish-to-linkedin.mjs` and `scripts/sync-wordpress.mjs` workflows stay for git-based publishing until you turn those Actions off. Git merge still syncs `content/blog/` and `content/tutorials/` to WordPress; LinkedIn markdown is not synced.

## What it does

| Type | Generate | Preview | Publish |
|------|----------|---------|---------|
| Blog | Mistral, English, skill prompt | Markdown | WordPress category **Blog** |
| Tutorial | Mistral, English, skill prompt | Markdown | WordPress category **AI tutorials** |
| LinkedIn | Mistral, French, skill prompt | Feed card | LinkedIn Posts API |

Approve generates the 16:9 cover (Mistral `image_generation` tool) and SEO fields for blog/tutorial. Publish is a separate button.

## Local development

```bash
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
# set ADMIN_PASSWORD, JWT_SECRET, and optionally MISTRAL_API_KEY / WP_* / LINKEDIN_*

cd apps/api
npx prisma migrate deploy
npm run start:dev
```

In another terminal:

```bash
cd apps/web
npm run dev
```

Open http://localhost:5173 and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Railway

Create one project with four resources:

1. **PostgreSQL** plugin — provides `DATABASE_URL`
2. **Volume** attached to the API service at `/data` — set `UPLOAD_DIR=/data/uploads`
3. **API** service — root directory `apps/api`, Dockerfile builder
4. **Web** service — root directory `apps/web`, Dockerfile builder, build arg `VITE_API_URL=https://<api-public-domain>`

API env vars (see `apps/api/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `UPLOAD_DIR`, `FRONTEND_ORIGIN`, `MISTRAL_API_KEY`, WordPress, LinkedIn.

Web env: `VITE_API_URL` must be the public API origin (no trailing slash). Set `FRONTEND_ORIGIN` on the API to the public web origin.

After the studio is the source of truth, disable or guard `.github/workflows/publish-linkedin-*.yml` and `.github/workflows/sync-wordpress.yml` so a later git merge cannot double-post.

## Cursor skills fallback

If `STUDIO_API_URL`, `STUDIO_EMAIL`, and `STUDIO_PASSWORD` are set, the blog / tutorial / LinkedIn skills publish through this API instead of opening a PR. See `.cursor/skills/content-studio/SKILL.md`.
