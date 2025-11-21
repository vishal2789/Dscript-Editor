# MediaPipe Background Removal - Quick Start (Docker)

## 🚀 Quick Setup Commands

### For Production Environment

```bash
# 1. Stop containers
docker-compose down

# 2. Rebuild backend (takes 5-10 minutes)
docker-compose build backend

# 3. Start containers
docker-compose up -d

# 4. Verify installation
docker exec dscript-backend /opt/venv/bin/python3 --version
docker exec dscript-backend /opt/venv/bin/python3 -c "import mediapipe; print('MediaPipe OK')"

# 5. Check logs
docker-compose logs -f backend
```

### For Development Environment

```bash
# 1. Stop containers
docker-compose -f docker-compose.dev.yml down

# 2. Rebuild backend (takes 5-10 minutes)
docker-compose -f docker-compose.dev.yml build backend

# 3. Start containers
docker-compose -f docker-compose.dev.yml up -d

# 4. Verify installation
docker exec dscript-backend-dev python3 --version
docker exec dscript-backend-dev python3 -c "import mediapipe; print('MediaPipe OK')"

# 5. Check logs
docker-compose -f docker-compose.dev.yml logs -f backend
```

## ✅ Verification Checklist

Run these commands to verify everything is working:

```bash
# Check Python (virtual environment)
docker exec dscript-backend /opt/venv/bin/python3 --version

# Check MediaPipe
docker exec dscript-backend /opt/venv/bin/python3 -c "import mediapipe; print(mediapipe.__version__)"

# Check OpenCV
docker exec dscript-backend /opt/venv/bin/python3 -c "import cv2; print(cv2.__version__)"

# Check NumPy
docker exec dscript-backend /opt/venv/bin/python3 -c "import numpy; print(numpy.__version__)"
```

## 🧪 Test the Feature

1. Open http://localhost:3000
2. Select a scene
3. Click "+" under Background in right sidebar
4. Choose image or color
5. Click "Apply background"
6. Wait for processing (progress overlay will show)

## 🔧 Common Issues

**Python not found:**
```bash
docker-compose build --no-cache backend
```

**MediaPipe import error:**
```bash
docker exec dscript-backend /opt/venv/bin/pip install --upgrade mediapipe opencv-python numpy
```

**Permission denied:**
```bash
docker exec dscript-backend chmod +x /app/services/mediapipe_bg_removal.py
```

## 📚 Full Documentation

See `MEDIAPIPE_DOCKER_SETUP.md` for detailed setup instructions and troubleshooting.

