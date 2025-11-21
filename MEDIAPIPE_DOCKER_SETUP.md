# MediaPipe Background Removal - Docker Setup Guide

This guide explains how to set up and use the MediaPipe background removal feature in your Docker environment.

## 📋 Prerequisites

- Docker and Docker Compose installed
- At least 2GB of free disk space (MediaPipe dependencies are large)
- Docker containers currently running (if any)

## 🚀 Setup Steps

### Step 1: Stop Running Containers

If you have containers currently running, stop them first:

```bash
# For production
docker-compose down

# OR for development
docker-compose -f docker-compose.dev.yml down
```

### Step 2: Rebuild Backend Container

The backend Dockerfile has been updated to include Python 3 and MediaPipe. Rebuild the backend container:

```bash
# For production
docker-compose build backend

# OR for development
docker-compose -f docker-compose.dev.yml build backend
```

**⏱️ Note:** This step will take **5-10 minutes** because:
- Python 3 and pip need to be installed
- MediaPipe and OpenCV are large packages (~500MB+)
- NumPy and other dependencies need to compile

### Step 3: Start Containers

After rebuilding, start your containers:

```bash
# For production
docker-compose up -d

# OR for development
docker-compose -f docker-compose.dev.yml up -d
```

### Step 4: Verify Installation

Verify that Python and MediaPipe are properly installed in the backend container:

```bash
# Check Python version (using virtual environment)
docker exec dscript-backend /opt/venv/bin/python3 --version
# Should output: Python 3.x.x

# Check if MediaPipe is installed
docker exec dscript-backend /opt/venv/bin/python3 -c "import mediapipe; print('MediaPipe version:', mediapipe.__version__)"
# Should output: MediaPipe version: 0.10.x or higher

# Check if OpenCV is installed
docker exec dscript-backend /opt/venv/bin/python3 -c "import cv2; print('OpenCV version:', cv2.__version__)"
# Should output: OpenCV version: 4.x.x

# Check if NumPy is installed
docker exec dscript-backend /opt/venv/bin/python3 -c "import numpy; print('NumPy version:', numpy.__version__)"
# Should output: NumPy version: 1.x.x
```

### Step 5: Check Backend Logs

Monitor the backend logs to ensure everything is working:

```bash
# For production
docker-compose logs -f backend

# OR for development
docker-compose -f docker-compose.dev.yml logs -f backend
```

Look for any Python-related errors. The backend should start normally.

## 🧪 Testing the Feature

1. **Start the application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

2. **Test background removal:**
   - Upload or select a video project
   - Select a scene in the timeline
   - In the right sidebar, click the "+" button under "Background"
   - Choose either:
     - An image from the gallery
     - A solid color
   - Click "Apply background"
   - You should see a progress overlay showing:
     - "Processing background removal..."
     - "Rebuilding timeline..."
     - "Refreshing view..."
     - "Background applied successfully!"

3. **Verify the result:**
   - The video preview should show the new background
   - The timeline frames should update
   - The scene should have the new background applied

## 🔧 Troubleshooting

### Issue: Python not found in container

**Solution:**
```bash
# Rebuild the container
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Issue: MediaPipe import errors

**Solution:**
```bash
# Check if requirements.txt is being copied
docker exec dscript-backend ls -la /app/requirements.txt

# Check if virtual environment exists
docker exec dscript-backend ls -la /opt/venv/bin/

# Manually install if needed (using virtual environment)
docker exec dscript-backend /opt/venv/bin/pip install opencv-python mediapipe numpy
```

### Issue: "Permission denied" when running Python script

**Solution:**
```bash
# Make the script executable
docker exec dscript-backend chmod +x /app/services/mediapipe_bg_removal.py
```

### Issue: Background removal fails with "No module named 'cv2'"

**Solution:**
```bash
# Reinstall OpenCV (using virtual environment)
docker exec dscript-backend /opt/venv/bin/pip install --upgrade opencv-python
```

### Issue: Container runs out of memory during MediaPipe processing

**Solution:**
- Increase Docker memory limit (Docker Desktop → Settings → Resources)
- Process shorter scenes
- Use lower resolution videos

### Issue: Background images from frontend not loading

**Solution:**
- Ensure frontend is accessible at `http://localhost:3000`
- Check that `/assets/backgrounds/` files are being served
- Verify network connectivity between containers

## 📝 Important Notes

### Performance Considerations

1. **Processing Time:**
   - Small scenes (5-10 seconds): ~30-60 seconds
   - Medium scenes (30-60 seconds): ~2-5 minutes
   - Large scenes (2+ minutes): ~5-15 minutes

2. **Resource Usage:**
   - MediaPipe uses CPU (no GPU required)
   - Each frame processing uses ~100-200MB RAM
   - Temporary files are cleaned up after processing

3. **Best Practices:**
   - Process one scene at a time
   - Use shorter scenes for faster results
   - Monitor container logs for errors

### Model Limitations

- **MediaPipe Selfie Segmentation** works best with:
  - People in the foreground
  - Clear separation between subject and background
  - Good lighting conditions
  
- **May not work well with:**
  - Animals or objects (not people)
  - Complex backgrounds
  - Low-quality or blurry footage

### File Structure

After processing, temporary files are stored in:
```
backend/temp/bg-remove-{jobId}/
  ├── frames/
  │   ├── frame_0001.jpg
  │   ├── masks/
  │   └── composites/
  └── processed-scene.mp4
```

These are automatically cleaned up after successful processing.

## 🔄 Updating MediaPipe

If you need to update MediaPipe or other Python dependencies:

1. Update `backend/requirements.txt`
2. Rebuild the container:
   ```bash
   docker-compose build --no-cache backend
   docker-compose up -d backend
   ```

## 📊 Monitoring

To monitor background removal operations:

```bash
# Watch backend logs in real-time
docker-compose logs -f backend | grep -i "background\|mediapipe"

# Check container resource usage
docker stats dscript-backend

# View temp directory size
docker exec dscript-backend du -sh /app/temp
```

## 🆘 Getting Help

If you encounter issues:

1. Check backend logs: `docker-compose logs backend`
2. Verify Python installation: `docker exec dscript-backend python3 --version`
3. Test MediaPipe import: `docker exec dscript-backend python3 -c "import mediapipe"`
4. Check disk space: `docker system df`
5. Review error messages in the browser console (F12)

## ✅ Quick Verification Checklist

- [ ] Backend container rebuilt successfully
- [ ] Python 3 is installed (`python3 --version`)
- [ ] MediaPipe is installed (no import errors)
- [ ] OpenCV is installed (no import errors)
- [ ] Backend starts without errors
- [ ] Background picker modal opens
- [ ] Background replacement API responds
- [ ] Progress overlay appears during processing
- [ ] Video updates after processing completes

---

**Last Updated:** After MediaPipe integration
**Docker Version:** Tested with Docker 20.10+
**Python Version:** 3.x (installed via apt-get)

