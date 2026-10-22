# Blog Post Skill

A Cursor skill that generates long-form blog articles in English, lets you review and edit them before saving, then automatically commits and opens a pull request.

## What it does

The skill automates the entire blog post workflow:

1. **Generate** — Writes a long-form article based on a given subject
2. **Review** — Shows you the draft in chat (no file written yet)
3. **Iterate** — Allows you to request changes and see revisions
4. **Approve** — Once you say "ok", "approve", "save", "publish", "approuve", "sauvegarde", or "valide", a 16:9 cover image is generated, SEO fields are derived from the approved article, and the article is saved
5. **Publish** — Automatically creates a feature branch, commits the article and cover, pushes it, and opens a PR

## Prerequisites

- A git repository with a remote named `origin`
- (Optional, for PR automation) `gh` (GitHub CLI) installed and authenticated
  - Install: https://cli.github.com/
  - Authenticate: `gh auth login`

## How to use

### Basic usage

Simply ask the agent to generate a blog post:

```
write a blog post on [subject]
```

Or just:

```
write a blog post
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
   content/blog/YYYY-MM-DD-slug.md
   content/blog/images/YYYY-MM-DD-slug.png
5. Agent creates a feature branch, commits both files, pushes, and opens a PR
6. Agent replies with file paths, PR URL, and a recap of the SEO fields
```

### Example interaction

```
You: write a blog post on loop engineering

Agent: [shows draft in chat]

Tell me your edits, or reply ok / approve / save to publish.

You: fewer emojis and more concise

Agent: [shows revised draft]

You: approve

Agent: Article saved to content/blog/2026-08-26-loop-engineering.md
Cover: content/blog/images/2026-08-26-loop-engineering.png
SEO Analysis:
- Readability: Green (Flesch 68)
- SEO Score: Green
- Keyword density: 2.8%
- Internal linking: 2 opportunities
PR opened: https://github.com/hamed-saadallah/linkedin_content/pull/1
```

## Article structure

Each generated article includes:

- **Title** (H1) — Clear and specific to the subject
- **Lede** — Hook plus the promise of the article
- **Context / illustration** — A relevant reference or anecdote
- **Problem** — A common mistake or pitfall related to the subject
- **Development** — 2-4 H2 sections that go deeper
- **Key points** — 3-5 actionable takeaways
- **Conclusion** — One summary sentence plus an opening (question or next step)

## Output files

Articles are saved as Markdown with frontmatter. The cover is a sibling PNG:

```
content/blog/YYYY-MM-DD-slug.md
content/blog/images/YYYY-MM-DD-slug.png
```

Example:

```markdown
---
sujet: "loop engineering"
date: 2026-08-26
platform: blog
featured_image: images/2026-08-26-loop-engineering.png
seo_title: "Loop engineering: measure instead of planning"
meta_description: "Loop engineering replaces the perfect plan with short measurement cycles. How to start, which pitfalls to avoid, and five concrete actions."
image_alt: "Feedback loop between a measurement and an adjustment"
focus_keyword: "loop engineering"
seo_analysis:
  readability_score: "Green"
  seo_score: "Green"
  keyword_density: "2.8%"
  keyword_variations:
    - "measurement cycles"
    - "feedback loops"
    - "iterative design"
  internal_linking_suggestions:
    - "Development: agile methodology article"
    - "Context: rapid iteration best practices"
  word_count: 950
---

# Loop engineering: stop planning, start measuring

The real competitive advantage in engineering? It is not the perfect plan...
```

`featured_image` and `image_alt` are omitted if cover generation fails; the article PR still proceeds. SEO fields and the `seo_analysis` block are always written on approval.

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

The skill generates articles with Yoast SEO best practices in mind:

### During Generation

The agent follows Yoast guidelines to write content that naturally ranks well:

- **Keyword placement**: Focus keyword appears in the title, first 100 words, and 1-2 headers (2-3% density)
- **Readability**: Conversational tone (Flesch Reading Ease 60-70), varied sentence length, short paragraphs
- **Meta description**: Optimized 155-160 character snippet that includes the keyword naturally and compellingly
- **Heading hierarchy**: Proper H1 -> H2 -> H3 structure with one H1 per article
- **Active voice**: 80%+ active voice sentences
- **Transitions**: Natural connecting words in 30%+ of paragraphs

### After Approval

The `seo_analysis` block captures detailed SEO metrics:

- **readability_score**: Green (60-70) / Yellow (50-59 or 71-80) / Red (< 50 or > 80)
- **seo_score**: Green (well-integrated keyword, proper structure, meta description has keyword) / Yellow (minor gaps) / Red (keyword missing or poor integration)
- **keyword_density**: Exact percentage of focus keyword in the article body (target: 2-3%)
- **keyword_variations**: 2-4 synonyms and related terms that support the focus keyword naturally
- **internal_linking_suggestions**: 2-3 specific sections where internal links could fit naturally (e.g., "Development: agile methodology article")
- **word_count**: Total words in the article body (excluding frontmatter)

These fields are stored in git and available for review before merge. After merge, GitHub Actions publishes the article to WordPress.

## Git & PR automation

After you approve an article:

1. A feature branch is created: `content/blog-YYYY-MM-DD-slug`
2. The article and cover PNG are committed with message: `Add blog post: {subject}`
3. The branch is pushed to `origin`
4. A PR is opened against `master` with:
   - Title: `Blog: {subject}`
   - Summary of changes
   - A checklist for review (visual check, tone, cover image, SEO fields)

If `gh` is not installed, the file will still be saved and committed, but the PR will fail with an actionable error message.

Merging the PR to `master` stores the article in git and syncs it to WordPress (category `blog`).

## WordPress sync

After a PR is **merged into `master`**, GitHub Actions publishes changed files under `content/blog/` to WordPress via the REST API.

- **Trigger:** push to `master` affecting `content/blog/**` (also manual `workflow_dispatch`)
- **Mapping:** title <- `seo_title` (fallback `sujet`), excerpt <- `meta_description` (or `excerpt` if present), slug <- filename, body Markdown -> HTML, status `publish`
- **Featured image:** if frontmatter `featured_image` is set, the PNG is uploaded to the WordPress media library and attached as the post thumbnail
- **Category:** slug `blog` (override with secret `WP_BLOG_CATEGORY_SLUG`)
- **Idempotency:** create or update by post slug

LinkedIn posts are not synced. Shared credentials are `WP_URL`, `WP_USER`, and `WP_APP_PASSWORD`.

```bash
npm ci
npm run sync:wordpress -- content/blog/YYYY-MM-DD-slug.md
```

## File location in the repo

The skill is stored as a project skill:

```
.cursor/skills/create-blog-post/
├── SKILL.md      (skill instructions for the agent)
└── README.md     (this file)
```

This means the skill is version-controlled and shared with everyone who clones the repo.

## Customization

To modify the skill's behavior, edit `.cursor/skills/create-blog-post/SKILL.md`:

- Change the **approval keywords** (currently: `ok`, `approve`, `save`, `publish`, plus `approuve`, `sauvegarde`, `valide`)
- Modify the **article structure** (the "Prompt" section)
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

The article file will still be saved locally even if the PR fails.

### Editing a saved article

Articles are saved in `content/blog/`. You can:
- Edit the `.md` file directly
- Commit and push changes manually
- Or regenerate a new article on the same subject

## Examples

### Simple article

```
write a blog post on rust
```

### Reuse this skill in other projects

Copy `.cursor/skills/create-blog-post/` to your project's `.cursor/skills/` directory, or clone this repo and adapt it to your needs.

## Tips

- Be specific with your subject for better results
- The skill asks before generating if the subject is missing
- You can ask for multiple revisions before approving
- Articles are stored in Git, so you have full version history
- Use the PR as a review checkpoint (body, cover, and SEO fields); merge to `master` syncs the article to WordPress

---

**Learn more**: See `SKILL.md` for the detailed agent instructions.
