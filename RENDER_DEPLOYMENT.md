# 🚀 Render Backend Deployment Guide for Avila Protocol

## 📋 Overview
This guide will help you deploy your Avila Protocol backend to Render, a cloud platform that offers a generous free tier for web services.

## 🎯 What We're Deploying
- **TypeScript Node.js backend** with market data services
- **REST API endpoints** for TradFi and DeFi market data
- **Automatic deployment** on pushes to main branch
- **Health monitoring** and logging

## 🛠️ Prerequisites
1. **GitHub repository** with your code
2. **Render account** (free at [render.com](https://render.com))
3. **API keys** for market data services

## 📁 Files Created/Modified
- ✅ `render.yaml` - Render configuration
- ✅ `backend/typescript/package.json` - Updated for production
- ✅ `backend/typescript/server.ts` - Production-ready server
- ✅ `backend/typescript/env.production.template` - Environment template

## 🚀 Step-by-Step Deployment

### 1. **Sign Up for Render**
- Go to [render.com](https://render.com)
- Sign up with your GitHub account
- Verify your email

### 2. **Connect Your Repository**
- Click "New +" → "Web Service"
- Connect your GitHub repository: `lmckeown27/avila-protocol-testnet`
- Select the repository

### 3. **Configure the Service**
- **Name**: `avila-protocol-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Build Command**: `cd backend/typescript && npm install && npm run build`
- **Start Command**: `cd backend/typescript && npm start`

### 4. **Set Environment Variables**
Click "Environment" tab and add these variables:

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
FINNHUB_API_KEY=d2ehcv9r01qlu2qur8rgd2ehcv9r01qlu2qur8s0
POLYGON_API_KEY=nci8mkXFRUzWM3KwrjlsyvgChgAVUniz
ALPHA_VANTAGE_API_KEY=PYQAAND1RS12UQ2K
TWELVE_DATA_API_KEY=73f1c2d097854df9b2235fd50e961fa5
FRONTEND_URL=https://avilaprotocol-liam-mckeown-s-projects.vercel.app
```

### 5. **Deploy**
- Click "Create Web Service"
- Render will automatically build and deploy
- Wait for build to complete (usually 2-5 minutes)

## 🔗 After Deployment

### **Backend URL**
Your backend will be available at:
```
https://avila-protocol-backend.onrender.com
```

### **Test Endpoints**
- **Health Check**: `https://avila-protocol-backend.onrender.com/health`
- **All Market Data**: `https://avila-protocol-backend.onrender.com/api/market-data`
- **TradFi Data**: `https://avila-protocol-backend.onrender.com/api/market-data/tradfi`
- **DeFi Data**: `https://avila-protocol-backend.onrender.com/api/market-data/defi`

## 🔄 Update Frontend

### **Update Backend URL**
In `frontend/src/services/backendMarketData.ts`, change:
```typescript
const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://avila-protocol-backend.onrender.com';
```

### **Add Environment Variable**
In Vercel, add:
```
REACT_APP_BACKEND_URL=https://avila-protocol-backend.onrender.com
```

## 📊 Render Free Tier Limits
- **750 hours/month** (31 days)
- **512 MB RAM**
- **Shared CPU**
- **Auto-sleep** after 15 minutes of inactivity
- **Custom domains** supported

## 🔍 Monitoring & Logs
- **Logs**: Available in Render dashboard
- **Health Checks**: Automatic monitoring
- **Metrics**: Basic performance data
- **Alerts**: Email notifications for failures

## 🚨 Troubleshooting

### **Build Failures**
- Check Node.js version (18+ required)
- Verify all dependencies in package.json
- Check build command syntax

### **Runtime Errors**
- Check environment variables
- Verify API keys are valid
- Check CORS configuration

### **Performance Issues**
- Monitor memory usage
- Check API rate limits
- Optimize polling intervals

## 🔄 Automatic Deployment
- **Every push to main** triggers new deployment
- **Zero-downtime** deployments
- **Rollback** to previous version if needed

## 💰 Cost Management
- **Free tier**: 750 hours/month
- **Auto-sleep**: Saves hours when not in use
- **Upgrade**: $7/month for always-on service

## 🎉 Success!
Once deployed, your frontend will be able to connect to the backend and fetch real-time market data!

## 📞 Support
- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Community**: [community.render.com](https://community.render.com)
- **Status**: [status.render.com](https://status.render.com) 