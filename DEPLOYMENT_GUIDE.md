# 🚀 Realtime Whiteboard Deployment Guide

This guide will walk you through deploying your realtime whiteboard application to Vercel (frontend) and Railway (backend services).

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] GitHub repository with your code
- [ ] Vercel account (free tier available)
- [ ] Railway account (free tier available)
- [ ] Node.js 18+ installed locally
- [ ] Git installed locally

## 🎯 Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   WebSocket     │    │   ML Service    │
│   (Vercel)      │◄──►│   Backend       │◄──►│   (Railway)     │
│   React +       │    │   (Railway)     │    │   Python +      │
│   WebGPU        │    │   C++ + WASM    │    │   FastAPI       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Step 1: GitHub Repository Setup

### 1.1 Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, and add the following secrets:

**For Vercel:**

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

**For Railway:**

```
RAILWAY_TOKEN=your_railway_token
```

**Environment Variables:**

```
VITE_WEBSOCKET_URL=wss://your-backend.railway.app
VITE_ML_API_URL=https://your-ml-service.railway.app
VITE_API_URL=https://your-backend.railway.app
```

### 1.2 Get Vercel Credentials

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Get your token: `vercel whoami`
4. Get project info: `vercel projects`

### 1.3 Get Railway Credentials

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Get your token from Railway dashboard

## 🎨 Step 2: Frontend Setup (Vercel)

### 2.1 Initialize Vercel Project

```bash
cd frontend
vercel
```

Follow the prompts to:

- Link to existing project or create new
- Set project name
- Configure build settings

### 2.2 Configure Environment Variables

In your Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add the following variables:

```
VITE_WEBSOCKET_URL=wss://your-backend.railway.app
VITE_ML_API_URL=https://your-ml-service.railway.app
VITE_API_URL=https://your-backend.railway.app
VITE_ENVIRONMENT=production
```

### 2.3 Test Frontend Build

```bash
cd frontend
npm run build
```

Ensure the build completes successfully.

## 🔧 Step 3: Backend Setup (Railway)

### 3.1 Create Railway Project

1. Go to [Railway Dashboard](https://railway.app)
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Choose the `websocket-server` directory

### 3.2 Configure Railway Service

Railway will automatically detect the Dockerfile and build the service. Configure:

**Environment Variables:**

```
PORT=8080
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

**Health Check:**

- Path: `/health`
- Interval: 30s
- Timeout: 10s

### 3.3 Test Backend Deployment

```bash
cd websocket-server
railway up
```

Check the deployment URL and test the health endpoint.

## 🤖 Step 4: ML Service Setup (Railway)

### 4.1 Create Second Railway Service

1. In your Railway project, click "New Service"
2. Choose "Deploy from GitHub repo"
3. Select your repository
4. Choose the `ml_shapes` directory

### 4.2 Configure ML Service

**Environment Variables:**

```
PORT=8000
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

**Health Check:**

- Path: `/health`
- Interval: 30s
- Timeout: 10s

### 4.3 Test ML Service Deployment

```bash
cd ml_shapes
railway up
```

## 🔄 Step 5: CI/CD Pipeline

### 5.1 GitHub Actions Workflows

The following workflows are already configured:

- **CI Pipeline** (`.github/workflows/ci.yml`): Runs on every push/PR
- **Frontend Deployment** (`.github/workflows/deploy-frontend.yml`): Deploys to Vercel
- **Backend Deployment** (`.github/workflows/deploy-backend.yml`): Deploys to Railway
- **ML Service Deployment** (`.github/workflows/deploy-ml-service.yml`): Deploys to Railway

### 5.2 Manual Deployment

You can also deploy manually using the deployment script:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy all services
./scripts/deploy.sh --all

# Deploy specific service
./scripts/deploy.sh --frontend
./scripts/deploy.sh --backend
./scripts/deploy.sh --ml-service
```

## 🧪 Step 6: Testing Deployment

### 6.1 Health Checks

Test each service:

```bash
# Frontend
curl https://your-app.vercel.app

# Backend
curl https://your-backend.railway.app/health

# ML Service
curl https://your-ml-service.railway.app/health
```

### 6.2 WebSocket Connection

Test WebSocket connectivity:

```bash
# Test WebSocket upgrade
curl -i -N -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     https://your-backend.railway.app
```

### 6.3 Integration Testing

1. Open your Vercel app in two browser tabs
2. Start drawing in one tab
3. Verify real-time updates in the other tab
4. Test ML shape detection features

## 🔍 Step 7: Monitoring & Debugging

### 7.1 Vercel Monitoring

- **Analytics**: Built-in performance monitoring
- **Functions**: Serverless function logs
- **Edge Network**: CDN performance

### 7.2 Railway Monitoring

- **Logs**: Real-time service logs
- **Metrics**: CPU, memory, network usage
- **Health Checks**: Automatic service monitoring

### 7.3 GitHub Actions Monitoring

- **Workflow Runs**: View CI/CD pipeline status
- **Artifacts**: Download build artifacts
- **Security**: Vulnerability scanning results

## 🚨 Troubleshooting

### Common Issues

**Frontend Build Fails:**

```bash
# Check WASM build
cd backend
./scripts/build_wasm.sh

# Check frontend dependencies
cd frontend
npm ci
npm run build
```

**Backend Deployment Fails:**

```bash
# Check Docker build locally
cd websocket-server
docker build -t test-backend .
docker run -p 8080:8080 test-backend
```

**ML Service Deployment Fails:**

```bash
# Check Python dependencies
cd ml_shapes
poetry install
poetry run python api/main.py
```

**WebSocket Connection Issues:**

- Verify CORS configuration
- Check Railway service URLs
- Ensure WebSocket upgrade headers

### Debug Commands

```bash
# Check Railway service status
railway status

# View Railway logs
railway logs

# Check Vercel deployment
vercel ls

# Test local development
./scripts/dev.sh
```

## 📈 Scaling Considerations

### Vercel Scaling

- **Automatic**: Scales based on traffic
- **Edge Functions**: Global deployment
- **Analytics**: Performance insights

### Railway Scaling

- **Auto-scaling**: Based on CPU/memory usage
- **Custom domains**: Add your domain
- **Environment variables**: Secure configuration

### Cost Optimization

- **Free tiers**: Vercel and Railway offer generous free tiers
- **Usage monitoring**: Track resource consumption
- **Optimization**: Optimize bundle sizes and dependencies

## 🔐 Security Best Practices

### Environment Variables

- Never commit `.env` files
- Use platform-specific secret management
- Rotate tokens regularly

### CORS Configuration

- Restrict origins to your domains
- Use environment variables for origins
- Implement proper authentication

### WebSocket Security

- Add authentication to WebSocket connections
- Implement rate limiting
- Validate message formats

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [WebSocket RFC](https://tools.ietf.org/html/rfc6455)

## 🎉 Success Checklist

- [ ] GitHub repository configured with secrets
- [ ] Vercel project created and configured
- [ ] Railway services deployed and running
- [ ] CI/CD pipelines working
- [ ] Health checks passing
- [ ] WebSocket connections working
- [ ] Real-time collaboration tested
- [ ] ML features working
- [ ] Monitoring configured
- [ ] Documentation updated

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review GitHub Actions logs
3. Check Railway and Vercel dashboards
4. Verify environment variables
5. Test locally first

For additional help, refer to the platform documentation or create an issue in your repository.
