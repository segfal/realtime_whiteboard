# 🔗 GitHub Integration Guide

This guide will help you connect Vercel and Railway to your GitHub repository for automatic deployments.

## 📋 Prerequisites

- [ ] GitHub repository with your code
- [ ] Vercel account (free tier available)
- [ ] Railway account (free tier available)
- [ ] Admin access to your GitHub repository

## 🎯 Overview

```
GitHub Push/PR → GitHub Actions → Validate → Deploy to Vercel/Railway
```

## 🔧 Step 1: Set Up GitHub Secrets

### 1.1 Access GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** to add each secret

### 1.2 Vercel Secrets

Add these secrets for Vercel deployment:

#### `VERCEL_TOKEN`
1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Give it a name like "GitHub Actions"
4. Set scope to "Full Account"
5. Copy the token and add it as `VERCEL_TOKEN`

#### `VERCEL_ORG_ID`
1. Go to [Vercel Dashboard](https://vercel.com/account)
2. Click **Settings** → **General**
3. Copy your **Team ID** (this is your org ID)
4. Add it as `VERCEL_ORG_ID`

#### `VERCEL_PROJECT_ID`
1. Go to your Vercel project
2. Click **Settings** → **General**
3. Copy your **Project ID**
4. Add it as `VERCEL_PROJECT_ID`

### 1.3 Railway Secrets

Add these secrets for Railway deployment:

#### `RAILWAY_TOKEN`
1. Go to [Railway Dashboard](https://railway.app/account/tokens)
2. Click **Create Token**
3. Give it a name like "GitHub Actions"
4. Copy the token and add it as `RAILWAY_TOKEN`

#### `RAILWAY_WEBSOCKET_URL`
1. Deploy your WebSocket server to Railway first
2. Copy the Railway URL (e.g., `https://your-websocket-server.railway.app`)
3. Add it as `RAILWAY_WEBSOCKET_URL`

#### `RAILWAY_ML_URL`
1. Deploy your ML service to Railway first
2. Copy the Railway URL (e.g., `https://your-ml-service.railway.app`)
3. Add it as `RAILWAY_ML_URL`

## 🚀 Step 2: Connect Vercel to GitHub

### 2.1 Automatic Deployments

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **New Project**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 2.2 Environment Variables

In your Vercel project settings, add these environment variables:

```
VITE_WEBSOCKET_URL=wss://your-websocket-server.railway.app
VITE_API_URL=https://your-websocket-server.railway.app
VITE_ML_API_URL=https://your-ml-service.railway.app
VITE_ENVIRONMENT=production
```

### 2.3 Deployment Settings

1. Go to **Settings** → **Git**
2. Enable **Auto Deploy** for:
   - `main` branch → Production
   - `develop` branch → Preview
   - Pull Requests → Preview

## 🚂 Step 3: Connect Railway to GitHub

### 3.1 WebSocket Server

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Choose **Deploy from GitHub repo**
4. Select your repository
5. Choose the `websocket-server` directory
6. Railway will automatically detect the Dockerfile

### 3.2 ML Service

1. In the same Railway project, click **New Service**
2. Choose **Deploy from GitHub repo**
3. Select your repository
4. Choose the `ml_shapes` directory
5. Railway will automatically detect the Python service

### 3.3 Environment Variables

For each Railway service, add these environment variables:

#### WebSocket Server:
```
PORT=9000
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

#### ML Service:
```
PORT=8000
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

## 🔄 Step 4: Configure GitHub Actions

### 4.1 Workflow Files

The following workflow files are already created:

- `.github/workflows/deploy-vercel.yml` - Deploys frontend to Vercel
- `.github/workflows/deploy-railway.yml` - Deploys backend to Railway
- `.github/workflows/ci.yml` - Runs validation and tests

### 4.2 Trigger Branches

The workflows are configured to trigger on:

- **Push to**: `main`, `develop`, `feature/vercel-railway-deployment`
- **Pull Requests to**: `main`, `develop`
- **Manual trigger**: `workflow_dispatch`

## 🧪 Step 5: Test the Integration

### 5.1 Test Automatic Deployment

1. Make a small change to your code
2. Push to the `main` branch
3. Check GitHub Actions tab
4. Verify deployments in Vercel and Railway dashboards

### 5.2 Test Pull Request Deployment

1. Create a new branch
2. Make changes
3. Create a pull request to `main`
4. Check that preview deployments are created
5. Verify the PR gets commented with deployment URLs

## 📊 Step 6: Monitor Deployments

### 6.1 GitHub Actions

- Go to **Actions** tab in your repository
- Monitor workflow runs
- Check logs for any issues

### 6.2 Vercel Dashboard

- Monitor deployment status
- Check build logs
- View analytics and performance

### 6.3 Railway Dashboard

- Monitor service health
- Check logs and metrics
- View deployment history

## 🔍 Step 7: Troubleshooting

### Common Issues

#### Vercel Deployment Fails
- Check `VERCEL_TOKEN` is valid
- Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Check build logs for errors

#### Railway Deployment Fails
- Check `RAILWAY_TOKEN` is valid
- Verify service names match your Railway project
- Check Docker build logs

#### Validation Fails
- Run validation locally: `./scripts/validate_all.sh`
- Check for linting errors: `npm run lint`
- Verify tests pass: `npm run test`

### Debug Commands

```bash
# Test validation locally
./scripts/validate_all.sh

# Test frontend validation
cd frontend && ./scripts/validate.sh

# Test backend validation
cd websocket-server && ./build.sh

# Test WASM validation
cd backend && ./scripts/validate_wasm.sh
```

## 🎯 Step 8: Production Deployment

### 8.1 Main Branch Deployment

When you push to `main`:
1. ✅ GitHub Actions runs validation
2. ✅ Frontend deploys to Vercel (production)
3. ✅ Backend deploys to Railway (production)
4. ✅ Health checks verify deployment
5. ✅ Notifications sent on success/failure

### 8.2 Pull Request Workflow

When you create a PR:
1. ✅ GitHub Actions runs validation
2. ✅ Frontend deploys to Vercel (preview)
3. ✅ Backend deploys to Railway (preview)
4. ✅ PR gets commented with preview URLs
5. ✅ Team can test changes before merge

## 📈 Benefits

- **🔄 Automatic Deployments**: No manual deployment needed
- **🛡️ Validation First**: All code is validated before deployment
- **🎯 Preview Environments**: Test changes before production
- **📊 Health Checks**: Verify deployments are working
- **🔔 Notifications**: Get notified of deployment status
- **🔄 Rollback**: Easy rollback if issues occur

## 🎉 Success Checklist

- [ ] GitHub secrets configured
- [ ] Vercel connected to GitHub
- [ ] Railway connected to GitHub
- [ ] Environment variables set
- [ ] Workflow files in place
- [ ] Test deployment successful
- [ ] PR preview working
- [ ] Health checks passing
- [ ] Notifications working

---

**Your GitHub integration is now complete! Every push will automatically deploy to Vercel and Railway with full validation.** 🚀✨
