#!/usr/bin/env node
/**
 * LinkedIn Content Posting Script
 *
 * Uses OpenID /v2/userinfo for the member URN, then Posts API
 * (POST /rest/posts) with w_member_social.
 */

import fs from 'fs';
import { pathToFileURL } from 'url';
import { escapeLinkedInCommentary } from './scripts/publish-to-linkedin.mjs';

const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202608';

function loadEnv() {
  try {
    const text = fs.readFileSync('.env', 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional when vars are already in the environment
  }
}

loadEnv();

function apiError(response, data) {
  return `${response.status} ${response.statusText} — ${data?.message || JSON.stringify(data)}`;
}

class LinkedInPoster {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'Linkedin-Version': LINKEDIN_VERSION,
    };
  }

  async getMyProfile() {
    const response = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(apiError(response, data));
    }
    const sub = data.sub;
    if (!sub) {
      throw new Error('userinfo did not return a sub (member id)');
    }
    const personUrn = `urn:li:person:${sub}`;
    console.log('Profile:', data.name || sub);
    console.log('Person URN:', personUrn);
    return personUrn;
  }

  async postTextContent(text, personUrnId) {
    const payload = {
      author: personUrnId,
      commentary: escapeLinkedInCommentary(text),
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    const raw = await response.text();
    let data = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = { message: raw };
      }
    }
    if (!response.ok) {
      console.error('❌ Error posting to LinkedIn:', apiError(response, data));
      throw new Error(apiError(response, data));
    }
    const postId = response.headers.get('x-restli-id') || data.id;
    console.log('✅ Post created successfully!');
    if (postId) {
      console.log('Post ID:', postId);
    }
    return { id: postId, data };
  }
}

async function main() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ LINKEDIN_ACCESS_TOKEN not found in environment variables');
    console.error('Please set up your .env file with your access token');
    process.exit(1);
  }

  const poster = new LinkedInPoster(accessToken);
  const myLinkedInId = process.env.LINKEDIN_PERSON_URN || (await poster.getMyProfile());
  const postText =
    "Just launched an amazing new project! 🚀\n\nExcited to share my journey with building scalable systems. Feel free to connect if you're interested in tech discussions!";

  await poster.postTextContent(postText, myLinkedInId);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => process.exit(1));
}

export { LinkedInPoster };
