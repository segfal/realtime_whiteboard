# 🚀 Deployment Guide

This guide ensures all components are properly validated before deployment.

## 📋 Pre-Deployment Checklist

### Frontend (React + TypeScript)
- [ ] ✅ Linting passes (`npm run lint`)
- [ ] ✅ Type checking passes (`npm run type-check`)
- [ ] ✅ Tests pass (`npm run test`)
- [ ] ✅ Build succeeds (`npm run build`)
- [ ] ✅ WASM engine is compiled and up-to-date

### Backend (C++ WebSocket Server)
- [ ] ✅ CMake configuration succeeds
- [ ] ✅ Compilation succeeds
- [ ] ✅ Binary is created and executable
- [ ] ✅ Docker build succeeds
- [ ] ✅ Dependencies are properly cloned

## 🔧 Build Validation Commands

### Master Validation (Recommended)
```bash
# From project root - validates everything
./scripts/validate_all.sh
```

### Frontend Validation
```bash
cd frontend

# Run complete validation (includes WASM)
./scripts/validate.sh

# Or run individually:
npm run lint          # ESLint validation
npm run type-check    # TypeScript type checking
npm run test          # Unit tests
npm run build         # Production build
```

### Backend Validation
```bash
cd websocket-server

# Run complete validation
./build.sh

# Or run individually:
mkdir -p build && cd build
cmake ..              # CMake configuration
make -j$(nproc)       # Compilation
docker build -t test . # Docker build test
```

### WASM Validation
```bash
cd backend

# Run complete WASM validation
./scripts/validate_wasm.sh
```

## 🚀 Deployment Commands

### Master Validation & Deployment
```bash
# Validate everything first
./scripts/validate_all.sh

# If validation passes, deploy:
cd frontend && npm run deploy
cd ../websocket-server && railway up
```

### Frontend Deployment (Vercel)
```bash
cd frontend

# Validate and deploy (automatic pre-deploy hook)
npm run deploy

# Or validate manually first:
./scripts/validate.sh
npm run deploy
```

### Backend Deployment (Railway)
```bash
cd websocket-server

# Validate first
./build.sh

# Deploy to Railway
railway up
```

## 🔍 Environment Variables

### Frontend (Vercel)
- `VITE_WEBSOCKET_URL`: WebSocket server URL (wss://...)
- `VITE_API_URL`: API endpoint URL
- `VITE_ML_API_URL`: ML service URL

### Backend (Railway)
- `PORT`: Server port (9000)
- `CORS_ORIGIN`: Allowed CORS origin (frontend URL)

## 🧪 Testing After Deployment

### Frontend Testing
1. Visit the deployed URL
2. Open browser console (F12)
3. Check for WebSocket connection logs
4. Test drawing functionality
5. Test chat functionality
6. Test erase functionality
7. Test multi-user collaboration

### Backend Testing
```bash
# Health check
curl https://your-railway-url/health

# WebSocket connection test
# Use browser console or WebSocket testing tools
```

## 🐛 Common Issues & Solutions

### Frontend Issues
- **Build fails**: Check TypeScript errors and linting issues
- **WASM not loading**: Ensure `drawing_engine.js` and `drawing_engine.wasm` are in `public/`
- **WebSocket connection fails**: Verify `VITE_WEBSOCKET_URL` is correct

### Backend Issues
- **CMake fails**: Check if dependencies are properly cloned
- **Docker build fails**: Ensure Docker is running and has sufficient resources
- **Railway deployment fails**: Check `railway.toml` configuration

## 📊 Build Status Indicators

### ✅ Success Indicators
- Frontend: All validations pass, build completes without errors
- Backend: Binary created (399K), Docker build succeeds
- Tests: All unit tests pass
- Linting: No ESLint errors or warnings

### ❌ Failure Indicators
- TypeScript compilation errors
- ESLint violations
- Failed unit tests
- CMake configuration errors
- Docker build failures
- Missing dependencies

## 🔄 Continuous Integration

For automated deployments, consider setting up:
- GitHub Actions for frontend validation
- Railway automatic deployments on git push
- Automated testing in CI/CD pipeline

## 📝 Deployment Logs

Keep track of:
- Build times
- Binary sizes
- Test results
- Deployment URLs
- Environment variable configurations

---

**Remember**: Always validate before deploying! 🎯
