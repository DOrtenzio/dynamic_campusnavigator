<div align="center">

<img width="1264" height="309" alt="logo" src="https://github.com/user-attachments/assets/a5fe1542-b9a1-4e40-90aa-c40c9319275f" />

### Interactive 3D Campus Navigation System

<p>
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#setup">Setup</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#license">License</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Status-Working-green" alt="Status">
  <img src="https://img.shields.io/badge/Three.js-r128-black" alt="Three.js">
  <img src="https://img.shields.io/badge/Backend-Express-blue" alt="Express">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

</div>

---

## Overview

Navi^FROM^gate is a web app for exploring a school campus in 3D, searching rooms/teachers/classes, and navigating between buildings. An integrated admin panel lets authorized staff manage buildings, rooms, teachers, schedules, and CSV imports/exports.

The backend serves both the REST API and the static frontend from a single Node.js process.

## Features

- **3D campus map** with building overview and per-floor interior view
- **Indoor navigation** with path visualization and step-by-step directions
- **Search** across rooms, teachers, and classes
- **Admin panel** with PSK + TOTP (or demo code) authentication
- **JSON persistence** with optional seed data (~300 rooms, 150 teachers)
- **CSV import/export** for teachers and rooms

## Architecture

```
frontend/          Static SPA (HTML, CSS, vanilla JS, Three.js r128)
  app.js           Main user app, data loading, UI
  map3d.js         Three.js campus rendering and navigation
  admin.js         Admin CRUD overlay

backend/           Express API + static file server
  server.js        Entry point
  routes/          auth, buildings, rooms, teachers, schedule, csv
  data/db.json     Flat-file database
  seed.js          Sample data generator
```

### API

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /api/buildings` | Public | List buildings |
| `GET /api/rooms` | Public | List rooms |
| `GET /api/teachers` | Public | List teachers |
| `GET /api/schedule` | Public | Full schedule object |
| `POST /api/login` | Public | Admin login → JWT |
| `POST/PUT/DELETE /api/*` | JWT | Admin mutations |
| `GET/POST /api/csv/*` | JWT | CSV export/import |

Read endpoints are public for the main app. Write operations require a Bearer token from admin login.

### Environment variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`) |
| `ADMIN_PSK` | Pre-shared key for admin login |
| `TOTP_SECRET` | Base32 secret for speakeasy TOTP |
| `JWT_SECRET` | JWT signing key |

**Demo credentials:** PSK `admin123`, Auth (TOTP_SECRET) `JBSWY3DPEHPK3PXP`

## Setup

### Local development

```bash
cd backend
cp .env.example .env
npm install
npm run seed    # optional: populate db.json
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

Mount a volume on `/app/backend/data` to persist `db.json` between container restarts.

## Deployment

- Single container: the Dockerfile bundles frontend + backend
- Set strong values for `JWT_SECRET`, `ADMIN_PSK`, and `TOTP_SECRET` in production
- Back up `backend/data/db.json` regularly

## License

MIT — see [LICENSE](LICENSE).
