#!/usr/bin/env node

/**
 * Test LinkedIn API connectivity and credentials.
 * Usage: node scripts/test-linkedin-api.mjs
 */

const LINKEDIN_POSTS_URL = 'https://api.linkedin.com/rest/posts';
const LINKEDIN_API_VERSION = '202608';

async function testLinkedInAPI() {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  console.log('🔍 Testing LinkedIn API Configuration\n');

  if (!accessToken) {
    console.error('❌ LINKEDIN_ACCESS_TOKEN is not set');
    process.exit(1);
  }

  if (!personUrn) {
    console.error('❌ LINKEDIN_PERSON_URN is not set');
    process.exit(1);
  }

  console.log('✅ LINKEDIN_ACCESS_TOKEN is set (length: ' + accessToken.length + ')');
  console.log('✅ LINKEDIN_PERSON_URN is set:', personUrn);

  // Verify Person URN format
  const urnPattern = /^urn:li:person:\d+$/;
  if (!urnPattern.test(personUrn)) {
    console.error(`❌ LINKEDIN_PERSON_URN has invalid format. Expected: urn:li:person:<id>, Got: ${personUrn}`);
    process.exit(1);
  }
  console.log('✅ LINKEDIN_PERSON_URN format is valid\n');

  // Test with a minimal payload
  const testPayload = {
    author: personUrn,
    commentary: 'Test post from automation',
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  console.log('📤 Sending test POST request to LinkedIn Posts API...\n');

  try {
    const response = await fetch(LINKEDIN_POSTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': LINKEDIN_API_VERSION,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    let responseBody = '';
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        responseBody = JSON.stringify(data, null, 2);
      } else {
        responseBody = await response.text();
      }
    } catch (e) {
      console.log('(Could not parse response body)');
    }

    if (responseBody) {
      console.log('\nResponse Body:');
      console.log(responseBody);
    }

    if (response.ok) {
      console.log('\n✅ LinkedIn API is reachable and accepts your credentials!');
      const postId = response.headers.get('x-restli-id');
      if (postId) {
        console.log(`   Posted successfully with ID: ${postId}`);
      }
    } else {
      console.error('\n❌ LinkedIn API returned an error');
      console.error('   Check the response above for details.');
      if (response.status === 401) {
        console.error('   → Likely issue: Invalid or expired access token');
      } else if (response.status === 403) {
        console.error('   → Likely issue: Token missing required permissions (w_member_social), or app not authorized');
      } else if (response.status === 400) {
        console.error('   → Likely issue: Invalid request payload');
      }
    }

    process.exit(response.ok ? 0 : 1);
  } catch (error) {
    console.error('❌ Network error:', error.message);
    process.exit(1);
  }
}

testLinkedInAPI();
