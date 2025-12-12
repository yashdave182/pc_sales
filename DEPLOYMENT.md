# 🚀 Deployment Guide - Sales Management System

This guide will help you deploy the Sales Management System with:
- **Frontend** on Vercel
- **Backend** on Render

## 📋 Prerequisites

- GitHub account with your code pushed
- Vercel account (free tier)
- Render account (free tier)
- Your Render backend URL (will get this during deployment)

---

## 🔧 Step 1: Deploy Backend to Render

### 1.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up using your GitHub account

### 1.2 Deploy Backend Service

1. **Click "New +"** → **"Web Service"**

2. **Connect your repository:**
   - Select your GitHub repository: `pc_sales`
   - Click "Connect"

3. **Configure the service:**
   ```
   Name: sales-management-backend
   Region: Oregon (or closest to you)
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt && python init_and_import.py
   Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   Instance Type: Free
   ```

4. **Add Environment Variables:**
   - Click "Advanced"
   - Add these environment variables:
     ```
     RENDER=true
     PORT=8000
     ```

5. **Add Persistent Disk** (IMPORTANT - to keep database):
   - Click "Add Disk"
   - Name: `sales-data`
   - Mount Path: `/opt/render/project/data`
   - Size: 1 GB

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes)
   - Watch the logs for any errors
   - You should see: "Database initialized and data imported successfully!"

8. **Copy your Backend URL:**
   - Format: `https://sales-management-backend-xxxx.onrender.com`
   - Save this URL - you'll need it for Vercel!

### 1.3 Verify Backend is Working

Test your backend by visiting:
```
https://your-backend-url.onrender.com/health
```

You should see:
```json
{
  "status": "healthy",
  "database": "connected",
  "tables": {...}
}
```

Also test the API docs:
```
https://your-backend-url.onrender.com/docs
```

---

## 🌐 Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up using your GitHub account

### 2.2 Deploy Frontend

1. **Click "Add New..."** → **"Project"**

2. **Import your repository:**
   - Select your GitHub repository: `pc_sales`
   - Click "Import"

3. **Configure the project:**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables** (MOST IMPORTANT):
   - Click "Environment Variables"
   - Add this variable:
     ```
     Name: VITE_API_URL
     Value: https://your-backend-url.onrender.com
     ```
   - **Replace** `your-backend-url.onrender.com` with YOUR actual Render backend URL from Step 1.8

5. **Click "Deploy"**

6. **Wait for deployment** (2-5 minutes)

7. **Your frontend URL will be:**
   ```
   https://pc-sales.vercel.app
   ```
   or similar

---

## ✅ Step 3: Verify Everything Works

### 3.1 Check Backend CORS

Your backend is already configured to allow your Vercel URL:
```python
allow_origins=[
    "https://pc-sales.vercel.app",
    ...
]
```

If your Vercel URL is different, you need to update `backend/main.py`:

1. Edit the CORS middleware:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=[
           "http://localhost:5173",
           "http://localhost:3000",
           "https://pc-sales.vercel.app",
           "https://your-actual-vercel-url.vercel.app",  # Add this
       ],
       ...
   )
   ```

2. Push the changes:
   ```bash
   git add backend/main.py
   git commit -m "Update CORS for production URL"
   git push origin main
   ```

3. Render will automatically redeploy

### 3.2 Test the Application

1. Open your Vercel URL: `https://pc-sales.vercel.app`

2. **Check the Dashboard:**
   - Should show sales data, metrics, charts
   - If empty, check browser console (F12)

3. **Check Customers page:**
   - Should show 520+ customers
   - If "No rows", check Network tab in browser console

4. **Check Products page:**
   - Should show 8 products

5. **Check Sales page:**
   - Should show recent sales

---

## 🐛 Troubleshooting

### Problem: "No data showing" or "No rows"

**Solution 1: Check Environment Variable**
```
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Verify VITE_API_URL is set to your Render backend URL
5. If wrong, update it and click "Redeploy"
```

**Solution 2: Check Browser Console**
```
1. Open your Vercel site
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Look for errors like:
   - "CORS error" → Update CORS in backend/main.py
   - "Failed to fetch" → Backend might be down
   - "404 Not Found" → Check API_URL is correct
```

**Solution 3: Check Network Tab**
```
1. Press F12 → Network tab
2. Reload page
3. Look for API calls (filter by "api")
4. Check:
   - Are they going to the right URL?
   - What's the status code? (should be 200)
   - What's the response?
```

**Solution 4: Verify Backend**
```
Visit: https://your-backend.onrender.com/api/customers
Should return JSON with customers
```

**Solution 5: Re-import Database on Render**
```
1. Go to Render Dashboard
2. Click on your backend service
3. Go to Shell tab
4. Run: python init_and_import.py
5. Wait for "Database initialized successfully"
```

### Problem: CORS errors

**Check CORS settings:**
1. In `backend/main.py`, verify your Vercel URL is in `allow_origins`
2. Push changes to GitHub
3. Render will auto-redeploy

### Problem: Backend keeps sleeping (Free tier)

**Render free tier sleeps after 15 minutes of inactivity**

Solutions:
- First request after sleep takes ~30 seconds to wake up (be patient!)
- Upgrade to paid plan ($7/month) for always-on
- Use a service like [UptimeRobot](https://uptimerobot.com) to ping every 14 minutes

### Problem: Database empty after redeployment

**If you didn't add persistent disk:**
1. Go to Render Dashboard → Your service → Disks
2. Add a disk if missing
3. Redeploy

---

## 🔄 How to Update After Deployment

### Update Frontend:
```bash
# Make changes to frontend code
git add .
git commit -m "Your changes"
git push origin main

# Vercel will automatically redeploy!
```

### Update Backend:
```bash
# Make changes to backend code
git add .
git commit -m "Your changes"
git push origin main

# Render will automatically redeploy!
```

### Update Environment Variables:

**Vercel:**
1. Dashboard → Your Project → Settings → Environment Variables
2. Update the variable
3. Click "Redeploy" on Deployments page

**Render:**
1. Dashboard → Your Service → Environment
2. Update the variable
3. Click "Save Changes" (auto-redeploys)

---

## 📊 Expected Data After Deployment

Your application should show:
- **520 customers**
- **8 products**
- **881 distributors**
- **11 sales**
- **18 sale items**
- **15 payments**

If you see these numbers, everything is working correctly! 🎉

---

## 🆘 Still Having Issues?

### Check these URLs:

1. **Backend Health:**
   ```
   https://your-backend.onrender.com/health
   ```

2. **Backend API Docs:**
   ```
   https://your-backend.onrender.com/docs
   ```

3. **Frontend:**
   ```
   https://pc-sales.vercel.app
   ```

4. **Check Render Logs:**
   - Go to Render Dashboard → Your Service → Logs
   - Look for errors

5. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on latest deployment → View Function Logs

### Common Fixes:

**"Mixed Content" errors:**
- Make sure API_URL uses `https://` not `http://`

**"Network Error":**
- Check if backend is awake (visit /health endpoint)
- Check CORS settings

**"Unauthorized" or 401 errors:**
- Not implemented in current version (no auth yet)

---

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Render backend sleeps after 15min inactivity (first request takes 30s to wake)
   - Limited to 750 hours/month (enough for testing)

2. **Database Persistence:**
   - MUST add persistent disk to Render
   - Otherwise database resets on every deploy

3. **Environment Variables:**
   - Must be set in Vercel dashboard
   - Not in .env files (those are for local development only)

4. **CORS:**
   - Must add your Vercel URL to backend CORS settings
   - Push changes to GitHub to update

---

## ✅ Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Persistent disk added to Render (1GB)
- [ ] Environment variables set on Render (RENDER=true)
- [ ] Backend health check works
- [ ] Backend URL copied
- [ ] Frontend deployed to Vercel  
- [ ] VITE_API_URL set on Vercel
- [ ] Frontend can access backend
- [ ] Data showing on dashboard
- [ ] Customers page shows 520+ rows
- [ ] Products page shows 8 products
- [ ] No CORS errors in console

---

## 🎉 Success!

If everything is working:
- Dashboard shows metrics and charts
- Customers page shows all 520 customers
- You can create new sales
- You can schedule demos

Your Sales Management System is now live! 🚀

---

**Need help?** Check the troubleshooting section above or review the logs in Render/Vercel dashboards.