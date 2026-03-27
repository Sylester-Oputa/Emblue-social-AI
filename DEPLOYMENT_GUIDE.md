# Deployment Guide - Emblue Social AI

Complete guide for deploying your application to **Render** (backend) and **Vercel** (frontend).

---

## 🎯 Overview

- **Backend (NestJS)**: Deploy to [Render](https://render.com) with PostgreSQL database
- **Frontend (Next.js)**: Deploy to [Vercel](https://vercel.com)

---

## 📋 Prerequisites

1. **Accounts**:
   - [Render Account](https://dashboard.render.com/register)
   - [Vercel Account](https://vercel.com/signup)
   - [GitHub Account](https://github.com)

2. **Repository**: Your code pushed to GitHub (✅ Already done)

3. **API Keys** (Optional but recommended):
   - OpenAI API key for AI-powered response generation
   - Twitter/X API credentials for real posting
   - Instagram/Facebook tokens for social integrations

---

## 🚀 Part 1: Deploy Backend to Render

### Step 1: Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → Select **"PostgreSQL"**
3. Configure:
   - **Name**: `emblue-social-ai-db`
   - **Database**: `emblue_db`
   - **User**: `emblue_user` (auto-generated)
   - **Region**: Choose closest to your users
   - **Plan**: Start with **Free** (can upgrade later)
4. Click **"Create Database"**
5. **SAVE THE CONNECTION STRING** (Internal Database URL) - you'll need this

### Step 2: Create Backend Web Service

1. In Render Dashboard, click **"New +"** → Select **"Web Service"**
2. Connect your GitHub repository: `Sylester-Oputa/Emblue-social-AI`
3. Configure:
   - **Name**: `emblue-social-ai-backend`
   - **Region**: Same as your database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run db:generate && npm run build
     ```
   - **Start Command**:
     ```bash
     npm run migrate:deploy && npm run start:prod
     ```
   - **Plan**: Start with **Free** ($0/month, sleeps after 15 min inactivity)

### Step 3: Configure Environment Variables

In your Render backend service, go to **"Environment"** tab and add:

```env
# Database (use the Internal Database URL from Step 1)
DATABASE_URL=postgresql://emblue_user:password@dpg-xxx.render.com/emblue_db

# Authentication (REQUIRED - generate a strong secret)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-this-in-production

# Node Environment
NODE_ENV=production

# OpenAI (Optional - for AI response generation)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Redis (Optional - for queues, can add later)
# REDIS_URL=redis://red-xxxxx.render.com:6379

# Frontend URL (we'll update this after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app

# CORS Origins (update after frontend deployment)
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

**IMPORTANT**: 
- Generate a secure JWT_SECRET (use: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- Don't commit these to git!

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Render will automatically:
   - Install dependencies
   - Run Prisma migrations
   - Build your NestJS app
   - Start the server
3. Wait 5-10 minutes for first deployment
4. **SAVE YOUR BACKEND URL**: `https://emblue-social-ai-backend.onrender.com`

### Step 5: Seed Database (Optional)

After successful deployment, run seed script via Render Shell:

1. In your backend service, go to **"Shell"** tab
2. Run:
   ```bash
   npm run db:seed
   ```
3. This populates your database with 100+ test signals and sample data

---

## 🌐 Part 2: Deploy Frontend to Vercel

### Step 1: Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import `Sylester-Oputa/Emblue-social-AI`
4. Vercel auto-detects Next.js configuration

### Step 2: Configure Project

1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `frontend`
3. **Build Settings**:
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

### Step 3: Add Environment Variables

In Vercel project settings → **"Environment Variables"**, add:

```env
# Backend API URL (use your Render backend URL from Part 1, Step 4)
NEXT_PUBLIC_API_URL=https://emblue-social-ai-backend.onrender.com

# Optional: Analytics, Error Tracking
# NEXT_PUBLIC_ANALYTICS_ID=your-id
```

**Note**: `NEXT_PUBLIC_` prefix makes variables accessible in browser

### Step 4: Deploy Frontend

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies
   - Build Next.js app
   - Deploy to global CDN
3. Wait 2-3 minutes
4. **SAVE YOUR FRONTEND URL**: `https://emblue-social-ai.vercel.app`

### Step 5: Update Backend CORS

1. Return to **Render Dashboard** → Your backend service
2. Update environment variables:
   ```env
   FRONTEND_URL=https://emblue-social-ai.vercel.app
   CORS_ORIGINS=https://emblue-social-ai.vercel.app,http://localhost:3000
   ```
3. Save → Backend will auto-redeploy

---

## ✅ Part 3: Verify Deployment

### Test Backend API

Visit: `https://emblue-social-ai-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-27T..."
}
```

### Test Frontend

1. Visit: `https://emblue-social-ai.vercel.app`
2. Login with demo credentials:
   - **Email**: `admin@demo.emblue.dev`
   - **Password**: `DemoP@ss123`
3. Check pages:
   - Dashboard (should show test signals)
   - Signals (100+ messages)
   - Drafts (60+ responses)
   - Analytics (charts with data)

### Check Database Connection

In Render backend Shell, run:
```bash
npx prisma studio --browser none
```
This opens Prisma Studio to view your database records.

---

## 🔧 Part 4: Production Optimization

### Render Performance Tips

1. **Upgrade Plan**: Free tier sleeps after 15 min → Consider **Starter ($7/mo)** for 24/7 uptime
2. **Redis for Queues**: Add Redis instance for background jobs:
   ```bash
   # In Render: New+ → Redis → Create
   # Add REDIS_URL to backend env vars
   ```
3. **Health Checks**: Render pings `/api/health` automatically
4. **Logging**: View logs in Render dashboard → "Logs" tab

### Vercel Performance Tips

1. **Custom Domain**: Add your domain in Vercel project settings
2. **Analytics**: Enable Vercel Analytics for real-user metrics
3. **Edge Functions**: Deployed automatically to 100+ global locations
4. **Environment Branches**: Create preview deployments for each git branch

### Security Checklist

- [x] Strong JWT_SECRET (min 32 chars)
- [x] DATABASE_URL contains password (never commit)
- [x] CORS restricted to your frontend domain
- [ ] Enable HTTPS only (automatic on Render/Vercel)
- [ ] Add rate limiting for API endpoints
- [ ] Rotate API keys quarterly

---

## 🐛 Troubleshooting

### Backend Issues

**Build Fails**: Check Render logs → "Logs" tab
```bash
# Common fixes:
# 1. Prisma client not generated
npm run db:generate

# 2. Migration errors
npm run migrate:deploy -- --reset

# 3. Dependencies mismatch
rm -rf node_modules package-lock.json && npm install
```

**Database Connection Errors**:
- Verify DATABASE_URL format: `postgresql://USER:PASSWORD@HOST:5432/DATABASE`
- Check database is running (Render dashboard)
- Test connection in Shell: `npx prisma db push`

**App Sleeps (Free Tier)**:
- First request after 15 min takes 30-60 seconds to wake up
- Upgrade to Starter plan for always-on service

### Frontend Issues

**API Connection Failed**:
- Check NEXT_PUBLIC_API_URL is correct
- Verify backend is deployed and healthy
- Check browser console for CORS errors

**Build Fails**:
- View Vercel deployment logs
- Check all environment variables are set
- Verify `frontend/package.json` scripts are correct

**Environment Variables Not Working**:
- Must start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new variables
- Check Vercel dashboard → Settings → Environment Variables

---

## 📊 Monitoring & Maintenance

### Daily Checks
- Backend uptime: `curl https://your-backend.onrender.com/api/health`
- Frontend loads: Visit `https://your-frontend.vercel.app`
- Error logs: Check Render/Vercel dashboards

### Weekly Tasks
- Review Render logs for errors
- Check Vercel Analytics for performance
- Monitor database size (Render dashboard)

### Monthly Maintenance
- Update dependencies: `npm outdated` → `npm update`
- Review and rotate API keys
- Database backup (Render auto-backups on paid plans)
- Check for security updates

---

## 💰 Cost Estimate

### Free Tier (Perfect for Testing)
- **Render Backend**: Free (sleeps after 15 min)
- **Render PostgreSQL**: Free (90-day expiry, then $7/mo)
- **Vercel Frontend**: Free (unlimited deployments)
- **Total**: $0/month (first 3 months), then $7/month

### Production Tier (Recommended)
- **Render Backend**: Starter $7/mo (always-on)
- **Render PostgreSQL**: Starter $7/mo (persistent)
- **Render Redis**: Starter $10/mo (optional, for queues)
- **Vercel Pro**: $20/mo (team collaboration, analytics)
- **Total**: $14-44/month depending on features

### Scale Tier (High Traffic)
- **Render Backend**: Standard $25/mo (2GB RAM, autoscaling)
- **Render PostgreSQL**: Standard $20/mo (4GB RAM)
- **Render Redis**: Standard $30/mo
- **Vercel Pro**: $20/mo
- **Total**: $95/month

---

## 🔗 Quick Links

- **Your Backend**: `https://emblue-social-ai-backend.onrender.com`
- **Your Frontend**: `https://emblue-social-ai.vercel.app`
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repo**: https://github.com/Sylester-Oputa/Emblue-social-AI

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs

---

**Need Help?** Check the troubleshooting section above or review platform documentation.

**Ready to Deploy?** Start with Part 1: Deploy Backend to Render! 🚀
