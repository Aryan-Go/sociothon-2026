# Loopr

Loopr is a three-sided circular economy product for returning, sorting and recycling bottles. It combines a member impact experience, a network admin control room and a collector operations desk in one shared system.

Built with React, TypeScript, Vite, IndexedDB, Recharts and a hand-built design system. No backend or database setup is required for the demo.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. You will land on the sign-in screen.

Production build:

```bash
npm run build
npm run preview
```

## Sign-in and environment

All credentials and integrations live in `.env`. Copy the template if needed:

```bash
cp .env.example .env
```

Vite reads the environment on startup, so restart `npm run dev` after changing keys.

### Demo accounts

The defaults in `.env.example` and `.env` are:

| Role | Email | Password |
| --- | --- | --- |
| Member | `aarav@loopr.earth` | `member2026` |
| Admin | `admin@loopr.earth` | `admin2026` |
| Collector | `greenloop@loopr.earth` | `collector2026` |

Set `VITE_SHOW_DEMO_CREDENTIALS=true` to show the credentials and an autofill button on the sign-in page. Set it to `false` before sharing a deployment.

### Environment keys

```bash
# Auth
VITE_SHOW_DEMO_CREDENTIALS=true
VITE_MEMBER_NAME=Aarav Mehta
VITE_MEMBER_EMAIL=aarav@loopr.earth
VITE_MEMBER_PASSWORD=member2026
VITE_ADMIN_NAME=Riya Kapoor
VITE_ADMIN_EMAIL=admin@loopr.earth
VITE_ADMIN_PASSWORD=admin2026
VITE_COLLECTOR_NAME=GreenLoop Recovery
VITE_COLLECTOR_EMAIL=greenloop@loopr.earth
VITE_COLLECTOR_PASSWORD=collector2026
VITE_COLLECTOR_ID=c-1

# Gemini vision
VITE_GEMINI_API_KEY=
VITE_GEMINI_MODEL=gemini-2.5-flash

# ElevenLabs voice
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
VITE_ELEVENLABS_PROXY_URL=
```

These are local demo credentials. For a public product, replace them with a real identity provider. Browser-bundled credentials and API keys are visible to anyone who can inspect the client.

## The three workspaces

Use the **Sign in** screen and the account menu to switch accounts. Route guards prevent a member from opening admin or collector pages directly.

| Workspace | Route | What it does |
| --- | --- | --- |
| Member | `/app/user` | Scan bottles, listen to disposal guidance, understand risks and drop-offs, earn verified points, climb the leaderboard and review impact history. |
| Network admin | `/app/admin` | Monitor material flow, assign bottle batches to collectors, manage partner rates and settlements, review members, inspect analytics and export reports. |
| Collector | `/app/collector` | Receive and process intake, log recycled products, track buyers, revenue, profit and verified waste removal. |

All three views share the same IndexedDB ledger.

## Leaderboard rules

The leaderboard is intentionally **recycling-verified only**:

- Logging a bottle creates a pending submission and does not change points, bottle counts or leaderboard position.
- An admin assigns the bottle to a collector.
- The collector marks it received, then processed/recycled.
- Only at the processing step are points and verified bottle counts credited to the member.
- The admin UI has no manual point-adjustment shortcut.

This keeps the competition tied to real recycling rather than uploads alone.

## Gemini bottle classification

The scanner sends one image to Google Gemini. The prompt, taxonomy and structured response contract live in `src/lib/classifier.ts`.

The classifier asks Gemini to return exactly one Loopr class:

```json
{
  "bottleTypeId": "pet-water",
  "confidence": 0.94,
  "reason": "Clear PET body with a light blue tint and standard neck finish."
}
```

Supported classes: PET water bottle, PET soda bottle, HDPE milk jug, glass beverage bottle, aluminium bottle, PP care bottle and medicine bottle.

Add a Google AI Studio key to `.env`:

```bash
VITE_GEMINI_API_KEY=your_key_here
VITE_GEMINI_MODEL=gemini-2.5-flash
```

You can also use a workspace key override in **Settings → Model integrations**. The key is sent from the browser to the Generative Language API.

The scanner resizes the photo to 1024px before sending it, tries the configured model and then falls back through `gemini-2.5-flash-lite` and `gemini-3.5-flash`. If every model is unavailable, it completes the scan with the local demo classifier and shows a warning, so the member can still log the bottle and route it to admin.

The model can be changed without touching code. Use a vision-capable model available to your Google account.

## ElevenLabs narration

After a classification, Loopr writes a bottle-specific briefing covering preparation, environmental risk, the next useful life and nearby community drop-offs. It narrates that briefing with ElevenLabs.

Add:

```bash
VITE_ELEVENLABS_API_KEY=your_key_here
VITE_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

The client uses `eleven_multilingual_v2`, so the same voice can speak English and Hindi. If direct browser requests are blocked, add `VITE_ELEVENLABS_PROXY_URL` and point it at a small server that returns audio bytes.

Without ElevenLabs, the app falls back to the browser's speech engine so the experience remains complete.

## Site-aware help

The floating **Help** button:

1. Reads the current role, route and live data (points, pending bottles, queue size, network health, etc.).
2. Builds a screen-specific guide with a recommended next action.
3. Speaks it through ElevenLabs in **English or Hindi**, with a browser-voice fallback.

The guide is contextual: the member dashboard, leaderboard, admin queue, collector intake and settings each get different guidance. The language toggle re-narrates the guide in the selected language.

## Data and economics

- Every workspace mutation is saved to IndexedDB under `loopr:workspace:v1`.
- Open tabs sync through `BroadcastChannel`, so an admin tab updates when a member logs a bottle in another tab. Without BroadcastChannel support, the app refreshes from IndexedDB on window focus.
- Data is local to the browser profile and origin. Two different browsers will not share a workspace without a backend.
- **Settings → Data & privacy** exports a JSON backup or restores the seeded demo.
- Bottle points are fixed per material and credited only after recycling.
- Admin assignment creates a feedstock obligation at the collector's ₹/kg rate.
- Recording a settlement adds it to the shared transaction ledger.
- Collector product sales update revenue, profit, buyer spend and Loopr's 6% circularity fee.
- Waste removal uses verified processing weight; CO₂e estimates use 2.5 kg CO₂e per kg recovered.

## Structure

```text
src/
  auth/           local session context and role credentials
  components/     app shell, help guide, design system, charts, bottle visuals
  data/           bottle taxonomy, drop-off network and seeded workspace
  lib/            env config, Gemini classifier, analytics, IndexedDB, voice
  pages/          sign-in, member, admin, collector and settings surfaces
  store/          shared state, verified-only scoring and toast feedback
  styles/         tokens, components and responsive page styles
  types.ts        domain model
```

## Shipping notes

- The repository intentionally has no server. All demo state is local to the browser.
- Build output is a static site, ready for Vercel, Netlify, Cloudflare Pages or any static host.
- The demo seeds 12 members, 190 submissions, 5 collector partners, 14 recycled products and a shared transaction ledger.
- The Gemini and ElevenLabs adapters are isolated in `src/lib/classifier.ts` and `src/lib/voice.ts`.
- Move AI calls behind a server before production so API keys are not exposed in the client.
