# Render Deployment Guide for SketchScript

## 🚀 Quick Deployment Steps

### 1. Push Your Code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment - removed localhost dependencies"
git push origin main
```

### 2. Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `sketchscript-database`
   - **Database**: `sketchscript`
   - **User**: `sketchscript_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free tier or Starter
4. Click **"Create Database"**
5. **Save the DATABASE_URL** - you'll need it for the backend

### 3. Deploy Backend Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `sketchscript-backend`
   - **Environment**: `Node`
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Build Command**: `npm ci`
   - **Start Command**: `npm start`
   - **Plan**: Free tier or Starter

4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=8000
   DATABASE_URL=[paste from step 2]
   SESSION_SECRET=your-super-secure-secret-here-at-least-32-chars
   CORS_ORIGINS=https://your-frontend-url.onrender.com
   ```

5. Click **"Create Web Service"**
6. **Save the backend URL** (e.g., `https://sketchscript-backend.onrender.com`)

### 4. Deploy Frontend Service

1. Click **"New +"** → **"Static Site"**
2. Connect your GitHub repository  
3. Configure:
   - **Name**: `sketchscript-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

4. **Environment Variables**:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_WS_URL=wss://your-backend-url.onrender.com
   ```

5. Click **"Create Static Site"**

### 5. Update Backend CORS

After frontend deployment:
1. Go to your backend service on Render
2. Update the `CORS_ORIGINS` environment variable with your frontend URL
3. Redeploy the backend service

## 🔧 Environment Variables Summary

### Backend (.env file for local development)
```env
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://username:password@localhost:5432/sketchscript
SESSION_SECRET=your-local-secret
CORS_ORIGINS=http://localhost:5173
```

### Backend (Render Environment Variables)
```
NODE_ENV=production
PORT=8000
DATABASE_URL=[from Render PostgreSQL]
SESSION_SECRET=[32+ character secret]
CORS_ORIGINS=[your frontend URL]
```

### Frontend (Render Environment Variables)  
```
VITE_API_URL=[your backend URL]
VITE_WS_URL=[your backend URL with wss://]
```

## 🚀 Auto-Deploy with render.yaml (Alternative)

You can also use the `render.yaml` file in the root directory for automated deployment:

1. Push your code with the `render.yaml` file
2. Go to Render Dashboard
3. Click **"New +"** → **"Blueprint"**
4. Connect your repository
5. Render will automatically create all services

## 🔍 Troubleshooting

### Backend Issues
- Check logs in Render dashboard
- Verify DATABASE_URL is correct
- Ensure all environment variables are set

### Frontend Issues  
- Check that VITE_API_URL points to backend
- Verify WebSocket URL uses `wss://` not `ws://`
- Check browser console for CORS errors

### WebSocket Issues
- Ensure backend accepts WebSocket connections
- Check that firewall allows WebSocket traffic
- Verify WSS protocol for production

## �� Post-Deployment Checklist

- [ ] Database is connected and accessible
- [ ] Backend service is running and responding
- [ ] Frontend loads without errors
- [ ] WebSocket connections work for real-time features
- [ ] CORS is configured correctly
- [ ] Code execution works (if using Docker features)

## 🔄 Future Updates

For future deployments:
1. Push changes to GitHub
2. Render will auto-deploy (if auto-deploy is enabled)
3. Monitor deployment logs
4. Test all features after deployment

Your SketchScript app should now be live! 🎉
