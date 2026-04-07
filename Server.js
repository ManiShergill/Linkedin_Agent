require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const { ANTHROPIC_KEY, OPENAI_KEY, LI_TOKEN, LI_PERSON_ID } = process.env;

/* ── helpers ──────────────────────────────────────────── */
function extractJSON(text) {
  // strip markdown fences if present
  const cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');
  const match   = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude returned no JSON object');
  return JSON.parse(match[0]);
}

async function claude(system, user) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: {
      'x-api-key'        : ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type'     : 'application/json',
    },
    body: JSON.stringify({
      model     : 'claude-opus-4-5',
      max_tokens: 4000,
      system,
      messages  : [{ role: 'user', content: user }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d.content?.[0]?.text || '';
}

/* ── routes ───────────────────────────────────────────── */

// 0. GET /api/config  — exposes non-secret config to the frontend
app.get('/api/config', (_req, res) => {
  res.json({ personId: LI_PERSON_ID || null });
});

// 1. GET /api/linkedin/me
app.get('/api/linkedin/me', async (_req, res) => {
  try {
    const r = await fetch(
      'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)',
      { headers: { Authorization: `Bearer ${LI_TOKEN}`, 'X-Restli-Protocol-Version': '2.0.0' } }
    );
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. POST /api/generate
app.post('/api/generate', async (req, res) => {
  const { topic, author, tone, length } = req.body;

  const system = `You are a world-class LinkedIn content strategist and ghostwriter with deep expertise in viral content. You have access to knowledge across the entire internet — LinkedIn posts, industry blogs, HubSpot, Medium, Substack, Reddit, Twitter/X, YouTube, podcasts, academic papers, company press releases, news sites (TechCrunch, Forbes, WSJ, Bloomberg, Wired, Reuters), niche industry publications, government announcements, job postings as industry signals, patent filings, product launches, conference keynotes, Quora discussions, GitHub trends, Product Hunt launches, earnings calls, investor reports, survey results, and research studies.

Your mission: Find the FRESHEST, most SURPRISING, most COUNTERINTUITIVE insights on the given topic. Prioritize content from the last 7 days, then 30 days. Surface the ONE thing that will make someone stop scrolling on LinkedIn.

First mover advantage is everything. Find insights most people haven't seen yet.`;

  const user = `Research the topic: ${topic}

Author posting this: ${author}
Desired tone: ${tone}
STRICT word count: each fullPost must be between ${Math.round(length * 0.85)} and ${Math.round(length * 1.15)} words. Count carefully. Do NOT exceed ${Math.round(length * 1.15)} words. Do NOT go below ${Math.round(length * 0.85)} words.

Step 1: Research this topic deeply across all sources you know. Find the most recent, surprising, counterintuitive insights.

Step 2: Generate exactly 5 LinkedIn posts each with a COMPLETELY different angle:
Post 1 - The surprising stat or data point nobody is talking about yet
Post 2 - The contrarian take that challenges what everyone believes
Post 3 - A micro-story (2-3 sentences) that illustrates the bigger trend, then the insight
Post 4 - Practical how-to based on what top performers are actually doing right now
Post 5 - A bold future prediction with a specific timeline (6 months, 1 year, 3 years)

Rules for every post:
- WORD COUNT IS MANDATORY: fullPost must be ${Math.round(length * 0.85)}–${Math.round(length * 1.15)} words. Count every word before finalizing.
- Sound like a real senior human professional — NEVER use: game-changer, leverage, delve, landscape, it's no secret, unlock, revolutionize, unprecedented, in today's fast-paced world
- Open with a hook that stops the scroll — a specific number, a bold statement, or a 2-sentence story
- Mix short punchy sentences (5 words) with longer flowing ones
- Reference at least 1 specific real data point, company, person, or event
- End with a genuine question that sparks comments
- Add 3-5 relevant hashtags on the final line
- No bullet points — pure prose paragraphs only
- Write in first person as ${author}

Return ONLY valid JSON, no markdown, no explanation, exactly this structure:
{
  "sources": [
    {
      "title": "Article or content title",
      "source": "Where it came from (LinkedIn/HubSpot/Forbes/etc)",
      "date": "Approximate date",
      "keyInsight": "The one most valuable thing from this source"
    }
  ],
  "posts": [
    {
      "id": 1,
      "hook": "The one-liner scroll-stopper headline",
      "preview": "First 2 sentences of the post only",
      "fullPost": "Complete post text with hashtags at the end",
      "angle": "Surprising Stat",
      "estimatedReach": "Viral Potential",
      "whyItWorks": "One sentence on why this angle wins on LinkedIn right now"
    }
  ]
}`;

  try {
    const text   = await claude(system, user);
    const parsed = extractJSON(text);
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. POST /api/image  (OpenAI DALL-E 3)
app.post('/api/image', async (req, res) => {
  const { prompt, style } = req.body;
  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method : 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model  : 'dall-e-3',
        prompt : `Professional LinkedIn post image. ${style}. About: ${prompt}. No text overlays. No logos. Clean, modern, business-appropriate. Shot on mirrorless camera, natural light.`,
        n      : 1,
        size   : '1024x1024',
        quality: 'standard',
      }),
    });
    const d = await r.json();
    if (d.error) return res.status(400).json({ error: d.error.message });
    res.json({ url: d.data?.[0]?.url ?? null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. POST /api/linkedin/post
app.post('/api/linkedin/post', async (req, res) => {
  const { text, personId } = req.body;
  try {
    const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method : 'POST',
      headers: {
        Authorization              : `Bearer ${LI_TOKEN}`,
        'Content-Type'             : 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author          : `urn:li:person:${personId}`,
        lifecycleState  : 'PUBLISHED',
        specificContent : {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary   : { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });
    const d = await r.json();
    res.status(r.status).json(d);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. GET /
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(3000, () => console.log('✅  LinkedIn Post Agent → http://localhost:3000'));
