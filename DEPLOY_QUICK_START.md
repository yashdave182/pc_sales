# 🚀 Quick Deployment Commands

## TL;DR - Deploy in 5 Minutes

### Prerequisites
- GitHub account
- Code pushed to GitHub repository

---

## 🎯 Method 1: Vercel + Render (Recommended)

### Backend (Render)
```bash
# 1. Push code to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Go to render.com
# 3. New Web Service → Connect GitHub repo
# 4. Configure:
Build Command: cd backend && pip install -r requirements.txt
Start Command: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT

# 5. Copy backend URL: https://your-backend.onrender.com
```

### Frontend (Vercel)
```bash
# 1. Update frontend/.env.production
VITE_API_URL=https://your-backend.onrender.com

# 2. Push to GitHub
git add frontend/.env.production
git commit -m "Update API URL"
git push origin main

# 3. Go to vercel.com
# 4. Import Project → Select your repo
# 5. Configure:
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Environment Variable: VITE_API_URL=https://your-backend.onrender.com

# 6. Deploy! (30 seconds)
```

### Update Backend CORS
```python
# backend/main.py
allow_origins=[
    "http://localhost:5173",
    "https://your-app.vercel.app",  # Add this
    "https://*.vercel.app",
]

# Commit and push - Render auto-redeploys
```

---

## 🔗 URLs After Deployment

```
Frontend: https://your-app.vercel.app
Backend:  https://your-backend.onrender.com
API Docs: https://your-backend.onrender.com/docs
```

---

## 🎯 Method 2: Railway (All-in-One)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to railway.app
# 3. New Project → Deploy from GitHub
# 4. Select your repo

# Backend Service:
Root Directory: backend
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT

# Frontend Service:
Root Directory: frontend
Build Command: npm run build
Start Command: npx serve dist -l $PORT

# Done! Both deployed in one place
```

---

## ⚡ One-Command Local Test

```bash
# Test before deploying

# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
python main.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev

# Open: http://localhost:5173
```

---

## 🔧 Essential Git Commands

```bash
# Initialize Git (if needed)
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/sales-management-web.git
git push -u origin main

# Update after changes
git add .
git commit -m "Your message"
git push origin main
# → Auto-deploys to Vercel & Render!
```

---

## 🌍 Custom Domain Setup

### Vercel (Frontend)
```
1. Vercel Dashboard → Settings → Domains
2. Add Domain: yourdomain.com
3. Add DNS record at your registrar:
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
```

### Render (Backend)
```
1. Render Dashboard → Settings → Custom Domain
2. Add: api.yourdomain.com
3. Add DNS record at your registrar:
   Type: CNAME
   Name: api
   Value: [provided by Render]
```

---

## 🐛 Quick Troubleshooting

### Backend not working?
```bash
# Check Render logs
Dashboard → Your Service → Logs

# Common fixes:
- Ensure requirements.txt is complete
- Check Python version (3.11.0)
- Verify start command is correct
```

### Frontend not loading?
```bash
# Check Vercel deployment logs
Dashboard → Deployments → Click latest

# Common fixes:
- Update VITE_API_URL in environment variables
- Check build command: npm run build
- Verify output directory: dist
```

### CORS errors?
```python
# backend/main.py - Add your frontend URL
allow_origins=[
    "http://localhost:5173",
    "https://your-app.vercel.app",  # ← Add this!
]
```

---

## 📊 Check Deployment Status

```bash
# Backend Health Check
curl https://your-backend.onrender.com/health

# Should return:
{
  "status": "healthy",
  "database": "connected"
}

# Frontend
# Just visit: https://your-app.vercel.app
```

---

## 💰 Cost Quick Reference

### Free Tier
```
Vercel Frontend:  $0
Render Backend:   $0 (sleeps after 15 min)
Total:            $0/month
```

### Production
```
Vercel Frontend:  $0
Render Backend:   $7/month (no sleep, persistent storage)
Total:            $7/month
```

---

## 🚀 Deploy Checklist

```
Before deploying:
☐ Code pushed to GitHub
☐ .env.production configured
☐ CORS settings updated
☐ All dependencies listed

Deploy backend:
☐ Render account created
☐ Service configured
☐ Backend deployed
☐ URL copied

Deploy frontend:
☐ Vercel account created
☐ API URL updated
☐ Frontend deployed
☐ Test live URL

Post-deployment:
☐ Update backend CORS with frontend URL
☐ Test all features
☐ Check on mobile
☐ Share URL with team
```

---

## 🆘 Emergency Rollback

```bash
# If deployment breaks something:

# Vercel
1. Dashboard → Deployments
2. Find last working deployment
3. Click "..." → Promote to Production

# Render
1. Dashboard → Your Service → Deploys
2. Find last working deploy
3. Click "..." → Redeploy

# Git
git revert HEAD
git push origin main
# Auto-redeploys previous version
```

---

## 📞 Support Links

- Vercel: https://vercel.com/support
- Render: https://render.com/docs/support
- Railway: https://railway.app/help

---

## 🎉 You're Done!

```
✅ Backend deployed
✅ Frontend deployed
✅ Auto-deploy configured
✅ HTTPS enabled
✅ Ready for production

Share: https://your-app.vercel.app
```

**Total time: 5-10 minutes** 🚀