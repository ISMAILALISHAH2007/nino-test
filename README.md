# Nino AI — Intelligent Learning Companion

Nino is an advanced AI chatbot built with Next.js, featuring a premium **iOS 27 liquid glass** aesthetic, real-time voice mode, long-term memory learning, multi-provider AI fallback, and an artifact workspace for live HTML/JS code previews.

Built with ❤️ by **Ismail Ali Shah**

---

## ✨ Features

- 🧠 **AI Memory System** — Nino learns facts about you over time across sessions
- 🎤 **Ambient Voice Mode** — Real-time speech-to-speech conversation with waveform visualization
- 🎨 **Liquid Glass UI** — Premium iOS 27-style glassmorphism design with animated orbs
- ⚡ **Multi-Provider Fallback** — Automatic failover between Gemini → Groq → OpenAI
- 📦 **Artifact Workspace** — Live HTML/JS/SVG code previews with Desktop/Tablet/Mobile device simulation
- 💬 **Slash Commands** — `/code`, `/explain`, `/summarize`, `/web`, `/voice`
- 🌙 **Dark & Light Mode** — Adaptive theme support
- 🔒 **Auth System** — Secure email/password login with Better Auth
- 😊 **Sentiment Analysis** — Dynamic 3D orb that reacts to emotional cues
- 📋 **Smart Scroll** — Auto-scroll anchoring with floating scroll-down button
- 🔁 **Rewrite Responses** — Make any AI response shorter, longer, simpler, or change its tone

---

## 🚀 Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ISMAILALISHAH2007/nino)

---

## 🛠️ Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ISMAILALISHAH2007/nino.git
cd nino
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root:

```env
# Database (Neon PostgreSQL recommended)
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=your_random_secret_here
BETTER_AUTH_URL=http://localhost:3000

# AI Providers (at least one required — Groq is free)
GROQ_API_KEY=your_groq_key          # Free at console.groq.com
GEMINI_API_KEY=your_gemini_key      # Optional, at aistudio.google.com
OPENAI_API_KEY=your_openai_key      # Optional
```

### 4. Set Up Database Schema

```bash
pnpm drizzle-kit push
```

### 5. Run Locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Production Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Import from GitHub**
3. Add all environment variables (same as `.env`) in the Vercel dashboard
4. Set `BETTER_AUTH_URL` to your Vercel production URL (e.g. `https://your-app.vercel.app`)
5. Click **Deploy**!

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon recommended) |
| `BETTER_AUTH_SECRET` | ✅ | Random secret for session signing |
| `BETTER_AUTH_URL` | ✅ | Your app's public URL |
| `GROQ_API_KEY` | ✅ | Fast free AI (Llama 3.3 70B) — [console.groq.com](https://console.groq.com) |
| `GEMINI_API_KEY` | Optional | Google Gemini 2.0 Flash |
| `OPENAI_API_KEY` | Optional | OpenAI GPT-4o Mini |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Auth | Better Auth |
| Database | PostgreSQL + Drizzle ORM |
| AI SDK | Vercel AI SDK (Groq, Gemini, OpenAI) |
| Styling | Tailwind CSS + Custom Liquid Glass CSS |
| Icons | Lucide React |
| 3D Visuals | Three.js + React Three Fiber |

---

## 📸 Screenshots

> Premium liquid glass chat interface with animated orbs, sidebar sessions, memory panel, and artifact workspace.

---

*Nino is designed to be your personal AI learning companion — it remembers who you are and grows with you.*
