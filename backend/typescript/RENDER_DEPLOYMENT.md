# Render Deployment Guide for Avila Protocol Backend

## Overview

This guide provides step-by-step instructions for deploying the Avila Protocol backend to Render, a cloud platform that offers free hosting for web services.

## Prerequisites

- [x] Backend refactored for Render compatibility
- [x] Source code in `src/` directory
- [x] TypeScript configuration updated
- [x] Package.json scripts configured
- [x] Build process verified locally

## Backend Structure

```
backend/typescript/
├── src/
│   ├── index.ts              # Main entry point
│   └── marketDataService.ts  # Market data service
├── dist/                     # Compiled JavaScript (generated)
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── .renderignore            # Render deployment exclusions
└── .env                     # Environment variables (create locally)
```

## Local Verification

Before deploying to Render, verify the backend works locally:

```bash
cd backend/typescript

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

Expected output:
```
🚀 Avila Protocol Market Data Server Started!
📍 Server running at: http://0.0.0.0:3000
🔗 Health check: http://0.0.0.0:3000/health
📊 Market data: http://0.0.0.0:3000/api/market-data
🏛️ TradFi data: http://0.0.0.0:3000/api/market-data/tradfi
🌐 DeFi data: http://0.0.0.0:3000/api/market-data/defi
🌍 Environment: development
✨ Ready to serve real-time market data!
```

## Render Deployment Steps

### 1. Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub, GitLab, or email
3. Verify your email address

### 2. Connect Repository

1. Click "New +" button
2. Select "Web Service"
3. Connect your GitHub/GitLab repository
4. Select the `avila-protocol-testnet` repository

### 3. Configure Service

**Basic Settings:**
- **Name**: `avila-protocol-backend` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)

**Build & Deploy Settings:**
- **Root Directory**: `backend/typescript`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend-domain.com
```

**Advanced Settings:**
- **Auto-Deploy**: Enable for automatic deployments
- **Health Check Path**: `/health`
- **Health Check Timeout**: `180` seconds

### 4. Deploy

1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Navigate to `backend/typescript`
   - Install dependencies with `npm install`
   - Build with `npm run build`
   - Start with `npm start`

## Render Configuration Details

### Root Directory
```
backend/typescript
```
This tells Render where to find the backend code within your repository.

### Build Command
```bash
npm install && npm run build
```
- Installs all dependencies
- Compiles TypeScript to JavaScript in `dist/` folder

### Start Command
```bash
npm start
```
- Starts the Node.js server using the compiled `dist/index.js`

### Environment Variables
- **NODE_ENV**: Set to `production` for production optimizations
- **PORT**: Render will set this automatically (usually 10000)
- **HOST**: Set to `0.0.0.0` to bind to all interfaces
- **FRONTEND_URL**: Your frontend domain for CORS configuration

## Deployment Verification

### 1. Check Build Logs
In Render dashboard, verify:
- ✅ Dependencies installed successfully
- ✅ TypeScript compilation completed
- ✅ Server started without errors

### 2. Test Health Endpoint
```bash
curl https://your-service-name.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Avila Protocol Market Data Server",
  "timestamp": "2024-08-13T22:30:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

### 3. Test Market Data Endpoints
```bash
# All market data
curl https://your-service-name.onrender.com/api/market-data

# TradFi data only
curl https://your-service-name.onrender.com/api/market-data/tradfi

# DeFi data only
curl https://your-service-name.onrender.com/api/market-data/defi
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
**Problem**: TypeScript compilation errors
**Solution**: 
- Check local build: `npm run build`
- Verify `tsconfig.json` configuration
- Ensure all source files are in `src/` directory

#### 2. Missing Dependencies
**Problem**: Runtime errors about missing modules
**Solution**:
- Verify `package.json` includes all required dependencies
- Check that `npm install` completes successfully
- Ensure `@types/*` packages are in `devDependencies`

#### 3. Port Binding Issues
**Problem**: Server won't start
**Solution**:
- Verify `HOST=0.0.0.0` in environment variables
- Check that `PORT` is set (Render sets this automatically)
- Ensure server listens on all interfaces

#### 4. CORS Issues
**Problem**: Frontend can't access API
**Solution**:
- Set `FRONTEND_URL` environment variable
- Verify CORS configuration in `src/index.ts`
- Test with browser developer tools

### Debug Commands

```bash
# Check build output
npm run build:verify

# Run in development mode
npm run dev

# Check TypeScript configuration
npx tsc --showConfig
```

## Performance Optimization

### 1. Environment Variables
- Set `NODE_ENV=production` for performance optimizations
- Configure appropriate CORS origins

### 2. Caching
- Market data service includes built-in caching
- Monitor cache statistics via `/api/market-data/cache/stats`

### 3. Monitoring
- Use Render's built-in monitoring
- Check logs for performance issues
- Monitor response times and error rates

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files to version control
- Use Render's environment variable management
- Rotate API keys regularly

### 2. CORS Configuration
- Restrict CORS origins to trusted domains
- Use environment variables for dynamic configuration

### 3. Rate Limiting
- Consider implementing rate limiting for production
- Monitor for abuse and implement protection

## Scaling

### Free Tier Limitations
- **Build Time**: 15 minutes
- **Request Timeout**: 30 seconds
- **Sleep After Inactivity**: 15 minutes

### Paid Tier Benefits
- **Always On**: No sleep after inactivity
- **Custom Domains**: Use your own domain
- **SSL Certificates**: Automatic HTTPS
- **Higher Limits**: Increased build and request limits

## Maintenance

### 1. Regular Updates
- Keep dependencies updated
- Monitor for security vulnerabilities
- Test locally before deploying

### 2. Monitoring
- Check Render dashboard regularly
- Monitor application logs
- Set up alerts for failures

### 3. Backups
- Code is backed up in Git repository
- Environment variables stored in Render dashboard
- Consider database backups if applicable

## Support

### Render Support
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Render Status](https://status.render.com)

### Local Development
- Use `npm run dev` for development
- Check logs for detailed error information
- Verify configuration before deploying

---

**Note**: This deployment guide assumes you're using the refactored backend structure. If you encounter issues, refer to the troubleshooting section or check the local verification steps. 