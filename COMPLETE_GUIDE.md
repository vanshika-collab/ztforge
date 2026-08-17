# ZTForge — Complete Beginner Guide

> This file is gitignored. It's your personal reference, not part of the repo.

---

## Table of Contents

1. [What Is ZTForge?](#1-what-is-ztforge)
2. [Prerequisites — What You Need Installed](#2-prerequisites)
3. [Understanding the Architecture](#3-architecture)
4. [Option A: Run Everything with Docker (Easiest)](#4-docker-setup)
5. [Option B: Run Without Docker (Dev Mode)](#5-manual-setup)
6. [How the Frontend and Backend Connect](#6-frontend-backend-integration)
7. [Complete User Workflow](#7-user-workflow)
8. [Understanding Each Service](#8-services-explained)
9. [How to Deploy to the Internet](#9-deployment)
10. [Troubleshooting](#10-troubleshooting)
11. [How Each File Works](#11-file-map)

---

## 1. What Is ZTForge?

ZTForge is a web application where you **visually design network security architectures** using a drag-and-drop canvas (like Figma, but for security).

**What you can do:**
- Drag nodes (users, devices, apps, databases) onto a canvas
- Connect them with edges that have security policies (allow/deny, require MFA, etc.)
- Run "breach simulations" — the system pretends to be a hacker and tries to move through your architecture, telling you where it's weak
- Export your design as real config files (firewall rules, OPA policies, Terraform)
- Share your designs as templates for others to fork

**Who it's for:** Security engineers, DevOps, homelabbers, students learning Zero Trust.

---

## 2. Prerequisites

### For Docker Setup (recommended)

| Tool | How to Install | Check If Installed |
|------|---------------|-------------------|
| **Docker** | https://docs.docker.com/get-docker/ | `docker --version` |
| **Docker Compose** | Comes with Docker Desktop | `docker compose version` |
| **Git** | `sudo apt install git` | `git --version` |

### For Manual Dev Setup (no Docker)

Everything above, PLUS:

| Tool | How to Install | Check |
|------|---------------|-------|
| **Node.js 22+** | https://nodejs.org or `nvm install 22` | `node --version` |
| **Python 3.12+** | `sudo apt install python3.12 python3.12-venv` | `python3 --version` |
| **PostgreSQL 16** | `sudo apt install postgresql` | `psql --version` |
| **Redis** | `sudo apt install redis-server` | `redis-cli ping` → PONG |

### Installation commands (Ubuntu/Debian)

```bash
# Docker (if not installed)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# LOG OUT AND BACK IN after this

# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
source ~/.bashrc
nvm install 22

# Python
sudo apt install python3.12 python3.12-venv python3-pip

# PostgreSQL + Redis (only for manual setup)
sudo apt install postgresql redis-server
sudo systemctl start postgresql redis
```

---

## 3. Architecture

```
┌─────────────────────────────────────────────────┐
│                YOUR BROWSER                      │
│   React App (localhost:5173 or :3000)            │
│   - Dashboard, Canvas, Simulator, Policy Hub     │
└──────────┬───────────────┬──────────────────────┘
           │ REST API       │ WebSocket (Socket.io)
           ▼               ▼
┌─────────────────────────────────────────────────┐
│            FASTAPI BACKEND (:8000)               │
│   - Validates JWT tokens from Keycloak           │
│   - CRUD for canvases, policies, templates       │
│   - Runs breach simulations                      │
│   - Rate limits via Redis                        │
└──┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │
   ▼          ▼          ▼          ▼
PostgreSQL  Redis     Keycloak     OPA
(data)     (cache)   (auth)      (policies)
```

**In plain English:**
- **React frontend** = what users see and interact with in the browser
- **FastAPI backend** = the "brain" — handles all logic, stores data, enforces security
- **PostgreSQL** = database where canvases, users, policies are stored permanently
- **Redis** = fast temporary storage for rate limiting and real-time collaboration state
- **Keycloak** = handles login/logout, issues JWT tokens, manages user roles
- **OPA** = evaluates security policies written in Rego language

---

## 4. Docker Setup (Easiest — One Command)

This is the **recommended** way. Docker runs everything in containers so you don't need to install PostgreSQL, Redis, etc. separately.

### Step 1: Clone the project

```bash
cd ~/Documents/Project
git clone <your-repo-url> ZTForge   # or you already have it
cd ZTForge
```

### Step 2: Create .env file

```bash
cp .env.example .env
```

This copies the template. For local dev, the defaults work fine. **Never commit .env to git.**

### Step 3: Start everything

```bash
docker compose up --build
```

**What happens behind the scenes:**
1. Docker downloads PostgreSQL 16, Redis 7, Keycloak 26, OPA 0.70 images
2. Docker builds the backend (installs Python deps) and frontend (installs npm deps, builds)
3. PostgreSQL starts first, then Redis, then Keycloak, then OPA
4. Backend waits for all of them to be healthy, then starts
5. Frontend (nginx) starts last

**First run takes 3-5 minutes** (downloading images). After that, ~30 seconds.

### Step 4: Access the app

| What | URL | Login |
|------|-----|-------|
| **Frontend** | http://localhost:3000 | Login via Keycloak |
| **Backend API Docs** | http://localhost:8000/api/docs | — |
| **Keycloak Admin** | http://localhost:8080 | admin / admin |
| **OPA** | http://localhost:8181 | — |

### Step 5: Login flow

1. Go to http://localhost:3000
2. The app redirects you to Keycloak login page (http://localhost:8080)
3. Login with: `admin` / `admin123` (or `editor` / `editor123`)
4. Keycloak redirects back to the app with a JWT token
5. The frontend stores the token and includes it in every API request

### Stopping

```bash
# Stop all services
docker compose down

# Stop and DELETE all data (fresh start)
docker compose down -v
```

### Rebuilding after code changes

```bash
docker compose up --build   # rebuilds changed services
```

---

## 5. Manual Dev Setup (No Docker)

Use this when you want hot-reload and faster development iteration.

### Step 1: Set up PostgreSQL

```bash
# Create a database and user
sudo -u postgres psql

# Inside psql:
CREATE USER ztforge WITH PASSWORD 'ztforge123';
CREATE DATABASE ztforge OWNER ztforge;
GRANT ALL PRIVILEGES ON DATABASE ztforge TO ztforge;
\q
```

### Step 2: Make sure Redis is running

```bash
sudo systemctl start redis
redis-cli ping    # Should print: PONG
```

### Step 3: Set up the Backend

```bash
cd /home/gin/Documents/Project/ZTForge/backend

# Create a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate    # YOUR TERMINAL PROMPT CHANGES to (.venv)

# Install all Python packages
pip install -r requirements.txt

# Set environment variables (do this EVERY time you open a new terminal)
export DATABASE_URL="postgresql+asyncpg://ztforge:ztforge123@localhost:5432/ztforge"
export REDIS_URL="redis://localhost:6379/0"
export SECRET_KEY="dev-secret-key-change-in-prod-at-least-16-chars"
export ALLOWED_ORIGINS="http://localhost:5173"
export LOG_LEVEL="DEBUG"
export KEYCLOAK_URL="http://localhost:8080"
export KEYCLOAK_REALM="ztforge"
export KEYCLOAK_CLIENT_ID="ztforge-app"
export OPA_URL="http://localhost:8181"
export ENABLE_BREACH_SIMULATION="true"
export ENABLE_POLICY_HUB="true"

# Run database migrations (creates tables)
# First time only:
alembic revision --autogenerate -m "initial"
alembic upgrade head

# Start the backend server
uvicorn app.main:asgi_app --reload --host 0.0.0.0 --port 8000
```

**The `--reload` flag** means the server restarts automatically when you edit Python files. Don't use in production.

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Started reloader process
```

### Step 4: Set up the Frontend (new terminal)

```bash
cd /home/gin/Documents/Project/ZTForge/frontend

# Install npm packages
npm install

# Start the dev server
npm run dev
```

You should see:
```
VITE v6.4.2  ready in 299 ms
➜  Local:   http://localhost:5173/
```

### Step 5: Access

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/api/docs
- The frontend proxies `/api/*` to the backend automatically (configured in `vite.config.ts`)

### Optional: Run Keycloak locally

```bash
# Run just Keycloak in Docker (even if rest is manual)
docker run -d --name keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -e KC_HEALTH_ENABLED=true \
  -v $(pwd)/docker/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro \
  quay.io/keycloak/keycloak:26.0 start-dev --import-realm
```

### Optional: Run OPA locally

```bash
docker run -d --name opa \
  -p 8181:8181 \
  -v $(pwd)/opa/policies:/policies:ro \
  openpolicyagent/opa:0.70.0 run --server --addr=0.0.0.0:8181 /policies
```

---

## 6. How Frontend and Backend Connect

### REST API Connection

The frontend calls the backend via HTTP requests. Here's the flow:

```
Frontend (browser)                    Backend (FastAPI)
─────────────────                    ─────────────────
1. User clicks "New Canvas"
2. api.ts calls POST /api/v1/canvases ──→ 3. canvas.py receives request
                                          4. Validates JWT token
                                          5. Creates row in PostgreSQL
                                          6. Returns JSON response
7. Dashboard updates with new canvas  ←── 
```

**Where this is configured:**

- Frontend API client: `frontend/src/lib/api.ts`
  - All API calls go through this file
  - It adds the JWT `Authorization: Bearer <token>` header automatically
  - Base URL: `/api/v1` (proxied to backend by Vite in dev, nginx in prod)

- Vite proxy (dev mode): `frontend/vite.config.ts`
  ```ts
  proxy: {
    "/api": { target: "http://localhost:8000" },
    "/socket.io": { target: "http://localhost:8000", ws: true },
  }
  ```
  This means: when the browser requests `/api/anything`, Vite forwards it to `localhost:8000/api/anything`. This avoids CORS issues in development.

- Nginx proxy (Docker/prod): `frontend/nginx.conf`
  Same thing but for production — nginx forwards `/api/` to the backend container.

### WebSocket Connection (Real-time)

```
Frontend                              Backend
────────                              ───────
1. User opens a canvas
2. socket.ts connects to Socket.io ──→ 3. collab_manager.py accepts
4. Joins room "canvas-abc-123"    ──→ 5. Adds user to room
6. User drags a node              ──→ 7. Broadcasts to room members
8. Other users see the node move  ←── 
```

**Where this is configured:**
- Frontend: `frontend/src/lib/socket.ts` — creates the Socket.io connection
- Backend: `backend/app/services/collab_manager.py` — handles all socket events
- Mounted in: `backend/app/main.py` — Socket.io wraps the FastAPI ASGI app

### Authentication Flow

```
Browser              Keycloak              Backend
───────              ────────              ───────
1. Click Login ──→ 2. Shows login page
3. Enter creds ──→ 4. Validates password
                   5. Returns auth code
6. Send code   ─────────────────────────→ 7. Exchanges code for tokens
                                           8. Validates JWT with JWKS
                                           9. Creates/updates user in DB
10. Receives    ←──────────────────────── 11. Returns access + refresh token
    tokens
12. Stores in memory
13. Every API request includes:
    Authorization: Bearer <access_token>
```

---

## 7. Complete User Workflow

### Creating a Zero Trust Architecture

1. **Login** → Dashboard shows your canvases
2. **Click "New Canvas"** → Opens the canvas editor
3. **Add nodes from toolbar** (left side):
   - 👤 **Identity** = users, groups, service accounts
   - 💻 **Device** = laptops, phones, servers
   - 🖥️ **Application** = APIs, web apps, microservices
   - 🗄️ **Data** = databases, file stores, classified data
   - 🌐 **Network Segment** = VLANs, subnets, DMZ
   - 🛡️ **Policy Gate** = enforcement points
4. **Connect nodes with edges** (drag from right handle to left handle)
5. **Attach policies to edges** — define who can access what and under what conditions
6. **Run breach simulation** (click Simulate button):
   - Choose a scenario (stolen credential, compromised device, etc.)
   - The system shows the attack path — which nodes the attacker reaches
   - Color-coded: 🟢 blocked, 🔴 compromised
   - Risk score 0-100 with recommendations
7. **Export** → Download as Rego/Terraform/iptables/Pomerium config
8. **Share** → Publish as a template on Policy Hub for others to fork

### Running a Breach Simulation

The simulator is the core feature. Here's what happens:

1. You click "Run Simulation" with scenario "Stolen Credential"
2. Backend loads your canvas (nodes + edges + policies)
3. Simulator builds a graph and starts at the attacker's position
4. For each edge the attacker tries to cross, it checks:
   - ❌ Is there an explicit "allow" policy? (no = BLOCKED, default deny)
   - ❌ Does the policy require MFA? Did the attacker complete MFA?
   - ❌ Does the policy require a compliant device? Is the device compliant?
   - ❌ Is there a time restriction? Is the attacker operating outside hours?
   - ❌ Is microsegmentation enforced? Is the attacker crossing segments?
5. Result: attack path, risk score, recommendations

---

## 8. Services Explained

### PostgreSQL (Database)
- **Port:** 5432
- **What it stores:** Users, canvases (nodes/edges as JSON), policies, templates
- **How backend connects:** SQLAlchemy ORM with async driver (asyncpg)
- **Config:** `DATABASE_URL` environment variable

### Redis (Cache)
- **Port:** 6379
- **What it stores:** Rate limiting counters, collaboration presence (who's online)
- **Why not PostgreSQL?** Redis is in-memory = microsecond reads. Rate limiting needs to check 10+ times per second per user. PostgreSQL would be too slow.
- **Config:** `REDIS_URL` environment variable

### Keycloak (Authentication)
- **Port:** 8080
- **What it does:** Login page, password storage, JWT token issuance, role management
- **Why separate?** Never build your own auth. Keycloak handles password hashing (bcrypt), session management, MFA, password reset — all battle-tested.
- **Realm:** `ztforge` (pre-configured via realm-export.json)
- **Roles:** admin, editor, viewer, guest

### OPA — Open Policy Agent (Policy Engine)
- **Port:** 8181
- **What it does:** Evaluates Rego policies at runtime
- **How it works:** Backend sends a JSON question ("can user X access resource Y?"), OPA responds with allow/deny
- **Policies location:** `opa/policies/*.rego`
- **Fail-closed:** If OPA is unreachable, the backend denies everything (security-first)

---

## 9. How to Deploy to the Internet

### Option A: VPS (DigitalOcean, Hetzner, AWS EC2)

**Cost: ~$5-20/month**

#### Step 1: Get a VPS

- DigitalOcean: Create a Droplet (Ubuntu 24.04, 2GB RAM minimum)
- You'll get an IP address like `143.198.xx.xx`

#### Step 2: Point your domain

Buy a domain (Namecheap, Cloudflare, ~$10/year). Add DNS records:

```
A    ztforge.yourdomain.com    → 143.198.xx.xx
A    auth.yourdomain.com       → 143.198.xx.xx    (for Keycloak)
```

#### Step 3: SSH into server and install Docker

```bash
ssh root@143.198.xx.xx

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose (comes with modern Docker)
docker compose version    # verify
```

#### Step 4: Clone and configure

```bash
git clone <your-repo-url> /opt/ztforge
cd /opt/ztforge
cp .env.example .env
nano .env    # Edit with your real values:
```

**Change these in .env for production:**
```env
SECRET_KEY=<run: openssl rand -hex 32>
POSTGRES_PASSWORD=<strong random password>
KEYCLOAK_ADMIN_PASSWORD=<strong random password>
ALLOWED_ORIGINS=https://ztforge.yourdomain.com
```

#### Step 5: Add HTTPS with Caddy (reverse proxy)

Create a `Caddyfile` in the project root:

```
ztforge.yourdomain.com {
    reverse_proxy frontend:80
}

auth.yourdomain.com {
    reverse_proxy keycloak:8080
}
```

Add Caddy to `docker-compose.yml`:
```yaml
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - frontend
      - keycloak

volumes:
  caddy_data:
```

Caddy automatically gets Let's Encrypt SSL certificates. No manual cert setup.

#### Step 6: Update Keycloak redirect URLs

Edit `docker/keycloak/realm-export.json`:
```json
"redirectUris": ["https://ztforge.yourdomain.com/*"],
"webOrigins": ["https://ztforge.yourdomain.com"]
```

#### Step 7: Deploy

```bash
docker compose up -d --build
```

The `-d` flag runs in background (detached mode).

#### Step 8: Verify

```bash
# Check all services are running
docker compose ps

# Check logs if something is wrong
docker compose logs backend
docker compose logs keycloak
```

Visit `https://ztforge.yourdomain.com` — you should see the dashboard.

### Option B: Railway / Render (PaaS — easier but less control)

These platforms handle servers for you. You push code, they deploy.

1. Create accounts on Railway (railway.app) or Render (render.com)
2. Connect your GitHub repo
3. Add services: PostgreSQL, Redis (they provide these as add-ons)
4. Set environment variables in their dashboard
5. Deploy

**Limitation:** Keycloak and OPA need separate services, which can get expensive on PaaS platforms. The VPS approach is more practical for this stack.

### Option C: Self-hosted Homelab

Same as VPS but on your own hardware. Use a Raspberry Pi 4 (4GB+ RAM) or old laptop:

```bash
# Install Docker on Raspberry Pi
curl -fsSL https://get.docker.com | sh
# Clone and run same as VPS
```

Use Cloudflare Tunnel for HTTPS without opening ports:
```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ztforge
cloudflared tunnel route dns ztforge ztforge.yourdomain.com

# Run tunnel
cloudflared tunnel --url http://localhost:3000 run ztforge
```

---

## 10. Troubleshooting

### "docker: command not found"
Docker isn't installed. See Prerequisites section.

### "port 5432 already in use"
Another PostgreSQL is running. Either stop it (`sudo systemctl stop postgresql`) or change the port in docker-compose.yml.

### "CORS error" in browser console
The backend's `ALLOWED_ORIGINS` doesn't include your frontend URL. Check `.env` file.

### Backend crashes with "connection refused to postgres"
PostgreSQL isn't ready yet. Docker Compose health checks should handle this, but if manual: wait a few seconds and retry.

### "401 Unauthorized" on every API call
JWT token is invalid or expired. Check:
1. Keycloak is running (`http://localhost:8080`)
2. The realm `ztforge` exists
3. The client `ztforge-app` exists in Keycloak
4. `KEYCLOAK_URL` in backend points to reachable Keycloak

### Frontend shows blank page
Check browser console (F12 → Console tab). Common causes:
- JavaScript error in a component
- API URL not reachable
- Missing environment variable

### "Module not found" in Python
You forgot to activate the virtual environment:
```bash
source .venv/bin/activate
```

### Tests fail
```bash
cd backend
source .venv/bin/activate
python -m pytest tests/ -v    # see which test failed and why
```

---

## 11. File Map — What Each File Does

### Backend — "The Brain"

```
backend/
├── app/
│   ├── main.py              ← THE ENTRY POINT. Creates FastAPI app,
│   │                           adds middleware, registers routes,
│   │                           mounts Socket.io. Uvicorn runs this.
│   │
│   ├── core/                ← Shared infrastructure code
│   │   ├── config.py        ← Reads .env file, validates all settings
│   │   │                       at startup. If DATABASE_URL is missing,
│   │   │                       the app crashes immediately (fail fast).
│   │   ├── security.py      ← JWT validation. Fetches Keycloak's public
│   │   │                       keys (JWKS), caches them 5 min, decodes
│   │   │                       tokens. Also: Redis rate limiter.
│   │   ├── dependencies.py  ← FastAPI "Depends()" functions. These get
│   │   │                       injected into route handlers. get_db()
│   │   │                       gives a DB session, get_current_user()
│   │   │                       extracts user from JWT.
│   │   └── logging.py       ← Structured JSON logging. Audit logger
│   │                           for security events (who did what when).
│   │
│   ├── models/              ← SQLAlchemy ORM models (Python ↔ DB tables)
│   │   ├── user.py          ← users table. Synced from Keycloak.
│   │   ├── canvas.py        ← canvases table. Nodes/edges as JSONB.
│   │   ├── policy.py        ← policies table. Rego rules + conditions.
│   │   └── template.py      ← templates table. Community hub, forkable.
│   │
│   ├── schemas/             ← Pydantic models (request/response validation)
│   │   ├── canvas.py        ← What a valid canvas create/update looks like
│   │   ├── policy.py        ← What a valid policy looks like
│   │   └── simulation.py    ← Simulation request/result + 8 scenarios
│   │
│   ├── api/v1/              ← HTTP route handlers (the actual endpoints)
│   │   ├── auth.py          ← POST /auth/token, /auth/refresh, GET /auth/me
│   │   ├── canvas.py        ← CRUD for canvases with version conflict detection
│   │   ├── policies.py      ← CRUD for policies attached to canvases
│   │   ├── simulation.py    ← POST /simulation/run — runs breach sim
│   │   ├── users.py         ← GET /users/me — user profile
│   │   └── hub.py           ← Template marketplace + config export
│   │
│   ├── services/            ← Business logic (not HTTP-specific)
│   │   ├── simulator.py     ← THE BREACH SIMULATOR. Graph traversal,
│   │   │                       7 security rules, risk scoring.
│   │   ├── policy_engine.py ← Talks to OPA via HTTP. Also exports
│   │   │                       canvas as Rego/Terraform/iptables/Pomerium.
│   │   ├── collab_manager.py← Socket.io event handlers. Rooms, cursors,
│   │   │                       presence, real-time node/edge sync.
│   │   └── enforcement.py   ← Demo: queries OPA for access decisions.
│   │
│   └── utils/
│       └── validators.py    ← Canvas structure validation (no self-loops,
│                               valid node types, no orphaned edges).
│
├── tests/                   ← pytest test files
│   ├── test_simulation.py   ← Tests the breach simulator rules
│   ├── test_validators.py   ← Tests input validation
│   └── test_canvas.py       ← Tests Pydantic schema validation
│
├── alembic/                 ← Database migration tool
│   └── env.py               ← Alembic config for async SQLAlchemy
│
├── requirements.txt         ← Python dependencies
└── Dockerfile               ← How to build the backend container
```

### Frontend — "The Face"

```
frontend/
├── src/
│   ├── main.tsx             ← Entry point. Renders <App /> into the DOM.
│   ├── App.tsx              ← React Router: / → Dashboard, /canvas/:id, /hub
│   ├── index.css            ← TailwindCSS import + dark mode styles
│   │
│   ├── lib/                 ← Shared utilities
│   │   ├── types.ts         ← TypeScript interfaces matching backend schemas
│   │   ├── api.ts           ← HTTP client. All API calls go through here.
│   │   │                       Handles auth token, error wrapping.
│   │   └── socket.ts        ← Socket.io client. Typed event emitters.
│   │
│   ├── hooks/
│   │   └── useCanvas.ts     ← THE MAIN HOOK. Loads canvas from API,
│   │                           subscribes to Socket.io for real-time,
│   │                           auto-saves every 2 seconds.
│   │
│   ├── components/
│   │   ├── Canvas.tsx        ← React Flow wrapper with minimap, controls
│   │   ├── Toolbar.tsx       ← Node creation buttons (left sidebar)
│   │   ├── CollaborationPanel.tsx ← Shows who's online (colored dots)
│   │   ├── SimulatorPanel.tsx← Breach sim controls + results display
│   │   ├── PolicyHub.tsx     ← Template browser with search + fork
│   │   └── NodeTypes/
│   │       └── index.tsx     ← 6 custom nodes with distinct colors/icons
│   │
│   └── pages/
│       ├── Dashboard.tsx     ← Landing page: canvas list, quick actions
│       ├── CanvasPage.tsx    ← Full-screen editor with side panels
│       └── HubPage.tsx       ← Community template marketplace
│
├── index.html               ← HTML shell (loads fonts, mounts React)
├── package.json             ← npm dependencies
├── vite.config.ts           ← Vite config: API proxy, TailwindCSS plugin
├── tsconfig.json            ← TypeScript strict mode config
├── nginx.conf               ← Production: SPA routing + API proxy
└── Dockerfile               ← Multi-stage: npm build → nginx serve
```

### Infrastructure

```
docker-compose.yml           ← Defines all 6 services + health checks
docker/keycloak/
  └── realm-export.json      ← Pre-configured realm: 4 roles, 3 users, OIDC client
opa/policies/
  ├── base.rego              ← Default deny rule
  ├── breach_simulation.rego ← Simulation rules in Rego (mirrors Python simulator)
  └── enforcement.rego       ← Runtime access decisions
.env.example                 ← Template for environment variables
```

---

## Quick Reference Commands

```bash
# ── Docker ──────────────────────────
docker compose up --build        # Start everything
docker compose down              # Stop everything
docker compose down -v           # Stop + delete all data
docker compose logs backend      # View backend logs
docker compose ps                # Check service status
docker compose exec backend bash # Shell into backend container

# ── Backend Dev ─────────────────────
cd backend
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:asgi_app --reload --port 8000
python -m pytest tests/ -v

# ── Frontend Dev ────────────────────
cd frontend
npm install
npm run dev                      # Dev server with hot-reload
npm run build                    # Production build
npx tsc --noEmit                 # Type-check without building

# ── Database ────────────────────────
alembic revision --autogenerate -m "description"  # Create migration
alembic upgrade head                              # Apply migrations
alembic downgrade -1                              # Rollback one step
```
