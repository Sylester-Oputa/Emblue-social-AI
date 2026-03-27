# 🚀 Quick Deployment Reference

Fast reference for deploying to Render & Vercel.

## 📦 Prerequisites

- GitHub repo pushed ✅ (done)
- Render account (free)
- Vercel account (free)

---

## ⚡ Quick Start (5 Minutes)

### 1️⃣ Deploy Backend (Render)

**Via Blueprint** (Recommended):
1. Go to https://render.com/dashboard
2. Click "New +" → "Blueprint"
3. Connect repo: `Sylester-Oputa/Emblue-social-AI`
4. Render reads `render.yaml` and creates everything
5. Add these env vars manually in dashboard:
   ```
   JWT_SECRET=<generate-with: openssl rand -base64 32>
   OPENAI_API_KEY=sk-proj-xxx (optional)
   ```
6. Deploy! Takes ~5 min

**Manual Setup**:
```bash
# 1. Create PostgreSQL Database
Name: emblue-social-ai-db
Region: Oregon (or nearest)
Plan: Free

# 2. Create Web Service
Name: emblue-social-ai-backend
Repo: Sylester-Oputa/Emblue-social-AI
Root Directory: backend
Build: npm install && npm run db:generate && npm run build
Start: npm run migrate:deploy && npm run start:prod
```

### 2️⃣ Deploy Frontend (Vercel)

**One Command**:
```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Or use web dashboard:
```

**Via Dashboard** (Easier):
1. Go to https://vercel.com/new
2. Import `Sylester-Oputa/Emblue-social-AI`
3. Set Root Directory: `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```
5. Deploy! Takes ~2 min

---

## 🔑 Essential Environment Variables

### Backend (Render)
```bash
DATABASE_URL=<from-render-postgres>
JWT_SECRET=<generate-32-char-secret>
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGINS=https://your-app.vercel.app
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## 🧪 Testing Deployment

```bash
# Test backend health
curl https://your-backend.onrender.com/api/health

# Expected: {"status":"ok","timestamp":"..."}

# Test frontend
# Visit: https://your-app.vercel.app
# Login: admin@demo.emblue.dev / DemoP@ss123
```

---

## 🛠️ Common Commands

### Backend (Render Shell)
```bash
# Seed database with test data
npm run db:seed

# Check database
npx prisma studio

# View migrations
npm run migrate:deploy

# Restart service
# (Use Render dashboard → Manual Deploy)
```

### Frontend (Vercel CLI)
```bash
# Deploy from local
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls
```

---

## 💡 Pro Tips

1. **Free Tier Limits**:
   - Backend sleeps after 15 min (first request slow)
   - Database expires after 90 days (upgrade to $7/mo)
   - Upgrade to Starter ($7/mo) for 24/7 uptime

2. **Fast Debugging**:
   - Render logs: Dashboard → Your Service → Logs
   - Vercel logs: Dashboard → Your Project → Deployments → Logs
   - Database: Render → Your DB → Connect (connection string)

3. **Custom Domains**:
   - Render: Settings → Custom Domains → Add
   - Vercel: Settings → Domains → Add

4. **Auto-Deploy**:
   - Both platforms auto-deploy on git push to `main`
   - Vercel creates preview URLs for PR branches

---

## 🚨 Troubleshooting

### Backend won't start
```bash
# Check logs for errors
# Common: DATABASE_URL missing or JWT_SECRET too short

# Fix: Add/update env vars in Render dashboard
```

### Frontend can't connect to backend
```bash
# Check NEXT_PUBLIC_API_URL is correct
# Check CORS_ORIGINS includes your Vercel URL
# Redeploy after changing env vars
```

### Database connection errors
```bash
# Verify DATABASE_URL format:
# postgresql://user:pass@host:5432/dbname

# Test in Render Shell:
npx prisma db push
```

---

## 📊 URLs After Deployment

- **Backend API**: `https://emblue-social-ai-backend.onrender.com`
- **Frontend App**: `https://emblue-social-ai.vercel.app`
- **Backend Logs**: https://dashboard.render.com (→ Your service → Logs)
- **Frontend Logs**: https://vercel.com/dashboard (→ Your project → Deployments)
- **Database**: Render Dashboard → Your DB → Connect

---

## 📖 Full Documentation

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for comprehensive instructions.

---

**Need help?** Check the full deployment guide or platform docs:
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
