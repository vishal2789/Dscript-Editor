# 🚀 Docker Quick Start

Get the Descript-Style Video Editor running in 3 minutes!

---

## ⚡ Super Quick Start (3 steps)

```bash
# 1. Set up environment
cp env.example .env
nano .env  # Add your OPENAI_API_KEY and PEXELS_API_KEY

# 2. Start everything
./start.sh

# 3. Open browser
# → http://localhost:3000
```

Done! 🎉

---

## 📋 Prerequisites

- Docker Desktop installed ([Download](https://docs.docker.com/get-docker/))
- OpenAI API Key ([Get free key](https://platform.openai.com/api-keys))
- Pexels API Key ([Get free key](https://www.pexels.com/api/)) 

---

## 🎯 Step-by-Step Guide

### 1️⃣ Clone & Setup

```bash
cd dscript_editor

# Copy environment template
cp env.example .env
```

### 2️⃣ Add API Keys

Edit `.env` file:
```env
OPENAI_API_KEY=sk-your-actual-key-here
PEXELS_API_KEY=your-actual-key-here
```

### 3️⃣ Start Application

**Option A - Using Script (Recommended):**
```bash
./start.sh
```

**Option B - Using Docker Compose:**
```bash
docker-compose up -d
```

**Option C - Using Makefile:**
```bash
make up
```

### 4️⃣ Access Application

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Health**: http://localhost:3001/api/health

---

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Restart
docker-compose restart

# Rebuild
docker-compose up -d --build
```

---

## 🐛 Quick Fixes

### Port 3000 already in use?
```bash
# Edit docker-compose.yml and change:
ports:
  - "8080:80"  # Use 8080 instead

# Then access at: http://localhost:8080
```

### API Keys not working?
```bash
# Check if .env is loaded
docker-compose exec backend env | grep API_KEY

# Restart after editing .env
docker-compose restart
```

### Need to clean up?
```bash
# Remove everything and start fresh
docker-compose down -v
docker-compose up -d --build
```

---

## 📚 Full Documentation

For detailed information, see **[DOCKER-SETUP.md](DOCKER-SETUP.md)**

- Development mode setup
- Troubleshooting guide
- Production deployment
- Security best practices
- Resource monitoring

---

## 🎬 What's Included?

✅ **Backend**: Node.js + Express + FFmpeg + OpenAI  
✅ **Frontend**: React + Vite + Tailwind  
✅ **Auto-reload**: In development mode  
✅ **Health checks**: Automatic service monitoring  
✅ **Persistent storage**: Videos saved between restarts  

---

## 💡 Tips

1. **First build takes 3-5 minutes** (installs FFmpeg)
2. **Keep .env file secure** (never commit it)
3. **Use development mode** for coding: `docker-compose -f docker-compose.dev.yml up`
4. **Check logs** if something breaks: `docker-compose logs -f`

---

**Need help?** Check [DOCKER-SETUP.md](DOCKER-SETUP.md) for detailed docs!

