# Media Storage Service - Deployment Guide

Deploy to **https://piwebtechnology.com/image-upload**

---

## Table of Contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Environment Files Explained](#environment-files-explained)
4. [Server Setup](#server-setup)
5. [Install Dependencies on Server](#install-dependencies-on-server)
6. [Deploy Backend](#deploy-backend)
7. [Deploy Frontend](#deploy-frontend)
8. [Nginx Configuration](#nginx-configuration)
9. [SSL Certificate](#ssl-certificate)
10. [Start the Application](#start-the-application)
11. [Verify Deployment](#verify-deployment)
12. [Updates & Maintenance](#updates--maintenance)
13. [Troubleshooting](#troubleshooting)

---

## Architecture

```
Browser (https://piwebtechnology.com/image-upload)
    |
    ▼
[Nginx] (:80 / :443)
    |
    ├── /image-upload/           → serves frontend static files
    ├── /image-upload/api/       → proxy to Node.js backend (:4000)
    └── /image-upload/media/     → proxy to Node.js backend (:4000)
                                       |
                                  ┌────┴────┐
                                  |         |
                              [MariaDB]  [Redis]
                               :3306      :6379
```

---

## Prerequisites

- VPS / Cloud server (Ubuntu 22.04+ recommended, minimum 2GB RAM)
- Domain `piwebtechnology.com` DNS A-record pointing to your server IP
- SSH access to the server

---

## Environment Files Explained

This project uses **separate `.env` files** for backend and frontend.

### Backend `.env` files

Located at `backend/.env` (development) and `backend/.env.production` (production).

| Variable | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `PORT` | `4000` | `4000` |
| `DB_HOST` | `127.0.0.1` | `127.0.0.1` |
| `DB_USER` | `sumitkumar` | `mediauser` |
| `DB_PASSWORD` | *(empty)* | `YOUR_SECURE_DB_PASSWORD` |
| `DB_NAME` | `media_storage_service` | `media_storage_service` |
| `REDIS_HOST` | `127.0.0.1` | `127.0.0.1` |
| `BASE_URL` | `http://localhost:4000` | `https://piwebtechnology.com/image-upload` |

**How it works:** The backend reads `backend/.env` directly. On the production server, you rename `.env.production` to `.env` (or just edit `.env` with production values).

### Frontend `.env` files

Located at `frontend/.env` (development) and `frontend/.env.production` (production).

| Variable | Development | Production |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | `https://piwebtechnology.com/image-upload/api` |
| `VITE_MEDIA_BASE_URL` | `http://localhost:4000` | `https://piwebtechnology.com/image-upload` |

**How it works:**
- When you run `npm run dev` → Vite loads `frontend/.env` (development URLs)
- When you run `npm run build` → Vite loads `frontend/.env.production` (production URLs)
- The production URLs get baked into the built JavaScript files at build time

In **development**, the Vite dev server proxies `/api` requests to `localhost:4000`, so the `VITE_API_BASE_URL` value doesn't actually matter much (the proxy handles it). But in **production**, the frontend calls the full production URL directly.

---

## Server Setup

### 1. SSH into your server

```bash
ssh your-user@piwebtechnology.com
```

### 2. Create project directory

```bash
sudo mkdir -p /var/www/image-upload
sudo chown $USER:$USER /var/www/image-upload
```

### 3. Upload project files

Run this from your **local machine**:

```bash
# Upload entire project
scp -r "/Users/sumitkumar/Desktop/Bright Repo/image upload/"* your-user@piwebtechnology.com:/var/www/image-upload/
```

Or use `rsync` for faster subsequent deploys:

```bash
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude 'uploads' \
  "/Users/sumitkumar/Desktop/Bright Repo/image upload/" \
  your-user@piwebtechnology.com:/var/www/image-upload/
```

---

## Install Dependencies on Server

SSH into your server and run these commands:

### Node.js 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should show v20.x+
```

### MariaDB

```bash
sudo apt install -y mariadb-server
sudo systemctl enable mariadb
sudo systemctl start mariadb

# Secure the installation
sudo mysql_secure_installation

# Create database and user
sudo mariadb -e "
CREATE DATABASE media_storage_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mediauser'@'localhost' IDENTIFIED BY 'YOUR_SECURE_DB_PASSWORD';
GRANT ALL PRIVILEGES ON media_storage_service.* TO 'mediauser'@'localhost';
FLUSH PRIVILEGES;
"
```

### Redis

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # should return PONG
```

### FFmpeg

```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

### PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Deploy Backend

```bash
cd /var/www/image-upload/backend
```

### 1. Set up production environment

Copy and edit the production env file:

```bash
cp .env.production .env
nano .env
```

Update these values in `.env`:

```env
NODE_ENV=production
PORT=4000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=mediauser
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD    # ← change this
DB_NAME=media_storage_service

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600
BASE_URL=https://piwebtechnology.com/image-upload

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 2. Install dependencies and build

```bash
npm ci
npm run build
```

### 3. Create upload directories

```bash
mkdir -p uploads/original uploads/compressed uploads/thumbnails logs
```

### 4. Test that it starts

```bash
node dist/server.js
# Should see: Server running on port 4000
# Press Ctrl+C to stop
```

---

## Deploy Frontend

```bash
cd /var/www/image-upload/frontend
```

### 1. The `.env.production` is already set

It should contain:

```env
VITE_API_BASE_URL=https://piwebtechnology.com/image-upload/api
VITE_MEDIA_BASE_URL=https://piwebtechnology.com/image-upload
```

### 2. Install and build

```bash
npm ci
npm run build
```

This creates a `dist/` folder with static files. The production URLs from `.env.production` are baked into the build.

### 3. Verify build output

```bash
ls dist/
# Should contain: index.html, assets/ folder
```

---

## Nginx Configuration

### 1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2. Create site configuration

```bash
sudo nano /etc/nginx/sites-available/piwebtechnology
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name piwebtechnology.com www.piwebtechnology.com;

    client_max_body_size 100M;

    # ─── Your existing main website (if any) ───
    # location / {
    #     root /var/www/piwebtechnology/html;
    #     index index.html;
    # }

    # ─── Media Storage Service: Frontend (static files) ───
    location /image-upload/ {
        alias /var/www/image-upload/frontend/dist/;
        index index.html;
        try_files $uri $uri/ /image-upload/index.html;
    }

    # ─── Media Storage Service: Backend API ───
    location /image-upload/api/ {
        rewrite ^/image-upload/api/(.*) /api/$1 break;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # ─── Media Storage Service: Public media files ───
    location /image-upload/media/ {
        rewrite ^/image-upload/media/(.*) /media/$1 break;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # ─── Cache static assets ───
    location ~* ^/image-upload/assets/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        alias /var/www/image-upload/frontend/dist/;
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/piwebtechnology /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default    # remove default if not needed
sudo nginx -t                                   # test config - must show "ok"
sudo systemctl reload nginx
```

---

## SSL Certificate

### Install Certbot and get a free Let's Encrypt certificate

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d piwebtechnology.com -d www.piwebtechnology.com
```

Certbot will:
- Obtain a free SSL certificate
- Automatically update the Nginx config to redirect HTTP → HTTPS
- Set up auto-renewal (runs twice daily via systemd timer)

### Verify auto-renewal

```bash
sudo certbot renew --dry-run
```

---

## Start the Application

### Start backend with PM2

```bash
cd /var/www/image-upload/backend
pm2 start dist/server.js --name media-backend
pm2 save
pm2 startup    # follow the command it prints to enable auto-start on reboot
```

### Verify PM2 is running

```bash
pm2 status
# Should show media-backend as "online"

pm2 logs media-backend --lines 20
# Should show: Server running on port 4000, Database connected
```

---

## Verify Deployment

### 1. Backend health check

```bash
curl https://piwebtechnology.com/image-upload/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-03-17T..."}
```

### 2. Frontend loads

Open in browser: **https://piwebtechnology.com/image-upload**

You should see the Media Storage dashboard.

### 3. Upload test

1. Click "Add Media"
2. Select any image (PNG, JPG, etc.)
3. Enter a company name
4. Upload
5. Image should appear in gallery with compression stats

### 4. Public URL test

After uploading, copy the public URL of any image and open it in a new browser tab. The image should render directly.

---

## Updates & Maintenance

### Deploy code updates

From your **local machine**:

```bash
# Upload updated files
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude 'uploads' --exclude '.env' \
  "/Users/sumitkumar/Desktop/Bright Repo/image upload/" \
  your-user@piwebtechnology.com:/var/www/image-upload/
```

Then on the **server**:

```bash
# Rebuild backend
cd /var/www/image-upload/backend
npm ci
npm run build
pm2 restart media-backend

# Rebuild frontend
cd /var/www/image-upload/frontend
npm ci
npm run build
# No restart needed - Nginx serves static files directly
```

### View logs

```bash
pm2 logs media-backend           # live logs
pm2 logs media-backend --lines 100  # last 100 lines
```

### Restart backend

```bash
pm2 restart media-backend
```

### Database backup

```bash
mariadb-dump -u mediauser -p media_storage_service > ~/backup_$(date +%Y%m%d).sql
```

### Restore database

```bash
mariadb -u mediauser -p media_storage_service < ~/backup_20260317.sql
```

### Check disk usage

```bash
du -sh /var/www/image-upload/backend/uploads/
df -h
```

---

## Troubleshooting

### Backend won't start

```bash
# Check PM2 logs
pm2 logs media-backend --lines 50

# Check if port 4000 is in use
lsof -i :4000

# Check MariaDB connection
mariadb -u mediauser -p -e "SELECT 1;"

# Check Redis
redis-cli ping
```

### Frontend shows blank page

```bash
# Verify build exists
ls /var/www/image-upload/frontend/dist/

# Check Nginx config
sudo nginx -t

# Check Nginx error log
sudo tail -20 /var/log/nginx/error.log
```

### Upload fails with 413 error

Nginx is blocking large files. Make sure `client_max_body_size 100M;` is in the Nginx config.

### API calls return CORS error

Check that the backend CORS config includes `https://piwebtechnology.com`. This is already configured in `server.ts` for production.

### Images not loading

```bash
# Check uploads directory exists and has files
ls /var/www/image-upload/backend/uploads/original/
ls /var/www/image-upload/backend/uploads/compressed/

# Check Nginx proxy for /image-upload/media/ is correct
sudo nginx -t
```

### Compression not running

```bash
# Check Redis is running
redis-cli ping

# Check PM2 backend logs for worker messages
pm2 logs media-backend | grep -i "worker\|compress\|queue"
```

---

## Quick Deploy Checklist

- [ ] Server has Node.js 20+, MariaDB, Redis, FFmpeg, Nginx, PM2
- [ ] Database `media_storage_service` created with user `mediauser`
- [ ] Project files uploaded to `/var/www/image-upload/`
- [ ] `backend/.env` has production values (copied from `.env.production`)
- [ ] `frontend/.env.production` has correct production URLs
- [ ] Backend built: `npm ci && npm run build`
- [ ] Frontend built: `npm ci && npm run build`
- [ ] Nginx configured with proxy rules for `/image-upload/`
- [ ] SSL certificate installed via Certbot
- [ ] Backend started with PM2: `pm2 start dist/server.js --name media-backend`
- [ ] `pm2 save && pm2 startup` executed
- [ ] Health check passes: `curl https://piwebtechnology.com/image-upload/api/health`
- [ ] Frontend loads at `https://piwebtechnology.com/image-upload`
- [ ] Test upload works end-to-end
