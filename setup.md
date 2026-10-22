# Setup and run

This repository is a **content pipeline** for LinkedIn, blog articles, and tutorials. Cursor skills draft the content; git + GitHub Actions publish it. An optional **Content Studio** app (React + NestJS + Postgres) can generate, preview, and publish without opening a pull request.

**Colleagues with Cursor:** you do not start Nest, React, or Docker to write content. Open this folder in Cursor and talk to **Agent** chat. Full walkthrough: [Use this project from Cursor chat](#use-this-project-from-cursor-chat). Skill details: [`feature.md`](./feature.md).

Use the rest of this file to install Node scripts, env vars, Content Studio, and GitHub publishing credentials.

## Use this project from Cursor chat

The product for a teammate is the **Agent chat**, not a local website. Skills live in `.cursor/skills/` and load automatically when this directory is the Cursor workspace.

### 1. Open the folder (not a parent folder)

1. Install [Cursor](https://cursor.com) and sign in.
2. **File → Open Folder** (macOS: **File → Open…**) and pick **this** project root — the directory that contains `.cursor/skills/` and `package.json`.
3. Trust the workspace if Cursor asks.
4. In the integrated terminal (from that same root):

```bash
npm ci
```

That is enough for drafts, LinkedIn browser previews, and carousel PDFs. Skip Content Studio unless you want the React UI.

If you received a zip or a copied directory, open that folder the same way. Drafting still works. Opening a GitHub PR needs a git remote named `origin` and push access (see step 5).

### 2. Open Agent chat, not Ask

Skills write files, run `npm` preview scripts, generate 16:9 covers, commit, and open PRs. That only works in **Agent**.

- Open Agent chat (`Cmd+L` / `Ctrl+L`, or the Agent panel).
- Switch the mode to **Agent** if the input shows Ask / Plan / something read-only.
- Allow command and file-write approvals when the agent asks (preview scripts, git, image generation).

Confirm skills loaded: sidebar **Customize → Skills**. You should see project skills such as `linkedin-post`, `linkedin-post-bernard`, `create-blog-post`, `create-tutorial-for-blog`, `create-linkedin-carousel`, `linkedin-explain-concept`, `linkedin-product-showcase`, and `content-studio`.

### 3. Type in chat (or type `/`)

You can speak normally. Cursor matches your request to a skill from the skill `description`. Examples:

```
génère un post linkedin sur le RAG
```

```
write a blog post on loop engineering
```

```
post Bernard : l'agent a résumé un outil qu'il n'avait pas appelé
```

```
explique debounce vs throttle sur LinkedIn
```

```
create a linkedin carousel about multi-agent orchestration
```

```
write a tutorial on setting up a vector index
```

To force one skill, type `/` in the Agent input and pick it (`/linkedin-post`, `/linkedin-post-bernard`, …). Enter attaches it to **that message**. **Option+Enter** (macOS) or **Alt+Enter** (Windows) keeps it as a Custom Mode for the whole session.

If a required field is missing (language, subject, Bernard’s concrete observation, …), the agent asks before writing. Answer in the same thread.

### 4. Review, then approve — files are not saved before that

| You do | Agent does |
|---|---|
| Wait for the draft in chat | LinkedIn skills also open a local feed-card preview (`.preview/`, gitignored) |
| Ask for edits (“shorter”, “fewer emojis”, “new cover”) | Updates the chat draft (and preview). Still no `content/` file |
| Approve with `ok`, `approve`, `save`, `publish`, `approuve`, `sauvegarde`, or `valide` | Writes markdown + images/PDF, then git/PR (or studio publish) |

Do **not** say `ok` if you only wanted a format check. For Bernard text-only / format validation, say `text only` or `validate format`. To discard a test: `don't publish` / `ne publie pas`.

What each skill writes, and which prompt to use: [`feature.md`](./feature.md).

### 5. What “publish” means from chat

Approving in chat does **not** post to LinkedIn or WordPress by itself.

| Setup | After you approve in chat |
|---|---|
| Default (this git repo, remote `origin`) | Agent creates a branch, commits, pushes, opens a PR to `master`. **You merge the PR.** GitHub Actions then publish. |
| `STUDIO_API_URL` + `STUDIO_EMAIL` + `STUDIO_PASSWORD` in the environment | Agent publishes through Content Studio and does **not** open a PR. |
| Folder copy with no `origin` | Agent still saves files under `content/`. PR/push is skipped or fails with a fix-it message. Copy the markdown out, or add a remote. |

Repo secrets (`LINKEDIN_ACCESS_TOKEN`, WordPress `WP_*`) live on GitHub, not in a colleague’s Cursor chat. They do not need a LinkedIn token on their laptop to **draft**. They need merge rights (or a reviewer who merges) for the post to go live.

### 6. You do not need to “run the app”

| Want | Start this |
|---|---|
| Write content from Cursor chat | Nothing besides Agent + `npm ci` |
| LinkedIn-like preview in a browser | The skill runs `npm run preview:linkedin` / `preview:carousel` for you |
| Content Studio UI in a browser | Docker Postgres + Nest + Vite — [§4](#4-run-content-studio-locally) |
| LinkedIn Text Beautifier (`index.html`) | `python3 -m http.server 8000` — optional, not the skill pipeline |

### Cursor chat troubleshooting

| Symptom | Fix |
|---|---|
| Skills do not appear under Customize → Skills | The opened folder is not the repo root (no `.cursor/skills/`). Re-open the directory that contains that folder. |
| Agent only talks, never writes or runs commands | You are in **Ask** (or another read-only mode). Switch to **Agent**. |
| Agent ignores the Bernard / carousel / blog format | Type `/` and attach the skill, or start a new Agent chat and name the skill in the first message. |
| `npm run preview:linkedin` fails | Run `npm ci` at the repo root, then retry. |
| Cover image missing | Allow image generation when the agent requests it; a failed cover does not block saving the markdown. |
| PR is not created | Need git, remote `origin`, and push permission. Optional: `gh auth login`. The `.md` is still on disk. |
| Post never appears on LinkedIn | The PR must be **merged to `master`**, and GitHub secrets must be set. Chat approval only opens the PR. |

## What you can run

| Surface | Purpose | Default URL |
|---|---|---|
| Root Node scripts | Preview drafts, dry-run publish, WordPress sync, tests | CLI |
| LinkedIn Text Beautifier | Static formatter in `index.html` | http://localhost:8000/ |
| Content Studio web | Draft / approve / publish UI | http://localhost:5173 |
| Content Studio API | NestJS backend for the studio | http://localhost:3001 |
| Postgres (Docker) | Studio database | localhost:5432 |

## Prerequisites

- **Git** with a remote named `origin`
- **Node.js**
  - **20.x** for root scripts and GitHub Actions publishers (`npm ci` at the repo root)
  - **22.x** for Content Studio (`apps/api` and `apps/web`)
- **npm** (lockfiles are committed; use `npm ci`)
- **Docker** (only if you run Content Studio locally — Postgres 16)
- **GitHub CLI** (`gh`) — optional, only if you want skills to open PRs from your machine
- **Python 3** — optional, only for the static file server that serves `index.html`

## 1. Clone and install

```bash
git clone https://github.com/hamed-saadallah/linkedin_content.git
cd linkedin_content
npm ci
```

That installs the root dependencies used by preview, PDF export, and publish scripts (`gray-matter`, `marked`, `puppeteer`).

To also run Content Studio:

```bash
cd apps/api && npm ci && cd ../web && npm ci && cd ../..
```

## 2. Environment files

### Root (LinkedIn CLI + GitHub publishers)

```bash
cp .env.example .env
```

| Variable | Required | Role |
|---|---|---|
| `LINKEDIN_ACCESS_TOKEN` | Yes, to post | OAuth token with `openid`, `profile`, `email`, `w_member_social` |
| `LINKEDIN_PERSON_URN` | No | `urn:li:person:…` from `/v2/userinfo`. Scripts fetch it if omitted. |
| `LINKEDIN_VERSION` | No | Posts API version (`YYYYMM`). Defaults to `202608`. |

Resolve your person URN after the token is set:

```bash
npm run get-profile
```

Do **not** call `/v2/me`. OpenID apps return `me.GET.NO_VERSION`. Full token walkthrough: [`docs/LINKEDIN_API_SETUP.md`](./docs/LINKEDIN_API_SETUP.md).

### Content Studio API

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Role |
|---|---|
| `DATABASE_URL` | Postgres URL (local default: `postgresql://studio:studio@localhost:5432/studio`) |
| `PORT` | API port (default `3001`) |
| `JWT_SECRET` | Sign-in tokens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Studio login |
| `UPLOAD_DIR` | Cover image uploads (default `./data/uploads`) |
| `FRONTEND_ORIGIN` | Web origin allowed by CORS (local: `http://localhost:5173`) |
| `MISTRAL_API_KEY` | Text + 16:9 covers in the studio |
| `WP_*` | WordPress REST credentials for blog/tutorial publish |
| `LINKEDIN_*` | Posts API credentials for LinkedIn publish |

### Content Studio web

```bash
cp apps/web/.env.example apps/web/.env
```

Leave `VITE_API_URL` empty locally. Vite proxies `/api` and `/uploads` to `http://127.0.0.1:3001`. For production builds, set it to the public API origin with **no trailing slash**.

### Cursor skills → studio (no PR)

If these three are set in the agent environment, blog / tutorial / LinkedIn skills publish through the studio API instead of opening a GitHub PR:

| Variable | Role |
|---|---|
| `STUDIO_API_URL` | Public API origin, no trailing slash |
| `STUDIO_EMAIL` | Same as `ADMIN_EMAIL` |
| `STUDIO_PASSWORD` | Same as `ADMIN_PASSWORD` |

## 3. Run the git / skill pipeline (no studio)

This is the default loop: Cursor skill → review in chat (and browser preview for LinkedIn) → approve → PR → merge → GitHub Action.

### Preview a LinkedIn post

```bash
npm run preview:linkedin -- .preview/draft.md
```

`--no-open` writes HTML without launching a browser. `--out <file>` overrides the HTML path.

### Preview a carousel

```bash
npm run preview:carousel -- .preview/carousel-draft.md
```

### Build a carousel PDF

```bash
npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md
```

### Dry-run publish (no API call)

```bash
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
npm run publish:carousel -- --dry-run content/linkedin/carousel/YYYY-MM-DD-slug.md
```

### Sync a blog or tutorial to WordPress (needs `WP_*` secrets)

```bash
npm run sync:wordpress -- content/blog/YYYY-MM-DD-slug.md
npm run sync:wordpress -- content/tutorials/YYYY-MM-DD-slug.md
```

### Static LinkedIn Text Beautifier

From the repo root:

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

Open http://localhost:8000/ (`index.html`). This is a local formatter, not the publisher.

Cursor Cloud environments start this server automatically (see `.cursor/environment.json`).

## 4. Run Content Studio locally

```bash
docker compose up -d postgres

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

Equivalent from the repo root:

```bash
npm run dev:api
npm run dev:web
```

More detail: [`docs/CONTENT_STUDIO.md`](./docs/CONTENT_STUDIO.md).

## 5. GitHub Actions (publish on merge)

Merging to `master` is what publishes git-based content.

| Workflow | Trigger paths | Destination |
|---|---|---|
| `publish-linkedin-post.yml` | `content/linkedin/**` | LinkedIn Posts API (text or image) |
| `publish-linkedin-carousel.yml` | `content/linkedin/carousel/**` | LinkedIn Documents API + Posts API |
| `sync-wordpress.yml` | `content/blog/**`, `content/tutorials/**` | WordPress REST API |
| `test.yml` | PRs and pushes to `master` | Root script tests + studio API tests + web build |

Repository **secrets** (Settings → Secrets and variables → Actions):

| Secret | Used by |
|---|---|
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn post + carousel |
| `LINKEDIN_PERSON_URN` | Optional; resolved from `/v2/userinfo` if omitted |
| `WP_URL` | WordPress sync |
| `WP_USER` | WordPress sync |
| `WP_APP_PASSWORD` | WordPress sync |
| `WP_BLOG_CATEGORY_SLUG` | Optional (default category slug `blog`) |
| `WP_TUTORIAL_CATEGORY_SLUG` | Optional (default category slug `tutorials`) |

Optional repository **variable**: `LINKEDIN_API_VERSION` (default `202608`).

If Content Studio becomes the source of truth, disable or guard the LinkedIn and WordPress workflows so a later git merge cannot double-post.

## 6. Tests

```bash
npm test                 # root scripts (Node test runner)
npm run test:api         # NestJS / Jest
npm run test:studio      # API tests + web production build
```

CI uses Node 20 for root tests and Node 22 for `apps/api` and `apps/web`.

## 7. Railway (Content Studio production)

One project, four resources:

1. **PostgreSQL** plugin → `DATABASE_URL`
2. **Volume** on the API at `/data` → `UPLOAD_DIR=/data/uploads`
3. **API** service — root directory `apps/api`, Dockerfile builder
4. **Web** service — root directory `apps/web`, Dockerfile builder, build arg `VITE_API_URL=https://<api-public-domain>`

Set API env from `apps/api/.env.example`. Set `FRONTEND_ORIGIN` to the public web origin.

## Repo layout

```
content/blog/                 English articles + images/ (WordPress category blog)
content/tutorials/            English how-tos + images/ (WordPress category tutorials)
content/linkedin/             LinkedIn posts + images/
content/linkedin/carousel/    Carousel markdown, images/, pdfs/
.cursor/skills/               Cursor skills (see feature.md)
apps/api/                     NestJS Content Studio API
apps/web/                     React Content Studio UI
scripts/                      Preview, publish, WordPress sync
docs/                         LinkedIn API + studio guides
index.html                    LinkedIn Text Beautifier
```

`.preview/` is local draft output. It is gitignored and must never be committed.

## Troubleshooting (short)

| Symptom | What to check |
|---|---|
| `LINKEDIN_ACCESS_TOKEN not found` | Root `.env` exists and is loaded from the repo root |
| 401 / 403 on LinkedIn | Token expired (~1 hour) or missing `w_member_social` — re-authorize, then update the secret |
| `me.GET.NO_VERSION` | You called `/v2/me`. Use `npm run get-profile` / `/v2/userinfo` |
| 426 Version not active | Bump `LINKEDIN_API_VERSION` to a live `YYYYMM` (currently `202608`) |
| `gh: not found` | Install https://cli.github.com/ then `gh auth login`. The `.md` is still saved |
| Studio cannot log in | `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/api/.env`, API on `:3001`, web on `:5173` |
| Studio web cannot reach API | Local: leave `VITE_API_URL` empty. Production: set it to the public API origin |
| Skills missing / Agent will not write | See [Cursor chat troubleshooting](#cursor-chat-troubleshooting) |

Longer LinkedIn debugging: [`docs/LINKEDIN_API_SETUP.md`](./docs/LINKEDIN_API_SETUP.md).
