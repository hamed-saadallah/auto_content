# LinkedIn API Setup Guide

This guide explains how to set up LinkedIn API credentials for the auto-publish workflow.

## Overview

Publishing uses the LinkedIn **Posts API** (`POST https://api.linkedin.com/rest/posts`). If the markdown frontmatter includes `image`, the script uploads the file via the **Images API** first, then attaches `content.media` to the post. The legacy Share API (`/shares`) and UGC Posts API (`/v2/ugcPosts`) are deprecated and may return 403 errors for modern apps.

Required request headers:

- `Authorization: Bearer <token>`
- `X-Restli-Protocol-Version: 2.0.0`
- `LinkedIn-Version: 202608` (or newer monthly version; `202508` was sunset on 2026-08-17)
- `Content-Type: application/json`

## Step 1: Register a LinkedIn App

1. Visit [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in the app details:
   - **App name**: "LinkedIn Post Publisher" (or your preferred name)
   - **LinkedIn Page**: Select your personal profile or company page
   - **App logo**: Upload a logo (optional)
   - **Legal agreement**: Check the box and accept terms

4. Once created, you'll be taken to your app's settings page

## Step 2: Get Your Credentials

In your app settings, find the **Auth** tab:

1. **Client ID**: Copy from the "Client ID" field
2. **Client Secret**: Copy from the "Client secret" field (keep this secret!)

### Get Access Token

LinkedIn's OAuth flow requires user authorization. Here are two approaches:

#### Option A: Manual Token Generation (Simpler, short-lived)

1. In the **Auth** tab, under "Authorized redirect URLs", add: `http://localhost:3000/callback`
2. Request products **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
3. Use this authorization URL (replace CLIENT_ID). The token must include these scopes — enabling them on the app is not enough:
   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&scope=openid%20profile%20email%20w_member_social
   ```
4. Visit the URL, authorize your app
5. You'll be redirected to `localhost:3000/callback?code=YOUR_CODE`
6. Copy the code and exchange it for an access token using this cURL command:
   ```bash
   curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=YOUR_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=http://localhost:3000/callback"
   ```
7. Copy the `access_token` from the response

#### Option B: Using a Token Service (More robust)

For production, consider using a LinkedIn token refresh service or storing a refresh token. The manual approach above generates short-lived tokens (typically 3600 seconds).

## Step 3: Get Your LinkedIn Person URN

Your Person URN identifies your LinkedIn profile. It **must** match `urn:li:person:<numeric_id>`.

1. Visit your LinkedIn profile
2. Open browser dev tools (F12)
3. Go to **Network** tab
4. Reload the page
5. Search for a request to LinkedIn's API
6. Look for a response containing `"id":"123456789"`
7. Your URN is: `urn:li:person:123456789`

Alternatively, call OpenID userinfo (do **not** use `/v2/me` — that needs `r_liteprofile` and returns `me.GET.NO_VERSION` on OpenID apps):

```bash
curl -X GET https://api.linkedin.com/v2/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Use the `sub` field: `urn:li:person:SUB_VALUE`. Local shortcut: `npm run get-profile` after setting `LINKEDIN_ACCESS_TOKEN` in `.env`.

This secret is optional. If `LINKEDIN_PERSON_URN` is unset, the publish script resolves it from `/v2/userinfo`.

## Step 4: Add Secrets to GitHub

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add each:

| Secret Name | Value |
|-------------|-------|
| `LINKEDIN_ACCESS_TOKEN` | Access token with `openid`, `profile`, `email`, `w_member_social` |
| `LINKEDIN_PERSON_URN` | Optional. `urn:li:person:...` from `/v2/userinfo` `sub`. Resolved automatically if omitted. |

Optional repository **variable** (Settings → Secrets and variables → Actions → Variables):

| Name | Value |
|------|-------|
| `LINKEDIN_API_VERSION` | Posts API version `YYYYMM` (default `202608`) |

## Step 5: Test the Setup

### Dry-run locally (no API credentials needed)

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

This validates frontmatter, character limits, optional image path/`image_alt`, and payload shape without calling LinkedIn.

### End-to-end via GitHub Actions

Once secrets are added, create a new LinkedIn post via the skill and merge the PR. The workflow should:

1. Detect the new `.md` file in `content/linkedin/`
2. Authenticate with LinkedIn
3. If `image` is set: initialize an Images API upload, PUT the binary, then create the post with `content.media`
4. Otherwise create a text-only post

Check the workflow run in **Actions** tab to verify success or troubleshoot errors.

## Troubleshooting

### 403 Forbidden (most common issue)

**Typical symptoms:**
- GitHub Actions shows: `LinkedIn API error (403): 403` (no error details)
- Posting fails consistently with this status code

**Root causes (in order of likelihood):**

1. **Access token is expired** (most common)
   - LinkedIn access tokens are short-lived (~1 hour)
   - Generate a new token following Step 2 (Get Access Token) above
   - Update the `LINKEDIN_ACCESS_TOKEN` secret in GitHub

2. **Token missing required scope `w_member_social`**
   - This scope is required for posting to personal profiles
   - Verify in your LinkedIn app dashboard that the scope is requested
   - Regenerate a new token with the correct scope

3. **LinkedIn internal cache** (less common)
   - After updating token or scopes, wait 5+ minutes for LinkedIn to clear its cache
   - Then retry publishing

4. **Invalid `LINKEDIN_PERSON_URN` format**
   - Must be exactly: `urn:li:person:<numeric_id>`
   - Verify in GitHub Secrets → `LINKEDIN_PERSON_URN`

**How to fix:**
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Delete the old `LINKEDIN_ACCESS_TOKEN` secret
3. Generate a new access token (follow Step 2 instructions above)
4. Create a new `LINKEDIN_ACCESS_TOKEN` secret with the fresh token
5. Try publishing again (merge a LinkedIn post PR or manually trigger workflow)

### 426 Version not active
- The `LinkedIn-Version` header points to a sunset API release (e.g. `202508` after 2026-08-17)
- Update `LINKEDIN_API_VERSION` in the workflow and/or repository variable to a supported version (currently `202608`)

### 401 Unauthorized
- Token has expired or is invalid (same as 403, but LinkedIn returns 401)
- **Solution:** Regenerate a new access token and update GitHub secret

### 403 Forbidden / `me.GET.NO_VERSION`
- `/v2/me` is the wrong endpoint for OpenID apps. Publishing uses `GET /v2/userinfo` then `POST /rest/posts`.
- The token must include `w_member_social`. Re-authorize after adding the scope so it is on the token, not only on the app.
- Check your app products: Sign In with LinkedIn using OpenID Connect + Share on LinkedIn.

### 400 Missing field
- Posts API requires `distribution.feedDistribution`, `distribution.targetEntities`, and `distribution.thirdPartyDistributionChannels`
- `visibility` must be the string `"PUBLIC"`, not a nested object

### 400 Invalid URN
- `LINKEDIN_PERSON_URN` must be `urn:li:person:<id>` (OpenID `sub` may be alphanumeric)

### Post Content Rejected
- LinkedIn may reject posts with certain content patterns
- Ensure posts follow LinkedIn's content policy
- Remove Markdown formatting (`**bold**`, `# headings`) — the publish script validates this before calling the API. LinkedIn does not render Markdown or Unicode “bold”; use line breaks and `→` bullets only.

## Debugging

### Detailed error logging

The publishing script now includes enhanced debugging in GitHub Actions logs:

1. Check the "Publish to LinkedIn" step in your workflow run
2. Look for:
   - `Request headers (sanitized)` — shows API version, auth status
   - `Response status` — HTTP status code
   - `Error details` — full error response from LinkedIn (if available)

### Local dry-run validation

Test your post without making API calls:

```bash
npm ci
npm run publish:linkedin -- --dry-run content/linkedin/YYYY-MM-DD-slug.md
```

This validates:
- Frontmatter (sujet, date, platform)
- Character limits (≤ 3000)
- No forbidden Markdown formatting
- Optional `image` path (`.png` / `.jpg` / `.gif`) and `image_alt`
- Payload matches LinkedIn API schema (text-only, or `content.media` with a dry-run image URN)

### Image posts

When frontmatter includes `image: images/YYYY-MM-DD-slug.png`, publishing:

1. `POST https://api.linkedin.com/rest/images?action=initializeUpload` with `{ "initializeUploadRequest": { "owner": "<person URN>" } }`
2. `PUT` the file bytes to the returned `uploadUrl` (`Authorization` + `Content-Type` only — no `LinkedIn-Version`)
3. `POST /rest/posts` with `content.media.id` (`urn:li:image:...`) and `content.media.altText`

Do not `GET /rest/images` to poll status: tokens with only `w_member_social` cannot read images. The same token already used for text posts is enough to upload.

Supported files: JPG, PNG, GIF. `image_alt` is required when `image` is set (API max 4086 characters; keep it under 120). Posts without `image` stay text-only.

## LinkedIn carousel (document posts)

Carousels live under `content/linkedin/carousel/` and publish as **document posts** (swipeable PDF).

### Local commands

```bash
# Swipeable browser preview
npm run preview:carousel -- .preview/carousel-draft.md

# Build PDF from saved carousel markdown
npm run build:carousel-pdf -- content/linkedin/carousel/YYYY-MM-DD-slug.md

# Validate payload without API calls
npm run publish:carousel -- --dry-run content/linkedin/carousel/YYYY-MM-DD-slug.md
```

### Publish flow (GitHub Actions)

On merge to `master`, the **Publish LinkedIn Carousel** workflow:

1. Parses the carousel `.md` (slides in frontmatter, commentary in body)
2. `POST https://api.linkedin.com/rest/documents?action=initializeUpload`
3. `PUT` the committed PDF to the returned `uploadUrl`
4. Polls `GET /rest/documents/{urn}` until `status: AVAILABLE`
5. `POST /rest/posts` with `content.media.id` set to `urn:li:document:...` and `content.media.title`

Same secrets as text posts: `LINKEDIN_ACCESS_TOKEN`, optional `LINKEDIN_PERSON_URN`.

### Carousel troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `Document PDF not found` | Run `npm run build:carousel-pdf` before commit, or fix `document` path in frontmatter |
| `Timed out waiting for document` | PDF too large, corrupt, or LinkedIn still processing — retry workflow |
| 403 on Documents API | Token missing `w_member_social`, or owner URN mismatch |
| Post published without swipe UI | PDF missing or not attached — verify `content.media.id` is a document URN |

## Next Steps

Once setup is complete, the GitHub Actions workflow will automatically:
- Detect new posts in `content/linkedin/`
- Detect new carousels in `content/linkedin/carousel/`
- Authenticate with LinkedIn using your credentials
- Publish posts to your LinkedIn profile via the Posts API
