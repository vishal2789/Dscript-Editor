# Quick Restart Guide - No Rebuild Needed

## ✅ If Using Development Mode (docker-compose.dev.yml)

Your code is **mounted as a volume**, so you **DON'T need to rebuild**! Just restart:

```bash
# Stop and restart containers (preserves volumes)
docker-compose -f docker-compose.dev.yml restart backend

# OR if containers are running, just restart backend
docker restart dscript-backend-dev
```

The Python script changes will be picked up immediately since the code is mounted.

## 🔄 If You Must Rebuild (Production Mode)

If you're using production mode or need to rebuild, you can optimize:

### Option 1: Rebuild Only Backend (Faster)
```bash
# Only rebuild backend, not frontend
docker-compose build backend

# Start it
docker-compose up -d backend
```

### Option 2: Use Build Cache (Skip MediaPipe Reinstall)
If MediaPipe is already installed, Docker will use cache:

```bash
# Rebuild with cache
docker-compose build --no-cache=false backend
```

### Option 3: Quick Rebuild (Skip Python Dependencies)
If you only changed Python code and MediaPipe is already installed:

```bash
# Rebuild but keep Python venv layer cached
docker-compose build backend
```

## ⚡ Fastest Option: Just Restart (Dev Mode)

**If you're in development mode, you don't need to rebuild at all:**

```bash
# Just restart - code changes are already mounted
docker-compose -f docker-compose.dev.yml restart backend
```

## 🔍 Check Which Mode You're Using

```bash
# Check running containers
docker ps

# If you see "dscript-backend-dev" → Dev mode (just restart)
# If you see "dscript-backend" → Production mode (may need rebuild)
```

## 💡 Pro Tip

In development mode, your Python script changes are **live** because:
- `./backend:/app` volume mount syncs your code
- No rebuild needed for code changes
- Only rebuild if you change `requirements.txt` or Dockerfile

---

**TL;DR:** If using dev mode → `docker-compose -f docker-compose.dev.yml restart backend`

