> [!CAUTION]
> Issue with the AI ​​and the map: they need to be fixed.
> Please accept my apologies; I will do my utmost to ensure that the essential corrections are made as soon as possible.
> Here are the identified issues and their causes:
> - RAG context management insufficiently optimized for small-scale models;
> - Errors in managing rooms within buildings and in their drag-and-drop repositioning, caused by inconsistencies in 3D map calculations
> 
> Thank you for your understanding.

---
---
---

<div align="center">

<img width="1264" height="309" alt="logo" src="https://github.com/user-attachments/assets/a5fe1542-b9a1-4e40-90aa-c40c9319275f" />

### Interactive 3D Campus Navigation System

<p>
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#chatbot">AI Chatbot</a> •
  <a href="#setup">Setup</a> •
  <a href="#customization">Customization</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Status-Working-green" alt="Status">
  <img src="https://img.shields.io/badge/Three.js-r128-black" alt="Three.js">
  <img src="https://img.shields.io/badge/Backend-Express-blue" alt="Express">
  <img src="https://img.shields.io/badge/AI-Qwen 2.5 · Ollama-purple" alt="AI">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

</div>

---

## Overview

**Navi^FROM^gate** is a self-hosted web application for exploring a school campus in 3D, searching rooms, teachers and timetables, and navigating between buildings with step-by-step indoor directions.

An integrated **admin panel** lets authorized staff manage buildings, rooms, teachers, schedules, and CSV imports — plus toggle an optional AI assistant at any time. The entire stack (frontend + backend + AI) runs as a single Node.js process with no external cloud dependencies.

<img width="1827" height="845" alt="image" src="https://github.com/user-attachments/assets/3790e6d2-672e-4da2-bc06-907c47972bae" />

---

## Features

| | Feature | Notes |
|---|---|---|
| 🗺 | **3D campus map** | Building overview and per-floor interior view via Three.js r128 |
| 🧭 | **Indoor navigation** | Path visualization and step-by-step directions |
| 🔍 | **Unified search** | Rooms, teachers, subjects and buildings in one query |
| 🤖 | **AI assistant** | Multilingual RAG chatbot, fully local via Ollama + Qwen 2.5 |
| 🔐 | **Admin panel** | PSK + TOTP (or demo code) authentication |
| 💾 | **JSON persistence** | Flat-file `db.json`, optional seed (~300 rooms, 150 teachers) |
| 📤 | **CSV import/export** | Teachers and rooms bulk management |
| ⚡ | **Zero cloud deps** | Everything self-hosted, no external API calls required |

<img width="1895" height="867" alt="image" src="https://github.com/user-attachments/assets/360fb840-f85a-4415-ac97-4ca91ab65b29" />

---

## Architecture

```
dynamic_campusnavigator/
│
├── frontend/                   Static SPA (HTML + CSS + vanilla JS + Three.js r128)
│   ├── index.html              Shell, layout, chatbot sidebar markup
│   ├── app.js                  Data loading, routing, search, tab management
│   ├── map3d.js                Three.js campus rendering and indoor navigation
│   ├── admin.js                Admin CRUD overlay + chatbot toggle tab
│   ├── chatbot.js              AI sidebar: message rendering, action buttons, history
│   └── styles.css              All styles including chatbot animations
│
├── backend/                    Express API + static file server
│   ├── server.js               Entry point, mounts all routes
│   ├── routes/
│   │   ├── auth.js             PSK + TOTP login → JWT
│   │   ├── buildings.js        CRUD /api/buildings
│   │   ├── rooms.js            CRUD /api/rooms
│   │   ├── teachers.js         CRUD /api/teachers
│   │   ├── schedule.js         GET/PUT /api/schedule
│   │   ├── csv.js              Import/export /api/csv/*
│   │   └── chatbot.js          POST /api/chatbot (RAG endpoint)
│   ├── utils/
│   │   ├── db.js               readDB / writeDB helpers
│   │   └── ragBuilder.js       Builds context string from db.json for the LLM
│   ├── data/
│   │   └── db.json             Flat-file database (buildings, rooms, teachers, schedule, settings)
│   └── seed.js                 Sample data generator
│
├── Dockerfile
└── .env.example
```

### REST API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/buildings` | Public | List all buildings |
| `GET /api/rooms` | Public | List all rooms |
| `GET /api/teachers` | Public | List all teachers |
| `GET /api/schedule` | Public | Full schedule object |
| `GET /api/settings` | Public | App settings (incl. `chatbotEnabled`) |
| `POST /api/login` | Public | Admin login → JWT |
| `POST /api/chatbot` | Public | AI assistant query |
| `POST/PUT/DELETE /api/*` | JWT | Admin mutations |
| `GET/POST /api/csv/*` | JWT | CSV export / import |
| `PATCH /api/settings` | JWT | Update settings (e.g. disable chatbot) |

Read endpoints are public for the main app. All write operations require a Bearer token from `/api/login`.

<img width="1882" height="852" alt="image" src="https://github.com/user-attachments/assets/0e8f921f-2480-4656-bff4-7c8c60dbfd1e" />

---

## AI Chatbot

Navi^FROM^gate includes an optional AI assistant sidebar powered by **Ollama + Qwen 2.5 (1.5b)** — a ~400 MB model that runs entirely on the server CPU with no GPU and no internet connection required.

### How it works

The chatbot uses **retrieval-augmented generation (RAG)**: before every user message, the server builds a plain-text context from `db.json` (buildings, rooms, teachers) and injects it into the system prompt. The model answers exclusively from that context, which means it always reflects your current campus data without retraining.

```
User: "Dove si trova l'aula A-102?"
        ↓
ragBuilder.js → reads db.json → builds context (buildings + rooms + teachers)
        ↓
POST http://localhost:11434/api/chat  (Ollama local)
        ↓
Qwen 2.5 1.5b answers in the user's language
        ↓
Response: { text: "L'aula A-102 è al piano 1 della Palazzina A.", action: { tab: "map", roomId: "A-102" } }
        ↓
Frontend renders bubble + "🗺 Mostra sulla mappa" button
```

When the user taps an action button, the app navigates directly to the relevant map view or tab — no manual search needed.

### Model options

| Model | RAM | Disk | Speed (CPU) | Quality |
|-------|-----|------|-------------|---------|
| `qwen2.5:0.5b` | ~600 MB | ~400 MB | ~5–10 tok/s | Good for structured queries |
| `qwen2.5:1.5b` | ~1.5 GB | ~1 GB | ~2–5 tok/s | Better multilingual |
| `qwen2.5:7b` | ~5 GB | ~4.5 GB | Needs GPU | Best quality |

For most campus navigator use cases `1.5b` is sufficient — questions are predictable and context is structured.

### Enabling the chatbot

**1. Install Ollama on the server:**

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:1.5b
```

Ollama runs as a system service on `http://localhost:11434` and starts automatically on boot.

**2. Enable it in `db.json`:**

```json
"settings": {
  "chatbotEnabled": true
}
```

Or toggle it from the **Admin Panel → Chatbot** tab at any time. When disabled, `/api/chatbot` returns `503` and the sidebar is hidden from users — useful for reducing server load during busy periods.

### Switching to a cloud LLM (optional)

If you prefer a cloud-hosted model (e.g. [Groq](https://groq.com), which offers free-tier Qwen 2.5 7B at ~500 tok/s), replace the fetch in `backend/routes/chatbot.js`:

```js
// Groq example (drop-in replacement, same OpenAI-compatible format)
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: 'qwen-qwq-32b',   // or any Groq-hosted model
    messages: [{ role: 'system', content: systemPrompt }, ...messages]
  })
});
const data = await response.json();
const text = data.choices[0].message.content;
```

Add `GROQ_API_KEY=your_key` to `backend/.env`. No other changes needed.

---

## Setup

### Environment variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_PSK` | Pre-shared key for admin login | — |
| `TOTP_SECRET` | Base32 secret for TOTP (speakeasy) | — |
| `JWT_SECRET` | JWT signing key | — |
| `GROQ_API_KEY` | Optional — only needed if using Groq instead of Ollama | — |

**Demo credentials:** PSK `admin123`, TOTP secret `JBSWY3DPEHPK3PXP`

### Local development

```bash
cd backend
cp .env.example .env
npm install
npm run seed    # optional: populate db.json with sample data
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For live reload during backend development:

```bash
npm run dev
```

### Docker

```bash
docker build -t campus-navigator .
docker run -p 3000:3000 \
  -e ADMIN_PSK=admin123 \
  -e JWT_SECRET=change-me \
  -e TOTP_SECRET=JBSWY3DPEHPK3PXP \
  campus-navigator
```

> **Tip:** mount a volume on `/app/backend/data` to persist `db.json` between restarts:
> ```bash
> -v /your/data/path:/app/backend/data
> ```

> **Ollama + Docker:** if using the local AI chatbot, Ollama must run on the **host** (not inside the container) and be reachable at `http://host.docker.internal:11434`. Add `--add-host=host.docker.internal:host-gateway` to the `docker run` command and update the URL in `backend/routes/chatbot.js`.

<img width="792" height="192" alt="Registrazione 2026-06-26 185931" src="https://github.com/user-attachments/assets/cac5877c-bd7c-4856-85d9-3a41381c2cb4" />

---

## Customization

### Adding a building

Add an entry to the `buildings` array in `backend/data/db.json`:

```json
{
  "id": "E",
  "name": "Palazzina E",
  "subtitle": "Laboratori avanzati",
  "color": "#6EC6F5",
  "floors": 2,
  "rooms": 18,
  "x": 40,
  "z": -5,
  "w": 10,
  "d": 8,
  "icon": "lab"
}
```

`x`/`z` are the 3D world-space coordinates, `w`/`d` are width and depth. The building appears on the campus map immediately after saving — no restart needed.

You can also add it via the Admin Panel → Buildings → Add.

### Adding a room

```json
{
  "id": "E-101",
  "name": "Lab Elettronica",
  "building": "E",
  "floor": 1,
  "type": "lab",
  "subject": "Elettronica",
  "x": 1.5,
  "z": -2.0,
  "w": 3.0,
  "d": 2.5,
  "color": 6710886
}
```

`color` is a decimal integer (convert hex with `parseInt("0x665566", 16)`). `x`/`z` are relative to the building origin.

### Adding a teacher

```json
{
  "id": "T200",
  "name": "Prof. Marco Bianchi",
  "firstName": "Marco",
  "lastName": "Bianchi",
  "department": "Tecnologico",
  "subject": "Elettronica",
  "building": "E",
  "floor": 1,
  "office": "E-101"
}
```

### Changing the chatbot model

Edit `backend/routes/chatbot.js` and change the `model` field:

```js
body: JSON.stringify({
  model: 'qwen2.5:1.5b',   // ← change here
  ...
})
```

Then pull the new model: `ollama pull qwen2.5:1.5b`

### Changing the campus name / branding

The app name is referenced in `frontend/index.html` (page title and header) and in the chatbot system prompt inside `backend/utils/ragBuilder.js`:

```js
// ragBuilder.js — update this line:
return `Sei l'assistente del Campus Navigator dell'Istituto G. Galilei. ...`
```

### Adding a language to the chatbot

No configuration needed — Qwen 2.5 detects the user's language automatically and responds in kind. If you want to **force** a specific language, add a line to the system prompt in `ragBuilder.js`:

```js
// Force Italian responses:
return `Rispondi sempre in italiano. Sei l'assistente del Campus Navigator ...`
```

---

## Deployment

### Production checklist

- [ ] Set strong, unique values for `JWT_SECRET`, `ADMIN_PSK`, and `TOTP_SECRET`
- [ ] Back up `backend/data/db.json` regularly (or mount it as a Docker volume)
- [ ] Place a reverse proxy (nginx / Caddy) in front for HTTPS
- [ ] If using Ollama: ensure the service starts on boot (`systemctl enable ollama`)
- [ ] Disable the chatbot from the Admin Panel if the server is under heavy load

### Nginx reverse proxy example

```nginx
server {
  listen 443 ssl;
  server_name campus.yourdomain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### Keeping the process alive (PM2)

```bash
npm install -g pm2
pm2 start backend/server.js --name campus-navigator
pm2 save
pm2 startup
```

---

<img width="1697" height="812" alt="image" src="https://github.com/user-attachments/assets/026d7540-16e4-4e31-be84-b22913cf3e12" />

---

## License

MIT — see [LICENSE](LICENSE).
