# LinkedIn AI Post Agent

An AI-powered LinkedIn post generator that researches your topic, writes 5 unique posts using Claude, generates images with DALL-E 3, and publishes directly to LinkedIn — all from a clean web UI.

![6-step flow: Configure → Research → Pick → Customize → Review → Publish]

## What It Does

1. **Configure** — Enter a topic, tone, and post length
2. **Research** — Claude scans its knowledge base and surfaces fresh, counterintuitive insights
3. **Pick** — Choose from 5 posts, each with a completely different angle (stat, contrarian, story, how-to, prediction)
4. **Customize** — Edit the text, optionally generate an AI image with DALL-E 3
5. **Review** — See a live LinkedIn card preview before posting
6. **Publish** — One click posts directly to your LinkedIn profile

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A free [Anthropic account](https://console.anthropic.com/) (Claude API)
- A paid [OpenAI account](https://platform.openai.com/) (DALL-E 3 image generation)
- A [LinkedIn Developer account](https://www.linkedin.com/developers/) with an OAuth token

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/inder42218/linkedin-agent.git
cd linkedin-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in your keys:

```env
ANTHROPIC_KEY=sk-ant-api03-...
OPENAI_KEY=sk-proj-...
LI_TOKEN=AQ...
LI_PERSON_ID=your-linkedin-person-id
```

See the sections below for how to get each key.

### 4. Start the server

```bash
node Server.js
```

### 5. Open the app

Go to **http://localhost:3000** in your browser.

---

## Getting Your API Keys

### Anthropic (Claude) — Post Writing

1. Go to [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
2. Click **Create Key**
3. Copy the key starting with `sk-ant-...`
4. Paste it as `ANTHROPIC_KEY` in your `.env`

> Claude writes all 5 post variations. Requires an active Anthropic account with available credits.

---

### OpenAI (DALL-E 3) — Image Generation

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Copy the key starting with `sk-proj-...`
4. Paste it as `OPENAI_KEY` in your `.env`

> Only used when you toggle "Add AI Image?" in Step 4. You can skip image generation entirely if you don't have an OpenAI key.

---

### LinkedIn OAuth Token — Publishing Posts

This is the most involved step. LinkedIn requires OAuth to post on your behalf.

#### Step 1 — Create a LinkedIn App

1. Go to [linkedin.com/developers/apps/new](https://www.linkedin.com/developers/apps/new)
2. Fill in app name (e.g. "My Post Agent"), associate it with a LinkedIn Page
3. Click **Create app**

#### Step 2 — Enable the right products

In your app settings, go to the **Products** tab and request access to:
- **Share on LinkedIn** (for posting)
- **Sign In with LinkedIn using OpenID Connect** (for reading your profile)

Wait for approval (usually instant for Share on LinkedIn).

#### Step 3 — Get an access token

The easiest way is using the [LinkedIn OAuth Token Generator](https://www.linkedin.com/developers/tools/oauth/token-generator):

1. Go to [linkedin.com/developers/tools/oauth/token-generator](https://www.linkedin.com/developers/tools/oauth/token-generator)
2. Select your app
3. Check scopes: `openid`, `profile`, `w_member_social`
4. Click **Request access token**
5. Copy the token starting with `AQ...`
6. Paste it as `LI_TOKEN` in your `.env`

> Tokens expire after ~60 days. You'll need to regenerate when it expires.

#### Step 4 — Find your LinkedIn Person ID

Once your `LI_TOKEN` is set and the server is running:

```bash
curl http://localhost:3000/api/linkedin/me
```

You'll get a response like:
```json
{
  "id": "abc123XYZ",
  "localizedFirstName": "Mani",
  "localizedLastName": "Grewal"
}
```

Copy the `id` value and paste it as `LI_PERSON_ID` in your `.env`.

Then restart the server:
```bash
node Server.js
```

---

## Project Structure

```
linkedin-agent/
├── Server.js          # Express backend — all API routes
├── index.html         # Single-file frontend — full UI
├── .env               # Your secrets (never committed)
├── .env.example       # Template showing required variables
├── .gitignore         # Excludes .env and node_modules
└── package.json       # Node dependencies
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/config` | Returns `LI_PERSON_ID` from env |
| `GET` | `/api/linkedin/me` | Fetches your LinkedIn profile |
| `POST` | `/api/generate` | Generates 5 posts via Claude |
| `POST` | `/api/image` | Generates image via DALL-E 3 |
| `POST` | `/api/linkedin/post` | Publishes post to LinkedIn |

---

## Tech Stack

- **Backend:** Node.js + Express
- **Post writing:** Anthropic Claude (`claude-opus-4-5`)
- **Image generation:** OpenAI DALL-E 3
- **Publishing:** LinkedIn UGC Posts API
- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)

---

## Troubleshooting

**Posts are too long**
Select a shorter length on Step 1. The word count is enforced as a strict range.

**Image generation fails**
Check your `OPENAI_KEY` is valid and has credits. You can skip images by leaving the toggle off.

**"Could not get your LinkedIn Person ID"**
Your `LI_TOKEN` may be expired. Regenerate it at the LinkedIn token generator and update your `.env`.

**Server won't start**
Make sure Node.js v18+ is installed (`node --version`) and you ran `npm install`.

---

## License

MIT — use it, modify it, ship it.
