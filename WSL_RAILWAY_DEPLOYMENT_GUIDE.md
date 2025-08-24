# 🚀 WSL2 Railway Deployment Guide

## ✅ What We've Accomplished

### 1. Docker Setup in WSL2 ✅
- Installed Docker CE in WSL2 Ubuntu
- Added user to docker group
- Verified Docker installation with hello-world test
- **Status**: Docker is working perfectly in WSL2

### 2. WebSocket Server Dependencies ✅
- Cloned uWebSockets repository with all submodules
- Cloned nlohmann/json library
- **Status**: All dependencies are properly set up

### 3. Local Build & Test ✅
- Successfully built the WebSocket server with CMake
- Tested local server (running on port 9000)
- Verified health endpoint: `{"status":"healthy","service":"websocket-server","timestamp":"1756074379"}`
- **Status**: Server builds and runs correctly

### 4. Docker Build & Test ✅
- Successfully built Docker image: `websocket-server:latest`
- Tested Docker container on port 9001
- Verified health endpoint in container
- **Status**: Docker build and container work perfectly

### 5. Railway Configuration ✅
- Updated `railway.toml` with correct settings:
  - `startCommand = "./build/server"`
  - `PORT = "9000"`
  - `CORS_ORIGIN = "https://frontend-n8xu99dr3-segfals-projects.vercel.app"`
- **Status**: Configuration is ready for deployment

## 🔄 Next Steps for Railway Deployment

### Step 1: Railway Login
```bash
railway login
```
This will open a browser window for authentication.

### Step 2: Initialize Railway Project
```bash
cd websocket-server
railway init
```
Follow the prompts to:
- Create a new project or link to existing
- Set project name (e.g., "realtime-whiteboard-websocket")

### Step 3: Deploy to Railway
```bash
railway up
```
This will:
- Build the Docker image
- Deploy to Railway
- Provide you with the deployment URL

### Step 4: Configure Environment Variables
In Railway dashboard:
1. Go to your project → Variables
2. Add:
   ```
   PORT=9000
   CORS_ORIGIN=https://frontend-n8xu99dr3-segfals-projects.vercel.app
   ```

### Step 5: Update Vercel Environment Variables
Once you have the Railway URL, update your Vercel frontend:
1. Go to Vercel dashboard → Project Settings → Environment Variables
2. Update:
   ```
   VITE_WEBSOCKET_URL=wss://your-railway-app.railway.app
   ```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Railway Build Fails
**Problem**: Build fails during Docker build process
**Solution**: 
- Railway uses a different build environment than WSL2
- The Dockerfile is optimized for Railway's environment
- If issues persist, try building with `railway logs` to see detailed error messages

#### 2. Port Issues
**Problem**: Server doesn't start on Railway
**Solution**:
- Railway automatically sets the `PORT` environment variable
- Our code correctly reads `PORT` env var and defaults to 9000
- Check Railway logs: `railway logs`

#### 3. CORS Issues
**Problem**: Frontend can't connect to WebSocket
**Solution**:
- Verify `CORS_ORIGIN` is set to your Vercel app URL
- Check that the WebSocket URL uses `wss://` (secure WebSocket)

#### 4. Health Check Fails
**Problem**: Railway health checks fail
**Solution**:
- Health endpoint is at `/health`
- Returns JSON: `{"status":"healthy","service":"websocket-server","timestamp":"..."}`
- Check Railway logs for specific error messages

## 📊 Current Status

| Component | Status | URL |
|-----------|--------|-----|
| Frontend | ✅ Live | https://frontend-n8xu99dr3-segfals-projects.vercel.app |
| WebSocket Server | 🔄 Ready for Railway | Pending Railway deployment |
| ML Service | ⏳ Not deployed | Pending |
| CI/CD | ✅ Complete | GitHub Actions ready |

## 🎯 Success Criteria

The deployment is successful when:
1. ✅ Railway build completes without errors
2. ✅ Health endpoint responds: `curl https://your-app.railway.app/health`
3. ✅ Frontend can connect to WebSocket
4. ✅ Real-time drawing and chat work in the browser

## 🔧 Commands Reference

```bash
# Test local build
cd websocket-server/build && ./server

# Test Docker build
cd websocket-server && sudo docker build -t websocket-server .

# Test Docker container
sudo docker run -d -p 9001:9000 --name test-websocket websocket-server
curl http://localhost:9001/health

# Railway deployment
railway login
railway init
railway up
railway logs
```

## 🚨 Important Notes

1. **WSL2 Compatibility**: Docker works perfectly in WSL2, and Railway deployment should work fine
2. **Environment Variables**: Railway automatically provides `PORT`, our code handles it correctly
3. **CORS**: Make sure to update the CORS origin to your actual Vercel app URL
4. **Logs**: Use `railway logs` to debug any deployment issues
5. **Health Checks**: Railway will use the `/health` endpoint for monitoring

## 🎉 Expected Outcome

After successful Railway deployment:
- WebSocket server will be live at `https://your-app.railway.app`
- Frontend will connect via `wss://your-app.railway.app`
- Real-time whiteboard functionality will work end-to-end
- You'll have a fully functional real-time collaborative whiteboard!

---

**Ready to deploy?** Run `railway login` to get started! 🚀
