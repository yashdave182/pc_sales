# 🚀 Deployment Guide - Sales Management System

## 📋 Overview

This guide will help you deploy your Sales Management System using a **single repository (monorepo)** approach. No need to split into separate repos!

**Current Structure:**
```
sales-management-web/
├── frontend/          ← React + Vite
├── backend/           ← FastAPI + Python
└── (deployment files) ← We'll create these
```

---

## ✅ **Answer: Keep Single Repository!**

**You do NOT need separate repositories.** Modern hosting platforms can handle monorepos perfectly:

- ✅ **Vercel** - Specify `frontend` folder
- ✅ **Render** - Specify `backend` folder
- ✅ **Railway** - Deploy both from same repo
- ✅ **Netlify** - Specify `frontend/dist` folder

**Benefits:**
- Easier version control
- One place to manage code
- Simpler for collaboration
- Your current setup works perfectly!

---

## 🎯 Recommended Setup

**Frontend:** Vercel (FREE)
**Backend:** Render (FREE tier available)
**Repository:** Your current single GitHub repo

**Total Cost:** $0 to start, $7/month for production

---

## 📝 Step-by-Step Deployment

### **STEP 1: Prepare Your Code** ⚙️

#### 1.1 Update Backend CORS Settings

Edit `backend/main.py` to allow your production frontend URL:

```python
# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Add your Vercel URL here
        "https://*.vercel.app",          # Allow all Vercel preview URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 1.2 Create Production Environment File

File: `frontend/.env.production` (already created)
```env
VITE_API_URL=https://sales-management-backend.onrender.com
```

**Note:** We'll update this URL after deploying the backend.

#### 1.3 Update .gitignore

Make sure these are in your `.gitignore`:
```
# Environment files
.env
.env.local
.env.*.local

# Dependencies
node_modules/
venv/
__pycache__/

# Build outputs
frontend/dist/
frontend/build/
*.pyc

# Database (don't commit your actual database!)
sales_management.db
*.sqlite
*.db

# IDE
.vscode/
.idea/
*.swp
```

#### 1.4 Commit Everything to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

### **STEP 2: Deploy Backend to Render** 🐍

#### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Click "Get Started"
3. Sign up with GitHub (recommended)
4. Authorize Render to access your repositories

#### 2.2 Create New Web Service
1. Click "New +" (top right)
2. Select "Web Service"
3. Connect your GitHub repository:
   - Click "Connect account" if first time
   - Select `sales-management-web` repository

#### 2.3 Configure Backend Service

**Basic Settings:**
```
Name: sales-management-backend
Region: Oregon (US West) or closest to you
Branch: main
```

**Build & Deploy:**
```
Root Directory: (leave blank - we'll use commands)
Runtime: Python 3
Build Command: cd backend && pip install -r requirements.txt
Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Instance Type:**
```
Free (for testing)
OR
Starter ($7/month for production - no sleep)
```

**Environment Variables:**
Click "Advanced" → Add Environment Variables:
```
Key: PYTHON_VERSION
Value: 3.11.0

Key: PORT
Value: 8000
```

#### 2.4 Deploy!
1. Click "Create Web Service"
2. Wait 2-3 minutes for deployment
3. You'll see build logs in real-time

#### 2.5 Get Your Backend URL
Once deployed, you'll see:
```
Your service is live at https://sales-management-backend.onrender.com
```

**⚠️ IMPORTANT:** Copy this URL! You'll need it for frontend.

#### 2.6 Test Backend
Visit: `https://sales-management-backend.onrender.com/health`

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

### **STEP 3: Deploy Frontend to Vercel** ⚛️

#### 3.1 Update Frontend Environment

Edit `frontend/.env.production`:
```env
VITE_API_URL=https://sales-management-backend.onrender.com
```

Replace with YOUR actual backend URL from Step 2.5.

Commit this change:
```bash
git add frontend/.env.production
git commit -m "Update production API URL"
git push origin main
```

#### 3.2 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub (recommended)
4. Authorize Vercel

#### 3.3 Import Project
1. Click "Add New..." → "Project"
2. Find and Import `sales-management-web` repository
3. Click "Import"

#### 3.4 Configure Frontend

**Framework Preset:**
```
Framework: Vite
```

**Root Directory:**
```
frontend
```
(Click "Edit" next to Root Directory and select `frontend`)

**Build Settings:**
```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Environment Variables:**
Click "Environment Variables" and add:
```
Name: VITE_API_URL
Value: https://sales-management-backend.onrender.com
```
(Use your actual backend URL)

Select: Production, Preview, and Development

#### 3.5 Deploy!
1. Click "Deploy"
2. Wait 30-60 seconds
3. Watch the build logs

#### 3.6 Get Your Frontend URL
Once deployed, you'll see:
```
🎉 Congratulations!
Your project is live at https://sales-management-xyz123.vercel.app
```

**Copy this URL!**

---

### **STEP 4: Update Backend CORS** 🔄

Now that you have your frontend URL, update backend:

#### 4.1 Edit `backend/main.py`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sales-management-xyz123.vercel.app",  # Your actual Vercel URL
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 4.2 Commit and Push
```bash
git add backend/main.py
git commit -m "Add production frontend URL to CORS"
git push origin main
```

#### 4.3 Render Auto-Redeploys
Render will automatically detect the change and redeploy (takes 1-2 minutes).

---

### **STEP 5: Test Your Application** ✅

#### 5.1 Open Your Frontend
Visit: `https://sales-management-xyz123.vercel.app`

#### 5.2 Test Features
- ✅ Dashboard loads
- ✅ Can view customers
- ✅ Can create sale
- ✅ Can schedule demo
- ✅ Can record payment
- ✅ Charts display correctly

#### 5.3 Check Browser Console
Press `F12` → Console tab
- Should see no errors
- API calls should succeed

#### 5.4 Test on Mobile
Open the URL on your phone - should be fully responsive!

---

## 🎉 You're Live!

**Frontend:** `https://your-app.vercel.app`
**Backend:** `https://your-backend.onrender.com`

Share the frontend URL with your sales team!

---

## 🔧 Post-Deployment Configuration

### Database Setup

**⚠️ IMPORTANT:** Render's free tier has no persistent storage!

Your SQLite database will reset when the service restarts (every 15 minutes of inactivity on free tier).

**Solutions:**

#### Option 1: Upgrade to Render Paid Plan ($7/month)
- Persistent disk storage
- No auto-sleep
- Recommended for production

#### Option 2: Use External Database
- **Supabase** (PostgreSQL - Free tier)
- **PlanetScale** (MySQL - Free tier)
- **Railway** (PostgreSQL - $5/month)

#### Option 3: Keep SQLite with Persistent Disk

Add to Render service:
1. Go to Render dashboard
2. Click your backend service
3. Go to "Disks" tab
4. Click "Add Disk"
5. Configure:
   ```
   Name: sales-data
   Mount Path: /opt/render/project/src/backend
   Size: 1 GB (free)
   ```
6. Update database path in `backend/main.py`:
   ```python
   DB_PATH = "/opt/render/project/src/backend/sales_management.db"
   ```

---

## 🌍 Custom Domain Setup (Optional)

### Buy a Domain
- **Namecheap**: ~$10/year
- **Google Domains**: ~$12/year
- **Cloudflare**: ~$10/year

### Connect to Vercel (Frontend)

1. Go to Vercel Dashboard
2. Click your project
3. Go to "Settings" → "Domains"
4. Click "Add Domain"
5. Enter your domain: `salesapp.com`
6. Follow DNS instructions:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
7. Wait 5-60 minutes for DNS propagation
8. ✅ Done! Auto HTTPS included

### Connect to Render (Backend)

1. Go to Render Dashboard
2. Click your backend service
3. Go to "Settings" → "Custom Domain"
4. Click "Add Custom Domain"
5. Enter: `api.salesapp.com`
6. Add DNS record at your domain registrar:
   ```
   Type: CNAME
   Name: api
   Value: [provided by Render]
   ```
7. ✅ Done! Auto HTTPS included

### Update Frontend to Use Custom Domain

Edit `frontend/.env.production`:
```env
VITE_API_URL=https://api.salesapp.com
```

Commit, push, and Vercel will auto-redeploy.

---

## 🔄 Continuous Deployment (Auto-Deploy)

Both Vercel and Render are already set up for continuous deployment:

**How it works:**
1. You make code changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin main
   ```
3. **Vercel auto-deploys frontend** (30-60 seconds)
4. **Render auto-deploys backend** (1-2 minutes)
5. Changes are live automatically! ✅

**No manual deployment needed!**

---

## 📊 Monitoring & Logs

### Vercel Logs
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Click "Deployments"
4. Click any deployment to see logs

### Render Logs
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click your service
3. Click "Logs" tab
4. See real-time logs

### Health Checks

**Backend Health:**
```
GET https://your-backend.onrender.com/health
```

**Frontend Health:**
```
Just visit: https://your-app.vercel.app
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Failed to fetch" Error

**Cause:** CORS not configured properly

**Solution:**
1. Check `backend/main.py` CORS settings
2. Make sure your Vercel URL is in `allow_origins`
3. Redeploy backend

### Issue 2: Backend Sleeping (Free Tier)

**Cause:** Render free tier sleeps after 15 minutes of inactivity

**Solution:**
- Upgrade to Starter plan ($7/month)
- OR accept 30-second wake-up time on first request
- OR use a service like UptimeRobot to ping every 14 minutes

### Issue 3: Database Resets

**Cause:** No persistent storage on free tier

**Solution:**
- Add persistent disk (free, 1GB)
- OR upgrade to paid plan
- OR use external database

### Issue 4: Build Failed on Vercel

**Check:**
1. Is `frontend/package.json` correct?
2. Run `npm run build` locally - does it work?
3. Check Vercel build logs for specific error
4. Ensure all dependencies are in `package.json`

### Issue 5: Backend 500 Error

**Check:**
1. Render logs for error details
2. Database path correct?
3. All dependencies in `requirements.txt`?
4. Python version correct?

---

## 💰 Cost Breakdown

### Free Tier (Testing)
```
Frontend (Vercel): $0
Backend (Render Free): $0
Total: $0/month

Limitations:
- Backend sleeps after 15 min inactivity
- No persistent storage
- 750 hours/month runtime
```

### Production Tier (Recommended)
```
Frontend (Vercel): $0 (unlimited static sites)
Backend (Render Starter): $7/month
Custom Domain: $10/year (~$1/month)
Total: ~$8/month

Benefits:
- No sleep time
- Persistent storage
- Better performance
- 24/7 availability
```

### Scale-Up Tier (High Traffic)
```
Frontend (Vercel Pro): $20/month
Backend (Render Standard): $25/month
Database (Railway): $5/month
Total: $50/month

For: 10,000+ users, high traffic
```

---

## 🚀 Alternative: Deploy Both to Railway

If you prefer everything in one place:

### Railway Setup (All-in-One)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Choose `sales-management-web`

**Deploy Backend:**
1. Click "Add Service" → "GitHub Repo"
2. Configure:
   ```
   Root Directory: backend
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
3. Add environment variables:
   ```
   PYTHON_VERSION=3.11.0
   ```

**Deploy Frontend:**
1. Click "Add Service" → "GitHub Repo" (same repo)
2. Configure:
   ```
   Root Directory: frontend
   Build Command: npm run build
   Start Command: npx serve dist -l $PORT
   ```
3. Add environment variable:
   ```
   VITE_API_URL=https://backend-production-xxxx.up.railway.app
   ```

**Cost:** $5 credit/month free, then ~$10/month

---

## 📚 Additional Resources

### Documentation
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html)

### Support
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Render Support: [render.com/docs/support](https://render.com/docs/support)
- Community: GitHub Issues, Discord

---

## ✅ Deployment Checklist

Before going live:

**Code:**
- [ ] All features tested locally
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] Database migrations (if any)

**Deployment:**
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set
- [ ] CORS configured with frontend URL
- [ ] Health checks passing
- [ ] API calls working

**Post-Deployment:**
- [ ] Test all features on production
- [ ] Test on mobile devices
- [ ] Monitor logs for errors
- [ ] Set up uptime monitoring
- [ ] Document URLs for team
- [ ] Train users on new system

**Optional:**
- [ ] Custom domain configured
- [ ] SSL certificates active
- [ ] Database backups configured
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)

---

## 🎓 Next Steps

1. **Deploy using this guide** ✅
2. **Test thoroughly** ✅
3. **Share with sales team** ✅
4. **Monitor usage** 📊
5. **Collect feedback** 💬
6. **Upgrade plan if needed** 💰
7. **Add custom domain** 🌍
8. **Set up backups** 💾

---

## 🆘 Need Help?

**Stuck on deployment?**
1. Check the logs (most errors are explained there)
2. Review this guide step-by-step
3. Google the specific error message
4. Check hosting provider's status page
5. Ask in their Discord/community

**Common Support Channels:**
- Vercel: [discord.gg/vercel](https://discord.gg/vercel)
- Render: [community.render.com](https://community.render.com)
- Railway: [discord.gg/railway](https://discord.gg/railway)

---

## 🎉 Congratulations!

You now have a production-ready Sales Management System deployed and accessible from anywhere!

**Your live application:**
- ✅ Accessible 24/7
- ✅ Secure (HTTPS)
- ✅ Fast (CDN)
- ✅ Scalable
- ✅ Auto-deploys on code changes
- ✅ Mobile-friendly

**Share the URL with your team and start selling!** 🚀

---

**Last Updated:** January 2025
**Version:** 2.0
**Deployment:** Monorepo (Single Repository)