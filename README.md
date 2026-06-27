# Dynamic Campus Navigator

<div align="center">

<img width="1264" height="309" alt="logo" src="https://github.com/user-attachments/assets/a5fe1542-b9a1-4e40-90aa-c40c9319275f" />

### Interactive 3D Campus Navigation System

<p>
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#ai-chatbot">AI Chatbot</a> •
  <a href="#setup">Setup</a> •
  <a href="#admin-features">Admin Features</a> •
  <a href="#customization">Customization</a> •
  <a href="#deployment">Deployment</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Status-Stable-green" alt="Status">
  <img src="https://img.shields.io/badge/Three.js-r128-black" alt="Three.js">
  <img src="https://img.shields.io/badge/Backend-Express%2BSQLite-blue" alt="Express">
  <img src="https://img.shields.io/badge/AI-Llama%203.2%3A3b-purple" alt="AI">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

</div>

---

## Overview

**Dynamic Campus Navigator** is a self-hosted web application for exploring a school campus in interactive 3D, searching for classrooms, teachers, and schedules, and navigating between buildings with step-by-step indoor directions.

An **integrated admin panel** allows authorized staff to manage buildings, rooms, teachers, schedules, and import CSV files — plus configure campus elements (sidewalks, streetlights, benches, fountains) with drag-and-drop, lock map rotation, and enable/disable the AI assistant in real-time.

The entire stack (frontend + backend + AI) runs as a single Node.js process with a local SQLite database — **zero cloud dependencies**.

<img width="1827" height="845" alt="image" src="https://github.com/user-attachments/assets/3790e6d2-672e-4da2-bc06-907c47972bae" />

---

## Features

| | Feature | Details |
|---|---|---|
| 🗺️ | **3D Campus Map** | Aerial view + floor-by-floor interiors, real-time with Three.js r128 |
| 🧭 | **Indoor Navigation** | Path visualization + step-by-step directions |
| 🔍 | **Unified Search** | Rooms, teachers, subjects, buildings in a single query |
| 🤖 | **AI Assistant** | Multilingual RAG chatbot via Ollama + Llama 3.2:3b |
| 🏗️ | **Campus Editor** | Manage buildings, rooms, and campus elements (sidewalks, streetlights, etc.) |
| 🔐 | **Admin Panel** | PSK + TOTP authentication (or demo code) |
| 💾 | **SQLite Persistence** | Local database, seed data ~300 rooms + 150 teachers |
| 📤 | **CSV Import/Export** | Bulk management of teachers and rooms |
| ⚙️ | **Dynamic Settings** | Enable/disable chatbot, lock map rotation, all from admin |
| ⚡ | **Zero Cloud Dependencies** | Fully self-hosted, no external APIs |

---

## Architecture

```
dynamic_campusnavigator/
│
├── frontend/                   Static SPA (HTML + CSS + vanilla JS + Three.js r128)
│   ├── index.html              Shell, layout, sidebar chatbot
│   ├── app.js                  Data loading, routing, search, tab management
│   ├── map3d.js                Three.js rendering, indoor navigation, rotation lock
│   ├── admin.js                CRUD admin + campus elements editor + settings
│   ├── chatbot.js              Sidebar AI: message rendering, actions, history
│   ├── campusUtils.js          Campus management utilities
│   └── styles.css              All styles + chatbot animations
│
├── backend/                    Express API + static file server
│   ├── server.js               Entry point, mounts all routes
│   ├── routes/
│   │   ├── auth.js             PSK + TOTP login → JWT
│   │   ├── buildings.js        CRUD /api/buildings
│   │   ├── rooms.js            CRUD /api/rooms
│   │   ├── teachers.js         CRUD /api/teachers
│   │   ├── schedule.js         GET/PUT /api/schedule
│   │   ├── campus-elements.js  CRUD /api/campus-elements (sidewalks, streetlights, etc.)
│   │   ├── csv.js              CSV import/export
│   │   ├── chatbot.js          POST /api/chatbot (RAG with Llama 3.2:3b)
│   │   └── settings.js         GET/PATCH /api/settings (chatbot, rotation lock, etc.)
│   ├── utils/
│   │   ├── db.js               readDB / writeDB helpers (SQLite better-sqlite3)
│   │   ├── ragBuilder.js       Builds context string from DB for LLM
│   │   ├── authMiddleware.js   JWT verification
│   │   └── totp.js             TOTP generation/verification
│   ├── data/
│   │   └── campus.db           SQLite database (buildings, rooms, teachers, schedule, settings, campus_elements)
│   ├── seed.js                 Example data generator
│   └── schema.sql              Database schema
│
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

<img width="1895" height="867" alt="image" src="https://github.com/user-attachments/assets/360fb840-f85a-4415-ac97-4ca91ab65b29" />

### REST API

| Endpoint | Auth | Method | Description |
|----------|------|--------|-------------|
| `GET /api/buildings` | Public | GET | All buildings |
| `POST /api/buildings` | JWT | POST | Create building |
| `PUT /api/buildings/:id` | JWT | PUT | Update building |
| `DELETE /api/buildings/:id` | JWT | DELETE | Delete building |
| `GET /api/rooms` | Public | GET | All rooms |
| `POST/PUT/DELETE /api/rooms` | JWT | — | CRUD rooms |
| `GET /api/teachers` | Public | GET | All teachers |
| `POST/PUT/DELETE /api/teachers` | JWT | — | CRUD teachers |
| `GET /api/schedule` | Public | GET | Full schedule |
| `PUT /api/schedule` | JWT | PUT | Update schedule |
| `GET /api/campus-elements` | Public | GET | Campus elements (sidewalks, streetlights, etc.) |
| `POST/PUT/DELETE /api/campus-elements` | JWT | — | Create/update/delete elements |
| `GET /api/settings` | Public | GET | App settings (chatbot on/off, rotation lock, etc.) |
| `PATCH /api/settings` | JWT | PATCH | Update settings |
| `POST /api/login` | Public | POST | Admin login → JWT |
| `POST /api/chatbot` | Public | POST | AI assistant query |
| `GET/POST /api/csv/*` | JWT | — | CSV export/import |

Read endpoints are public. All write operations require a Bearer token from `/api/login`.

---

## AI Chatbot

Navi^FROM^gate includes an optional AI assistant in the sidebar, powered by **Ollama + Llama 3.2:3b** — a lightweight model (~2GB) that runs entirely on the server's CPU without GPU and without internet connectivity.

### How It Works

The chatbot uses **retrieval-augmented generation (RAG)**: before each user message, the server builds a plain-text context from the SQLite database (buildings, rooms, teachers) and injects it into the system prompt. The model responds *only* from that context, so it always reflects the current campus data without retraining.

```
User: "Where is room A-102?"
        ↓
ragBuilder.js → reads database → builds context (buildings + rooms + teachers)
        ↓
POST http://localhost:11434/api/chat (local Ollama)
        ↓
Llama 3.2:3b responds in the user's language
        ↓
Response: { text: "Room A-102 is on the 1st floor of Building A.", action: { tab: "map", roomId: "A-102" } }
        ↓
Frontend renders bubble + "🗺 Show on map" button
```

When the user clicks an action button, the app navigates directly to the map view or correct tab — no manual searching.

<img width="1882" height="852" alt="image" src="https://github.com/user-attachments/assets/0e8f921f-2480-4656-bff4-7c8c60dbfd1e" />

### Model Options

| Model | RAM | Disk | Speed (CPU) | Quality | Notes |
|-------|-----|------|-------------|---------|-------|
| `llama3.2:3b` | ~2 GB | ~2 GB | ~3–6 tok/s | Excellent | **Recommended** — lightweight, fast, good Italian |
| `qwen2.5:1.5b` | ~1.5 GB | ~1 GB | ~2–4 tok/s | Good | Fast alternative |
| `mistral:7b` | ~4 GB | ~4 GB | ~1–3 tok/s | Excellent | If you have RAM available |
| `neural-chat:7b` | ~4 GB | ~4 GB | ~1–3 tok/s | Good | Optimized for chat |

**Recommended:** `llama3.2:3b` for the best speed/quality balance on CPU.

### Chatbot Installation

**1. Install Ollama on the server:**

```bash
# Linux
curl -fsSL https://ollama.com/install.sh | sh

# macOS
# Download from https://ollama.com/download

# Windows
# Download from https://ollama.com/download
```

**2. Download the model:**

```bash
ollama pull llama3.2:3b
```

Ollama runs as a system service on `http://localhost:11434` and starts automatically at boot.

**3. Enable in the Admin Panel:**

Admin Panel → ⚙️ Settings → **Chatbot AI** → toggle On

Or directly in the database, set `chatbotEnabled: true` in the `settings` table.

### Disabling the Chatbot

Admin Panel → Settings → **Chatbot AI** → toggle Off

When disabled, `/api/chatbot` returns `503` and the sidebar is hidden — useful for reducing server load during peak usage.

### Switching to a Cloud Model (Optional)

If you prefer a hosted cloud model (e.g., [Groq](https://groq.com), which offers Llama 3.2 3B free at ~500 tok/s), replace the fetch in `backend/routes/chatbot.js`:

```js
// Groq example (drop-in replacement, same OpenAI format)
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
  },
  body: JSON.stringify({
    model: 'llama-3.2-3b-preview',
    messages: [{ role: 'system', content: systemPrompt }, ...messages]
  })
});
const data = await response.json();
const text = data.choices[0].message.content;
```

Add `GROQ_API_KEY=your_key` to `backend/.env`. Nothing else needs to change.

---

## Admin Features

### Campus Map Editor

Go to **Admin Panel → 🗺️ Campus Map**:

- **Add building** → `+ New building` → fill form → position by dragging on map
- **Edit building** → click from list, edit form
- **Delete building** → delete button in panel detail
- **Drag buildings** → drag directly on the minimap to reposition

All coordinates (`x`, `z`) and dimensions (`w`, `d`) are saved automatically on drag release.

### Elements Editor (Sidewalks, Streetlights, Benches, etc.)

Go to **Admin Panel → 🗺️ Campus Map → ✏️ Edit Elements**:

A dedicated popup with a large SVG editor where you can:

- **Add element** → click one of the buttons (`+ sidewalk`, `+ streetlight`, `+ bench`, `+ flowerbed`, `+ fountain`)
- **Drag element** → click + drag any element to move it
- **Select element** → click to highlight (red border)
- **Delete element** → select + press `Delete` or click `✕` on the list
- **View on minimap** → elements also appear on the admin minimap in read-only mode

Each element has:
- `type`: `sidewalk`, `streetlight`, `bench`, `flowerbed`, `fountain`
- `x`, `z`: world coordinates
- `w`, `d`: width and depth (sidewalk only)
- `rotation`: rotation in degrees

<img width="792" height="192" alt="Registrazione 2026-06-26 185931" src="https://github.com/user-attachments/assets/cac5877c-bd7c-4856-85d9-3a41381c2cb4" />

### Settings

Go to **Admin Panel → ⚙️ Settings**:

**Chatbot AI** → Enable/disable the assistant. When disabled, no server latency for AI queries.

**Lock map rotation** → When enabled, users cannot rotate the 3D map sideways (horizontal drag blocked, rotation button disabled). Useful if the map UI is fragmented or to guide users to a fixed view.

### CSV Import/Export

Go to **Admin Panel → 📤 CSV**:

- **Export Teachers** → downloads CSV of teachers
- **Export Rooms** → downloads CSV of rooms
- **Import Teachers** → upload CSV for bulk update
- **Import Rooms** → upload CSV for bulk update

Expected format:
```
id,name,firstName,lastName,department,subject,building,floor,office
T1,Prof. Rossi,Marco,Rossi,Scientifico,Matematica,A,1,A-101
```

---

## Setup

### Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=3000
ADMIN_PSK=admin123          # Pre-shared key for admin login
TOTP_SECRET=JBSWY3DPEHPK3PXP  # Base32 secret for TOTP (speakeasy)
JWT_SECRET=your-secret-key-here
DB_PATH=./data/campus.db
GROQ_API_KEY=               # Optional — only if using Groq instead of Ollama
```

<img width="1697" height="812" alt="image" src="https://github.com/user-attachments/assets/026d7540-16e4-4e31-be84-b22913cf3e12" />

**Demo credentials:** PSK `admin123`, TOTP secret `JBSWY3DPEHPK3PXP` (generate codes with an Authenticator)

### Local Development

```bash
# Backend
cd backend
npm install
npm run seed    # Optional: populate database with sample data
npm start       # Or: npm run dev (with live reload)

# Frontend
# Already served by Express at http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For the **first time**, you will need to:
1. Access the admin panel: Admin Button (at bottom) → PSK `admin123` + TOTP code
2. Create/import buildings and rooms via CSV or admin form
3. Optional: install Ollama and enable the chatbot

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

Compose:
- Starts the Node.js container with persistent SQLite database
- Mounts `./data` as a volume for automatic backup
- Exposes port 3000

File `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      ADMIN_PSK: admin123
      JWT_SECRET: change-me-in-production
      TOTP_SECRET: JBSWY3DPEHPK3PXP
      PORT: 3000
    volumes:
      - ./data:/app/backend/data
    restart: unless-stopped
```

### Docker (Standard)

```bash
docker build -t campus-navigator .
docker run -p 3000:3000 \
  -e ADMIN_PSK=admin123 \
  -e JWT_SECRET=change-me \
  -e TOTP_SECRET=JBSWY3DPEHPK3PXP \
  -v /your/data/path:/app/backend/data \
  campus-navigator
```

> **Ollama + Docker Note:** If using the local chatbot, Ollama must run on the **host** (not inside the container) and be reachable from `http://host.docker.internal:11434`. Add `--add-host=host.docker.internal:host-gateway` to `docker run` and update the URL in `backend/routes/chatbot.js`.

---

## Customization

### Adding a Building

Go to **Admin Panel → Campus Map → + New building**:

Or directly in the database, add a row to `buildings`:

```sql
INSERT INTO buildings (id, name, subtitle, color, floors, rooms, x, z, w, d, icon)
VALUES ('E', 'Building E', 'Advanced Labs', '#6EC6F5', 2, 18, 40, -5, 10, 8, 'lab');
```

`x`/`z` are 3D world coordinates, `w`/`d` are width/depth. The building appears on the map immediately.

### Adding a Room

Go to **Admin Panel → Campus Map** (select building, click "Rooms" → "+ New room"):

Or SQL:
```sql
INSERT INTO rooms (id, name, building, floor, type, subject, x, z, w, d, color)
VALUES ('E-101', 'Electronics Lab', 'E', 1, 'lab', 'Electronics', 1.5, -2.0, 3.0, 2.5, 6710886);
```

`x`/`z` are relative to the building, `color` is a decimal integer (convert hex: `parseInt("0x665566", 16)`).

### Adding a Teacher

Go to **Admin Panel → Teachers → + New teacher**:

Or SQL:
```sql
INSERT INTO teachers (id, name, firstName, lastName, department, subject, building, floor, office)
VALUES ('T200', 'Prof. Marco Bianchi', 'Marco', 'Bianchi', 'Tecnologico', 'Electronics', 'E', 1, 'E-101');
```

### Adding Campus Elements (Sidewalks, Streetlights, etc.)

Go to **Admin Panel → Campus Map → ✏️ Edit Elements**:

Click one of the buttons (`+ sidewalk`, `+ streetlight`, `+ bench`, `+ flowerbed`, `+ fountain`). The element is created at `(0, 0)` and you can drag it on the map.

Or SQL:
```sql
INSERT INTO campus_elements (id, type, x, z, w, d, rotation)
VALUES ('el-001', 'sidewalk', 10.0, 5.0, 20.0, 3.0, 0);
```

Supported types:
- `sidewalk`: rectangle (has `w`, `d`, `rotation`)
- `streetlight`: point (lamp post)
- `bench`: point (has `rotation`)
- `flowerbed`: point (flower bed)
- `fountain`: point (fountain)

### Changing the Chatbot Model

Modify `backend/routes/chatbot.js`:

```js
body: JSON.stringify({
  model: 'llama3.2:3b',   // ← change here
  stream: false,
  messages,
  options: { ... }
})
```

Then download the new model:
```bash
ollama pull llama3.2:3b
```

### Locking Map Rotation

Go to **Admin Panel → ⚙️ Settings**:

Enable **Lock map rotation**. Users will not be able to:
- Drag horizontally on the map (lateral drag blocked)
- Click the rotation button

The setting `lockMapRotation` is loaded at app startup from the user.

### Changing the Campus Name / Branding

In the **Admin Panel**, the app name is linked to `frontend/index.html` (title and header).

For the chatbot, modify the system prompt in `backend/utils/ragBuilder.js`:

```js
return `You are the assistant of the Campus Navigator at G. Galilei Institute. Answer ONLY...`
```

### Adding a Language to the Chatbot

No configuration needed — **Llama 3.2:3b automatically detects the user's language** and responds in that same language (Italian, English, Spanish, French, etc.).

If you want to **force** a specific language, add it to the system prompt in `ragBuilder.js`:

```js
return `Always answer in English. You are the assistant of the Campus Navigator...`
```

---

## Deployment

### Production Checklist

- [ ] Change `JWT_SECRET`, `ADMIN_PSK`, `TOTP_SECRET` with unique and strong values
- [ ] Regular backup of `backend/data/campus.db` (or mount as Docker volume)
- [ ] Put a reverse proxy (nginx / Caddy) in front for HTTPS
- [ ] If using Ollama: ensure the service starts at boot (`systemctl enable ollama`)
- [ ] Disable the chatbot from the Admin Panel if the server is under load

### Nginx Reverse Proxy Example

```nginx
server {
  listen 443 ssl http2;
  server_name campus.yourdomain.com;
  
  ssl_certificate /etc/letsencrypt/live/campus.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/campus.yourdomain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Keeping the Process Alive (PM2)

```bash
npm install -g pm2
pm2 start backend/server.js --name campus-navigator
pm2 save
pm2 startup
```

### Ollama as a Service on Linux

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

Ollama starts automatically at server boot.

---

## Performance Tips

1. **Chatbot slow?** Reduce RAG context by increasing `num_predict` (max output tokens):
   ```js
   options: { num_predict: 80 }  // Limit short responses
   ```

2. **3D map stuttering?** On older browsers, reduce complexity:
   - Remove shadow effects in `map3d.js`
   - Reduce the number of buildings

3. **Database slow?** Use SQLite indexes:
   ```sql
   CREATE INDEX idx_rooms_building ON rooms(building);
   CREATE INDEX idx_schedule_class ON schedule_slots(class_id);
   ```

4. **Ollama using too much RAM?** Use a smaller model:
   ```bash
   ollama pull qwen2.5:0.5b  # Only 600 MB
   ```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Chatbot not responding | Ollama not running | `ollama serve` in terminal, then `ollama pull llama3.2:3b` |
| Error "404 on /api/xyz" | Route not found | Check that `server.js` mounts all routes |
| Login fails | JWT_SECRET mismatch | Use `npm run seed` to reset, check `.env` |
| Empty map | No data | Go to admin, import CSV or create buildings/rooms manually |
| Element not appearing | Coordinates out of bounds | In Elements Editor, drag it to the center of the map |

---

## License

MIT — see [LICENSE](LICENSE).

---

## Changelog

### v2.0 (Current Version)
- ✅ Migration from JSON flat-file to SQLite + better-sqlite3
- ✅ Campus elements editor (sidewalks, streetlights, benches, flowerbeds, fountains) with drag-and-drop in dedicated popup
- ✅ Dynamic building labels on minimap (legend removed)
- ✅ "Lock map rotation" setting — disables lateral drag + rotation button
- ✅ Default model change: Qwen 2.5 → Llama 3.2:3b (faster, better Italian)
- ✅ RAG optimization: system prompt inside messages array for Ollama chat mode compatibility
- ✅ Cleanup: removed console.log/warn/error from non-debug functions

### v1.0 (Baseline)
- JSON database, admin panel chatbot, 3D map, navigation