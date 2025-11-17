# 🐳 Docker Setup Guide - Descript-Style Video Editor

Complete guide to running the application using Docker and Docker Compose.

---

## 📋 Prerequisites

- **Docker**: Version 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0+ (usually included with Docker Desktop)
- **API Keys**:
  - OpenAI API Key ([Get it here](https://platform.openai.com/api-keys))
  - Pexels API Key ([Get it here](https://www.pexels.com/api/)) - Free!

---

## 🚀 Quick Start (Production)

### 1. Clone and Setup Environment

```bash
# Navigate to project directory
cd dscript_editor

# Copy environment template
cp env.example .env

# Edit .env and add your API keys
nano .env  # or use your preferred editor
```

**Add your API keys to `.env`:**
```env
OPENAI_API_KEY=sk-your-actual-openai-key-here
PEXELS_API_KEY=your-actual-pexels-key-here
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes uploaded files)
docker-compose down -v
```

---

## 🛠️ Development Mode

For development with hot-reload:

```bash
# Start in development mode
docker-compose -f docker-compose.dev.yml up

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml up --build

# Stop development services
docker-compose -f docker-compose.dev.yml down
```

**Development URLs:**
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend API**: http://localhost:3001

**Features:**
- ✅ Hot reload for frontend (Vite HMR)
- ✅ Hot reload for backend (nodemon)
- ✅ Source code mounted as volumes
- ✅ All dev dependencies installed

---

## 📂 Project Structure

```
dscript_editor/
├── docker-compose.yml           # Production configuration
├── docker-compose.dev.yml       # Development configuration
├── .env                         # Environment variables (create from env.example)
├── env.example                  # Environment template
├── DOCKER-SETUP.md             # This file
│
├── backend/
│   ├── Dockerfile              # Production backend image
│   ├── Dockerfile.dev          # Development backend image
│   ├── .dockerignore          # Files to exclude from image
│   ├── server.js              # Express server
│   ├── package.json
│   ├── uploads/               # Mounted volume (persists)
│   ├── exports/               # Mounted volume (persists)
│   └── temp/                  # Mounted volume (persists)
│
└── frontend/
    ├── Dockerfile              # Production frontend image
    ├── Dockerfile.dev          # Development frontend image
    ├── .dockerignore          # Files to exclude from image
    ├── nginx.conf             # Nginx config for production
    └── package.json
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for Whisper & GPT | ✅ Yes | - |
| `PEXELS_API_KEY` | Pexels API key for stock videos | ✅ Yes | - |
| `PORT` | Backend server port | No | 3001 |
| `NODE_ENV` | Environment (development/production) | No | production |
| `UPLOAD_DIR` | Upload directory path | No | /app/uploads |
| `VITE_API_URL` | Backend API URL for frontend | No | http://localhost:3001 |

### Docker Compose Services

#### Backend Service
- **Image**: Node.js 18 + FFmpeg
- **Port**: 3001
- **Volumes**: 
  - `./backend/uploads` → `/app/uploads` (uploaded videos)
  - `./backend/exports` → `/app/exports` (exported videos)
  - `./backend/temp` → `/app/temp` (temporary files)
- **Health Check**: Checks `/api/health` endpoint every 30s

#### Frontend Service
- **Image**: Nginx Alpine
- **Port**: 3000 (mapped to internal 80 in production) / 3000 (development)
- **Build**: Multi-stage build (React build → Nginx serve)
- **Proxy**: API requests forwarded to backend

---

## 📝 Common Commands

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 -f
```

### Rebuilding Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### Managing Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect dscript_editor_backend-uploads

# Remove unused volumes
docker volume prune
```

### Accessing Containers

```bash
# Open shell in backend container
docker-compose exec backend sh

# Open shell in frontend container
docker-compose exec frontend sh

# Run command in backend
docker-compose exec backend node -v
```

### Cleaning Up

```bash
# Stop and remove containers
docker-compose down

# Remove containers, networks, and volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all

# Clean up Docker system
docker system prune -a
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 3001
lsof -i :3001

# Change ports in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead of 3000
```

### FFmpeg Not Working

```bash
# Check FFmpeg inside container
docker-compose exec backend ffmpeg -version

# Rebuild backend image
docker-compose build --no-cache backend
```

### API Keys Not Working

```bash
# Check environment variables
docker-compose exec backend env | grep API_KEY

# Verify .env file exists and has correct keys
cat .env

# Restart services after updating .env
docker-compose restart
```

### Volume Permission Issues

```bash
# Fix permissions on host
sudo chown -R $USER:$USER backend/uploads backend/exports backend/temp

# Or run with sudo
sudo docker-compose up -d
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images, containers, volumes
docker system prune -a --volumes

# Check uploads directory size
du -sh backend/uploads
```

### Container Exits Immediately

```bash
# Check container logs
docker-compose logs backend

# Run container interactively
docker-compose run --rm backend sh

# Check health status
docker-compose ps
```

---

## 🎯 Best Practices

### Production Deployment

1. **Use Environment Variables**: Never commit `.env` file
2. **Set Resource Limits**: Add memory/CPU limits to `docker-compose.yml`
3. **Use Secrets**: For production, use Docker secrets instead of env vars
4. **Enable HTTPS**: Add SSL certificates and update nginx config
5. **Set Up Monitoring**: Use Docker health checks and monitoring tools
6. **Backup Volumes**: Regularly backup `uploads/` and `exports/` directories
7. **Update Regularly**: Keep base images and dependencies updated

### Security

```yaml
# Add to docker-compose.yml for production
services:
  backend:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

### Resource Limits

```yaml
# Add to docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

---

## 🔄 Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Restart services
docker-compose up -d

# Check everything is working
docker-compose ps
docker-compose logs -f
```

---

## 📊 Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Check service health status
docker-compose ps
```

### Resource Usage

```bash
# Container stats
docker stats

# Detailed container info
docker-compose exec backend top
```

---

## 🆘 Getting Help

- **Docker Logs**: `docker-compose logs -f`
- **Container Shell**: `docker-compose exec backend sh`
- **Health Status**: `docker-compose ps`
- **Docker Docs**: https://docs.docker.com/
- **OpenAI Issues**: Check API key and quota
- **FFmpeg Issues**: Verify FFmpeg is installed in container

---

## 📄 License

This Docker configuration is part of the Descript-Style Video Editor project.

---

**Happy Dockerizing! 🐳**

