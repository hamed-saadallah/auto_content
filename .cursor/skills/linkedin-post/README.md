# LinkedIn Post Skill

A Cursor skill that generates high-quality LinkedIn posts in French, lets you review and edit them before saving, then automatically commits and opens a pull request.

## What it does

The skill automates the entire LinkedIn post workflow:

1. **Generate** — Writes a compelling post based on a given subject and a 16:9 cover image
2. **Preview** — Shows the draft in chat and opens a LinkedIn-like card in your browser (preview files only, under `.preview/`)
3. **Iterate** — Allows you to request text or image changes and see revisions (chat + refreshed browser preview)
4. **Approve** — Once you say "ok", "approuve", "sauvegarde", or "valide", the post and image are saved
5. **Publish** — Automatically creates a feature branch, commits both files, pushes, and opens a PR

## Prerequisites

- A git repository with a remote named `origin`
- (Optional, for PR automation) `gh` (GitHub CLI) installed and authenticated
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`

## How to use

### Basic usage

Simply ask the agent to generate a LinkedIn post:

```
génère un post linkedin sur [subject]
```

Or just:

```
génère un post linkedin
```

The agent will ask for the subject if you don't provide one.

### The workflow

```
1. Subject → Agent generates draft + 16:9 cover image
2. Agent writes .preview/draft.md (and .preview/cover.png), opens a browser preview,
   and shows the draft in chat (no content/linkedin/ file yet)
3. You review the browser card and either:
   a) Request text or image changes → Agent updates draft + preview → back to step 2
   b) Approve with: ok / approuve / sauvegarde / valide → next step
4. Agent saves content/linkedin/YYYY-MM-DD-slug.md and content/linkedin/images/YYYY-MM-DD-slug.png
5. Agent creates a feature branch, commits both files, pushes, and opens a PR
6. Agent replies with file paths + PR URL
```

### Example interaction

```
You: génère un post linkedin sur loop engineering

Agent: [shows draft in chat, opens browser preview]

Dis-moi tes corrections, ou réponds ok / approuve / sauvegarde pour publier.

You: moins d'emojis et plus concis

Agent: [shows revised draft, refreshes browser preview]

You: approuve

Agent: Post saved to content/linkedin/2026-08-05-loop-engineering.md
PR opened: https://github.com/hamed-saadallah/linkedin_content/pull/1
```

## Browser preview

After each draft (and after each revision), the agent writes gitignored files under `.preview/` and runs:

```bash
npm run preview:linkedin -- .preview/draft.md
```

That opens a local LinkedIn-like feed card in your default browser: header, “voir plus” around the first ~210 characters, optional 16:9 cover, character count (`N / 3000`), and the same validation warnings as the publisher (markdown, missing image, over limit). It is a layout mock, not a live LinkedIn render.

`.preview/` is not committed. The published `.md` is still written only after you approve.

## Post structure

Each generated post includes:

- **Hook** (accroche) — A strong statement or question to grab attention
- **Illustration** — A reference to a movie, book, quote, or anecdote
- **Problem** — A common mistake or pitfall related to the subject
- **Key points** — 3–5 actionable takeaways
- **Central message** — One powerful summary sentence
- **References** — 1–2 theoretical or cultural sources
- **Engaging question** — Open-ended question to invite discussion

## Output files

Posts are saved as Markdown with frontmatter plus an optional cover PNG:

```
content/linkedin/YYYY-MM-DD-slug.md
content/linkedin/images/YYYY-MM-DD-slug.png
```

Example:

```markdown
---
sujet: "loop engineering"
date: 2026-08-05
platform: linkedin
image: images/2026-08-05-loop-engineering.png
image_alt: "Boucle de mesure et d'ajustement sur un tableau d'ingénierie"
---

Le vrai avantage compétitif en engineering ? Ce n'est pas le plan parfait...
```

LinkedIn does not render Markdown or Unicode “bold”. Formatting is structural only: short paragraphs, blank lines, and `→` bullets.

If image generation fails, the `.md` is still saved without `image` / `image_alt`.

## Git & PR automation

After you approve a post:

1. A feature branch is created: `content/linkedin-YYYY-MM-DD-slug`
2. The post `.md` and its PNG (if any) are committed with message: `Add LinkedIn post: {subject}`
3. The branch is pushed to `origin`
4. A PR is opened against `master` with:
   - Title: `LinkedIn: {subject}`
   - Summary of changes
   - A checklist for review (visual check, image, tone, no markdown, ≤ 3000 chars)

If PR creation fails, the file will still be saved and committed with an actionable error message.

## LinkedIn publishing (after merge)

After a PR is **merged into `master`**, GitHub Actions publishes changed files under `content/linkedin/` to LinkedIn via the **Posts API** (`POST /rest/posts`). If the markdown has an `image` field, the script uploads the PNG through the Images API first, then attaches `content.media` to the post.

- **Trigger:** push to `master` affecting `content/linkedin/**` (also manual `workflow_dispatch`)
- **Script:** `scripts/publish-to-linkedin.mjs`
- **Workflow:** `.github/workflows/publish-linkedin-post.yml`
- **Success:** HTTP 201 with post ID in `x-restli-id` response header

### Required GitHub secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `LINKEDIN_ACCESS_TOKEN` | OAuth token with `w_member_social` scope |
| `LINKEDIN_PERSON_URN` | Profile URN (`urn:li:person:<id>`) |

Optional env var: `LINKEDIN_API_VERSION` (defaults to `202608`).

Local dry-run (no credentials):

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

Setup guide: `docs/LINKEDIN_API_SETUP.md`

Posts are stored in git only. There is no WordPress or other CMS sync.

## File location in the repo

The skill is stored as a project skill:

```
.cursor/skills/linkedin-post/
├── SKILL.md      (skill instructions for the agent)
└── README.md     (this file)
```

This means the skill is version-controlled and shared with everyone who clones the repo.

For posts in **Bernard's** voice (calm technical observer, fixed 4-beat
structure, 220–280 words), use `.cursor/skills/linkedin-post-bernard/` instead.

To **explain a precise concept** with a diagram/schema and a table or code
snippet, use `.cursor/skills/linkedin-explain-concept/` instead.

To **showcase a product/project** (stack, features, link + CTA), use
`.cursor/skills/linkedin-product-showcase/` instead.

## Customization

To modify the skill's behavior, edit `.cursor/skills/linkedin-post/SKILL.md`:

- Change the **approval keywords** (currently: `ok`, `approuve`, `sauvegarde`, `valide`)
- Modify the **post structure** (the "Prompt" section)
- Adjust the **branch naming** or **commit message format**
- Update the **PR base branch** (currently: `master`)

## Troubleshooting

### "gh: not found"

Install GitHub CLI from https://cli.github.com/, then authenticate:

```bash
gh auth login
```

After installing, close and reopen your terminal in Cursor.

### PR creation fails

Make sure:
- You have a remote named `origin`
- `gh` is authenticated: `gh auth status`
- The local `master` branch is pushed to `origin/master`

The post file will still be saved locally even if the PR fails.

### Editing a saved post

Posts are saved in `content/linkedin/`. You can:
- Edit the `.md` file directly
- Commit and push changes manually
- Or regenerate a new post on the same subject

## Examples

### Simple post

```
génère un post linkedin sur rust
```

### Reuse this skill in other projects

Copy `.cursor/skills/linkedin-post/` to your project's `.cursor/skills/` directory, or clone this repo and adapt it to your needs.

## Tips

- Be specific with your subject for better results
- The skill asks before generating if the subject is missing
- You can ask for multiple revisions before approving; the browser preview refreshes each time
- Check the “voir plus” cutoff and character count in the preview before you approve
- Posts are stored in Git, so you have full version history
- Use the PR as a review checkpoint; merge to `master` publishes the post to LinkedIn and keeps the file in git

---

**Learn more**: See `SKILL.md` for the detailed agent instructions.
