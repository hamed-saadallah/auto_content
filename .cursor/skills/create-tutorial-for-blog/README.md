# Tutorial Skill

A Cursor skill that generates English how-to tutorials for a subject or tool, lets you review and edit them before saving, then automatically commits and opens a pull request.

## What it does

The skill automates the entire tutorial workflow:

1. **Generate** — Writes a how-to tutorial based on a given subject or tool
2. **Review** — Shows you the draft in chat (no file written yet)
3. **Iterate** — Allows you to request changes and see revisions
4. **Approve** — Once you say "ok", "approve", "save", "publish", "approuve", "sauvegarde", or "valide", a 16:9 cover image is generated, SEO fields are derived from the approved tutorial, and the tutorial is saved
5. **Publish** — Automatically creates a feature branch, commits the tutorial and cover, pushes it, and opens a PR

## Prerequisites

- A git repository with a remote named `origin`
- (Optional, for PR automation) `gh` (GitHub CLI) installed and authenticated
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`

## How to use

### Basic usage

Simply ask the agent to generate a tutorial:

```
write a tutorial on [subject]
```

Or:

```
create a tutorial for [tool]
```

Or just:

```
write a tutorial
```

The agent will ask for the subject if you don't provide one.

### The workflow

```
1. Subject -> Agent generates draft
2. Agent shows draft in chat (no file saved yet)
3. You review and either:
   a) Request changes -> Agent updates draft -> back to step 2
   b) Approve with: ok / approve / save / publish -> next step
4. Agent generates a 16:9 cover and SEO fields, then saves:
   content/tutorials/YYYY-MM-DD-slug.md
   content/tutorials/images/YYYY-MM-DD-slug.png
5. Agent creates a feature branch, commits both files, pushes, and opens a PR
6. Agent replies with file paths, PR URL, and a recap of the SEO fields
```

### Example interaction

```
You: write a tutorial on setting up a vector index

Agent: [shows draft in chat]

Tell me your edits, or reply ok / approve / save to publish.

You: add a troubleshooting section for empty search results

Agent: [shows revised draft]

You: approve

Agent: Tutorial saved to content/tutorials/2026-08-26-setting-up-a-vector-index.md
Cover: content/tutorials/images/2026-08-26-setting-up-a-vector-index.png
SEO Analysis:
- Readability: Green (Flesch 68)
- SEO Score: Green
- Keyword density: 2.8%
- Internal linking: 2 opportunities
PR opened: https://github.com/hamed-saadallah/linkedin_content/pull/1
```

## Tutorial structure

Each generated tutorial includes:

- **Title** (H1) — A specific how-to for the subject or tool
- **Outcome** — What the reader will have working by the end
- **Prerequisites** — Tools, accounts, versions, or knowledge required
- **Steps** — Numbered sections with one action per step, plus expected results
- **Pitfalls / troubleshooting** — 2-4 common mistakes with a concrete fix
- **Recap** — What was built, plus one next step

Unlike blog articles, tutorials allow fenced code blocks and `inline code`.

## Output files

Tutorials are saved as Markdown with frontmatter. The cover is a sibling PNG:

```
content/tutorials/YYYY-MM-DD-slug.md
content/tutorials/images/YYYY-MM-DD-slug.png
```

Example:

```markdown
---
sujet: "setting up a vector index"
date: 2026-08-26
platform: tutorial
featured_image: images/2026-08-26-setting-up-a-vector-index.png
seo_title: "Set up a vector index for semantic search"
meta_description: "Build a small vector index from documents, run a first query, and check the results. Commands, expected output, and four common pitfalls."
image_alt: "Abstract network of document nodes connected to a search query"
focus_keyword: "vector index"
seo_analysis:
  readability_score: "Green"
  seo_score: "Green"
  keyword_density: "2.9%"
  keyword_variations:
    - "semantic search"
    - "embedding similarity"
    - "vector database"
  internal_linking_suggestions:
    - "Prerequisites: advanced Python tutorial"
    - "Steps: machine learning basics guide"
  word_count: 1850
---

# How to set up a vector index for semantic search

By the end of this tutorial you will have...
```

`featured_image` and `image_alt` are omitted if cover generation fails; the tutorial PR still proceeds. SEO fields and the `seo_analysis` block are always written on approval.

Keep the frontmatter key `sujet` (do not rename it to `subject`). All fields stay in git.

| Frontmatter | Role |
|---|---|
| `seo_title` | Public post title (~50-60 chars) |
| `meta_description` | Search/archive snippet (~155-160 chars) |
| `image_alt` | Cover accessibility + image SEO |
| `focus_keyword` | Primary keyword for SEO review |
| `seo_analysis` | Yoast-style SEO metrics (readability, density, etc.) |
| `sujet` | Editorial topic (skill + PR copy) |

SEO is generated **only on approval**, not shown in the draft chat. You can still edit the fields in the PR before merge.

## SEO and Yoast Integration

The skill generates tutorials with Yoast SEO best practices in mind:

### During Generation

The agent follows Yoast guidelines to write tutorials that naturally rank well:

- **Keyword placement**: Focus keyword appears in the title, first 100 words, and 1-2 headers/steps (2-3% density)
- **Readability**: Conversational, clear tone (Flesch Reading Ease 60-70), varied sentence length, short paragraphs, scannable with bold terms
- **Meta description**: Optimized 155-160 character snippet that includes the keyword naturally and describes what reader will learn
- **Heading hierarchy**: Proper H1 (title only) -> H2 -> H3 structure. Only one H1 per tutorial.
- **Active voice**: 80%+ active voice sentences, especially in step instructions ("Run this command" not "This command is run")
- **Internal linking opportunities**: Note 2-3 specific steps where internal links could fit naturally

### After Approval

The `seo_analysis` block captures detailed SEO metrics:

- **readability_score**: Green (60-70) / Yellow (50-59 or 71-80) / Red (< 50 or > 80)
- **seo_score**: Green (well-integrated keyword, proper structure, meta description has keyword) / Yellow (minor gaps) / Red (keyword missing or poor integration)
- **keyword_density**: Exact percentage of focus keyword in the tutorial body (target: 2-3%)
- **keyword_variations**: 2-4 synonyms and related terms that support the focus keyword naturally
- **internal_linking_suggestions**: 2-3 specific steps where internal links could fit naturally (e.g., "Prerequisites: advanced Python tutorial")
- **word_count**: Total words in the tutorial body (excluding frontmatter)

These fields are stored in git and available for review before merge. After merge, GitHub Actions publishes the tutorial to WordPress.

## Git & PR automation

After you approve a tutorial:

1. A feature branch is created: `content/tutorial-YYYY-MM-DD-slug`
2. The tutorial and cover PNG are committed with message: `Add tutorial: {subject}`
3. The branch is pushed to `origin`
4. A PR is opened against `master` with:
   - Title: `Tutorial: {subject}`
   - Summary of changes
   - A checklist for review (steps runnable, tone, cover image, SEO fields)

If `gh` is not installed, the file will still be saved and committed, but the PR will fail with an actionable error message.

Merging the PR to `master` stores the tutorial in git and syncs it to WordPress (category `tutorials`).

## WordPress sync

After a PR is **merged into `master`**, GitHub Actions publishes changed files under `content/tutorials/` to WordPress via the REST API.

- **Trigger:** push to `master` affecting `content/tutorials/**` (also manual `workflow_dispatch`)
- **Mapping:** title <- `seo_title` (fallback `sujet`), excerpt <- `meta_description` (or `excerpt` if present), slug <- filename, body Markdown -> HTML, status `publish`
- **Featured image:** if frontmatter `featured_image` is set, the PNG is uploaded to the WordPress media library and attached as the post thumbnail
- **Category:** slug `tutorials` (override with secret `WP_TUTORIAL_CATEGORY_SLUG`)
- **Idempotency:** create or update by post slug

LinkedIn posts are not synced. Shared credentials are `WP_URL`, `WP_USER`, and `WP_APP_PASSWORD`.

```bash
npm ci
npm run sync:wordpress -- content/tutorials/YYYY-MM-DD-slug.md
```

## File location in the repo

The skill is stored as a project skill:

```
.cursor/skills/create-tutorial-for-blog/
├── SKILL.md      (skill instructions for the agent)
└── README.md     (this file)
```

This means the skill is version-controlled and shared with everyone who clones the repo.

## Customization

To modify the skill's behavior, edit `.cursor/skills/create-tutorial-for-blog/SKILL.md`:

- Change the **approval keywords** (currently: `ok`, `approve`, `save`, `publish`, plus `approuve`, `sauvegarde`, `valide`)
- Modify the **tutorial structure** (the "Prompt" section)
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

The tutorial file will still be saved locally even if the PR fails.

### Editing a saved tutorial

Tutorials are saved in `content/tutorials/`. You can:
- Edit the `.md` file directly
- Commit and push changes manually
- Or regenerate a new tutorial on the same subject

## Examples

### Simple tutorial

```
write a tutorial on rust
```

### Tutorial for a tool

```
create a tutorial for Cursor skills
```

### Reuse this skill in other projects

Copy `.cursor/skills/create-tutorial-for-blog/` to your project's `.cursor/skills/` directory, or clone this repo and adapt it to your needs.

## Tips

- Be specific with your subject or tool for better results
- The skill asks before generating if the subject is missing
- You can ask for multiple revisions before approving
- Tutorials are stored in Git, so you have full version history
- Use the PR as a review checkpoint (steps, cover, and SEO fields); merge to `master` syncs the tutorial to WordPress

---

**Learn more**: See `SKILL.md` for the detailed agent instructions.
