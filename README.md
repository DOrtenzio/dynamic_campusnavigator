<div align="center">

<img width="1264" height="309" alt="logo" src="https://github.com/user-attachments/assets/a5fe1542-b9a1-4e40-90aa-c40c9319275f" />

### Interactive 3D Campus Navigation System

<p>
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p>
  <img src="https://img.shields.io/badge/Status-In%20Development-orange" alt="Status">
  <img src="https://img.shields.io/badge/Three.js-r128-black" alt="Three.js">
  <img src="https://img.shields.io/badge/Platform-Web-blue" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p>
  <a href="https://github.com/DOrtenzio/dynamic_campusnavigator/issues">Report Bug</a>
  ·
  <a href="https://github.com/DOrtenzio/dynamic_campusnavigator/issues">Request Feature</a>
  ·
  <a href="https://github.com/DOrtenzio/dynamic_campusnavigator/discussions">Discussions</a>
</p>

</div>

---

> [!WARNING]
> This project is currently under active development. Features, APIs, and data structures may change without notice.

---

<a id="overview"></a>

# Overview

Navi^FROM^gate is a fully client-side 3D campus navigation platform designed to provide interactive wayfinding inside educational facilities, universities, corporate campuses, and large institutional environments.

Built using vanilla JavaScript and Three.js, the system renders an interactive WebGL environment capable of visualizing buildings, floors, rooms, facilities, and navigation paths without requiring backend infrastructure.

---

# Features

## Core Functionality

* Interactive 3D campus visualization
* Real-time room navigation
* Multi-floor building exploration
* Dynamic floor isolation system
* Indoor and outdoor navigation
* Search and autocomplete
* Responsive mobile interface
* WebGL accelerated rendering
* Client-side architecture
* Customizable data-driven environment

## Navigation System

* Building-to-room routing
* Entrance-based navigation
* Animated route visualization
* Floor-aware path generation
* Vertical navigation support
* Waypoint network architecture

## Facility Support

* Classrooms
* Laboratories
* Offices
* Meeting rooms
* Restrooms
* Staircases
* Elevators
* Custom assets

---

# Preview

<p align="center">
  <img width="1892" height="882" alt="image" src="https://github.com/user-attachments/assets/5dc51a05-8bc7-4166-bacc-c625642945a0" />
  <img width="1900" height="852" alt="image" src="https://github.com/user-attachments/assets/9dd2ef89-26eb-4327-8349-47d8beb78858" />
  <img width="1901" height="887" alt="image" src="https://github.com/user-attachments/assets/9d20a898-2f22-423d-bba1-10c90cb86e31" />
  <img width="1862" height="850" alt="image" src="https://github.com/user-attachments/assets/6d6e591a-2fc9-4d97-a3e1-858a3f4fcb80" />
  <img width="1920" height="1824" alt="screencapture-file-C-Users-D-ortenzio-Downloads-scuolamappa-index-html-2026-06-22-21_50_40" src="https://github.com/user-attachments/assets/808543f1-d50d-499f-bde7-f0912904c477" />
</p>

---

# Table of Contents

* Overview
* Features
* Quick Start
* Project Structure
* Architecture
* 3D Engine
* Data Configuration
* UI System
* Deployment
* Security & Privacy
* Browser Support
* Roadmap
* Contributing
* License

---

# Quick Start

## Clone Repository

```bash
git clone https://github.com/DOrtenzio/dynamic_campusnavigator.git

cd navifromgate
```

## Run Locally

```bash
npx serve .
```

or simply open:

```text
index.html
```

---

# Project Structure

```text
Navi^FROM^gate/
│
├── index.html
├── styles.css
├── data.js
├── map3d.js
├── app.js
│
├── assets/
│   ├── logo-placeholder.png
│   ├── preview-placeholder.png
│   └── icons/
│
├── docs/
│   ├── architecture.md
│   ├── deployment.md
│   └── customization.md
│
└── README.md
```

---

<a id="architecture"></a>

# Architecture

The application follows a modular architecture consisting of four primary layers.

```text
┌─────────────────────────────┐
│         User Interface      │
│   HTML • CSS • Components   │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│      Application Layer      │
│     State & Event Logic     │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│       Rendering Layer       │
│      Three.js Engine        │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│         Data Layer          │
│  Buildings • Rooms • Paths  │
└─────────────────────────────┘
```

---

# Technology Stack

| Technology | Purpose               |
| ---------- | --------------------- |
| HTML5      | Layout                |
| CSS3       | Styling               |
| JavaScript | Application Logic     |
| Three.js   | 3D Rendering          |
| WebGL      | Graphics Acceleration |

---

# 3D Engine

## Camera System

The platform uses an orthographic camera to maintain consistent proportions across the environment.

### Camera Modes

| Mode           | Purpose                |
| -------------- | ---------------------- |
| Overview       | Full campus navigation |
| Building Focus | Building inspection    |
| Indoor View    | Room exploration       |

### Smooth Interpolation

Camera movement uses frame-based interpolation to ensure fluid transitions between navigation states.

---

## Floor Separation System

Each floor is generated as an independent 3D group.

When a floor is selected:

* Upper floors move upward
* Lower floors move downward
* Exterior walls become transparent
* Interior rooms become visible

This creates an exploded architectural view.

---

## Pathfinding System

Navigation routes are generated through waypoint networks.

```text
Origin
 ↓
Campus Network
 ↓
Building Entrance
 ↓
Target Floor
 ↓
Destination Room
```

Animated visual indicators are rendered directly inside the 3D scene.

---

# Data Configuration

All environment data is stored inside:

```text
data.js
```

## Buildings

```javascript
{
  id: "A",
  x: 10,
  z: 15,
  w: 20,
  d: 12,
  floors: 3
}
```

## Rooms

```javascript
{
  id: "A-101",
  floor: 1,
  type: "class"
}
```

## Supported Types

| Type    | Description     |
| ------- | --------------- |
| class   | Classroom       |
| lab     | Laboratory      |
| office  | Office          |
| special | Custom Facility |

---

# User Interface System

The visual language follows a dark claymorphism design system.

## Design Principles

* Consistent spacing
* Soft elevation hierarchy
* High readability
* Mobile-first layouts
* Touch-friendly controls
* Smooth transitions

## Layer Hierarchy

| Element             | z-index |
| ------------------- | ------- |
| Toast Notifications | 300     |
| Modal Windows       | 100     |
| Bottom Sheets       | 25      |
| Floor Selector      | 20      |
| Room Labels         | 18      |
| WebGL Canvas        | 1       |

---

# Deployment

## GitHub Pages

```bash
git init

git add .

git commit -m "Initial deployment"

git branch -M main

git remote add origin https://github.com/DOrtenzio/dynamic_campusnavigator.git

git push -u origin main
```

Enable:

```text
Settings
 └── Pages
      └── Deploy from Branch
```

---

## Netlify

```bash
Publish Directory: /
Build Command: None
```

---

## Vercel

No additional configuration is required.

---

# Security & Privacy

## Privacy First

Navi^FROM^gate is designed as a client-side application.

Benefits:

* No mandatory user accounts
* No server-side processing
* No personal data storage
* No third-party analytics required
* No tracking infrastructure by default

## Data Collection

By default:

```text
User Data Collection: No
Cookies: No
Tracking: No
Analytics: No
Authentication: No
```

Any future integrations introducing telemetry or analytics should be clearly documented.

---

# Browser Support

| Browser | Supported |
| ------- | --------- |
| Chrome  | Yes       |
| Edge    | Yes       |
| Firefox | Yes       |
| Safari  | Yes       |
| Opera   | Yes       |

---

# Accessibility

Current accessibility goals:

* Keyboard navigation
* Screen reader compatibility
* High contrast support
* Responsive layouts
* Reduced motion preferences

---

# Roadmap

## Version 1.0 (ACTUAL)

* Building navigation
* Room search
* Multi-floor support
* Route generation
* Teacher search

## Version 1.5

* Classroom schedules
* Advanced filters
* Custom themes

## Version 2.0

* Multi-campus support
* PWA support
* Offline mode
* Localization system
* Administrative dashboard

---

# FAQ

### Does the project require a backend?

No. The application runs entirely in the browser.

### Can I customize buildings?

Yes. All buildings and rooms are defined through `data.js`.

### Can it be used outside schools?

Yes. The architecture supports universities, offices, hospitals, museums, and custom facilities.

---

<a id="contributing"></a>

# Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

Please ensure code quality, documentation updates, and compatibility with the existing architecture.

---

# Support

For support, bug reports, or feature requests:

* GitHub Issues
* GitHub Discussions

---

# License

This project is distributed under the MIT License.

See the `LICENSE` file for complete information.

---

<div align="center">

Navi^FROM^gate

Interactive 3D Campus Navigation Platform

</div>
