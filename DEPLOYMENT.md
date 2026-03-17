# Media Storage Service - Deployment Guide

## Deploying to piwebtechnology.com/image-upload

This guide covers deploying the Media Storage Service to `piwebtechnology.com/image-upload`.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Option A: Docker Deployment (Recommended)](#option-a-docker-deployment-recommended)
4. [Option B: Manual Deployment](#option-b-manual-deployment)
5. [Nginx Configuration for Domain](#nginx-configuration-for-domain)
6. [SSL Certificate Setup](#ssl-certificate-setup)
7. [Environment Variables](#environment-variables)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Maintenance & Monitoring](#maintenance--monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### On the Server (VPS/Cloud)
- Ubuntu 22.04+ or CentOS 8+
- Minimum 2GB RAM, 2 vCPUs
- 50GB+ disk space (for media storage)
- Docker & Docker Compose installed
- Nginx installed (as reverse proxy)
- Domain `piwebtechnology.com` pointing to the server IP
- SSH access

### Required Software
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Nginx
sudo apt install nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

---

## Server Setup

### 1. SSH into your server
```bash
ssh user@piwebtechnology.com
```

### 2. Create project directory
```bash
sudo mkdir -p /var/www/image-upload
cd /var/www/image-upload
```

### 3. Clone or upload the project
```bash
# Option 1: Git clone
git clone YOUR_REPO_URL .

# Option 2: SCP from local machine
# Run on your LOCAL machine:
scp -r "/Users/sumitkumar/Desktop/Bright Repo/image upload/"* user@piwebtechnology.com:/var/www/image-upload/
```

---

## Option A: Docker Deployment (Recommended)

### 1. Create production environment file

```bash
cd /var/www/image-upload
cp .env.production .env
```

Edit `.env` with secure passwords:
```bash
nano .env
```

```env
NODE_ENV=production
PORT=4000

DB_HOST=mariadb
DB_PORT=3306
DB_USER=mediauser
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
DB_ROOT_PASSWORD=YOUR_SECURE_ROOT_PASSWORD
DB_NAME=media_storage_service

REDIS_HOST=redis
REDIS_PORT=6379

UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=104857600
BASE_URL=https://piwebtechnology.com/image-upload

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### 2. Build and start containers

```bash
docker compose up -d --build
```

### 3. Verify containers are running

```bash
docker compose ps
docker compose logs -f backend
```

### 4. Expected output
```
media-mariadb    running   0.0.0.0:3307->3306/tcp
media-redis      running   0.0.0.0:6380->6379/tcp
media-backend    running   0.0.0.0:4000->4000/tcp
media-frontend   running   0.0.0.0:3000->80/tcp
```

---

## Option B: Manual Deployment (Without Docker)

### 1. Install Node.js 20+
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install MariaDB
```bash
sudo apt install mariadb-server
sudo mysql_secure_installation
sudo mysql -e "CREATE DATABASE media_storage_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'mediauser'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';"
sudo mysql -e "GRANT ALL PRIVILEGES ON media_storage_service.* TO 'mediauser'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 3. Install Redis
```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

### 4. Install FFmpeg
```bash
sudo apt install ffmpeg
```

### 5. Build Backend
```bash
cd /var/www/image-upload/backend
cp .env.example .env    # edit with your values
npm ci --production
npm run build
```

### 6. Build Frontend
```bash
cd /var/www/image-upload/frontend
npm ci
npm run build
```

### 7. Setup PM2 for process management
```bash
sudo npm install -g pm2

cd /var/www/image-upload/backend
pm2 start dist/server.js --name media-backend
pm2 save
pm2 startup
```

### 8. Serve frontend with Nginx
Copy the built frontend files:
```bash
sudo cp -r /var/www/image-upload/frontend/dist/* /var/www/image-upload/public/
```

---

## Nginx Configuration for Domain

### Create Nginx site config

```bash
sudo nano /etc/nginx/sites-available/piwebtechnology
```

```nginx
server {
    listen 80;
    server_name piwebtechnology.com www.piwebtechnology.com;

    client_max_body_size 100M;

    # Main website (if you have one)
    location / {
        # Your main site config here
        root /var/www/piwebtechnology/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Media Storage Service - Frontend
    location /image-upload {
        alias /var/www/image-upload/frontend/dist;
        index index.html;
        try_files $uri $uri/ /image-upload/index.html;
    }

    # Media Storage Service - API
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

    # Media Storage Service - Public file serving
    location /image-upload/media/ {
        rewrite ^/image-upload/media/(.*) /media/$1 break;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Static assets caching
    location ~* ^/image-upload/.*\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /var/www/image-upload/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/piwebtechnology /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Using Certbot (Let's Encrypt)

```bash
sudo certbot --nginx -d piwebtechnology.com -d www.piwebtechnology.com
```

This will:
- Obtain a free SSL certificate
- Auto-configure Nginx for HTTPS
- Set up auto-renewal

### Verify auto-renewal
```bash
sudo certbot renew --dry-run
```

---

## Frontend Configuration for Subpath

Before building the frontend for production deployment at `/image-upload`, update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/image-upload/',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/media': 'http://localhost:4000',
    },
  },
})
```

And update `frontend/src/api/client.ts` to use the correct API base:

```typescript
const API_BASE = '/image-upload/api';
```

Then rebuild:
```bash
cd /var/www/image-upload/frontend
npm run build
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend port | `4000` |
| `DB_HOST` | MariaDB host | `mariadb` (Docker) / `localhost` |
| `DB_PORT` | MariaDB port | `3306` |
| `DB_USER` | Database user | `mediauser` |
| `DB_PASSWORD` | Database password | Set a strong password |
| `DB_NAME` | Database name | `media_storage_service` |
| `REDIS_HOST` | Redis host | `redis` (Docker) / `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `UPLOAD_DIR` | File upload directory | `/app/uploads` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `104857600` (100MB) |
| `BASE_URL` | Public base URL | `https://piwebtechnology.com/image-upload` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

---

## Post-Deployment Verification

### 1. Health check
```bash
curl https://piwebtechnology.com/image-upload/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Frontend loads
Open `https://piwebtechnology.com/image-upload` in a browser.

### 3. Upload test
Upload a test image and verify:
- File uploads successfully
- Compression runs
- Public URL works
- Thumbnail generates

### 4. Public URL test
```bash
curl -I https://piwebtechnology.com/image-upload/media/test-company/test-image.jpg
# Expected: HTTP/2 200 with Content-Type: image/jpeg
```

---

## Maintenance & Monitoring

### View logs
```bash
# Docker
docker compose logs -f backend
docker compose logs -f --tail=100 backend

# PM2
pm2 logs media-backend
```

### Restart services
```bash
# Docker
docker compose restart backend
docker compose restart

# PM2
pm2 restart media-backend
```

### Database backup
```bash
# Docker
docker exec media-mariadb mariadb-dump -u root -p media_storage_service > backup_$(date +%Y%m%d).sql

# Manual
mariadb-dump -u mediauser -p media_storage_service > backup_$(date +%Y%m%d).sql
```

### Update deployment
```bash
cd /var/www/image-upload
git pull origin main
docker compose down
docker compose up -d --build
```

### Disk space monitoring
```bash
du -sh /var/www/image-upload/backend/uploads/
df -h
```

---

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose logs backend
# Check if MariaDB is ready
docker compose exec mariadb mariadb -u mediauser -p -e "SHOW DATABASES;"
# Check if Redis is running
docker compose exec redis redis-cli ping
```

### Upload fails with 413 error
Nginx is blocking large files. Increase `client_max_body_size`:
```nginx
client_max_body_size 100M;
```

### Images not rendering at public URL
Check Nginx proxy rules and backend CORS configuration.

### Compression not running
Check if Redis is running and BullMQ workers are active:
```bash
docker compose logs backend | grep "worker"
docker compose exec redis redis-cli keys "bull:*"
```

### Database connection refused
```bash
# Check MariaDB is healthy
docker compose ps mariadb
# Check credentials
docker compose exec mariadb mariadb -u mediauser -pmediapass123 -e "SELECT 1;"
```

---

## Architecture Overview

```
piwebtechnology.com
        |
    [Nginx] (:80/:443)
        |
   /image-upload/
        |
    ┌───┴───┐
    |       |
  /api/   /media/
    |       |
[Backend] [Static Files]
  :4000
    |
  ┌─┴─┐
  |   |
[MariaDB] [Redis + BullMQ]
  :3306     :6379
```

---

## Quick Deploy Checklist

- [ ] Server provisioned with 2+ GB RAM
- [ ] Docker & Docker Compose installed
- [ ] Project files uploaded to `/var/www/image-upload/`
- [ ] `.env` file created with secure passwords
- [ ] `docker compose up -d --build` executed
- [ ] All 4 containers running and healthy
- [ ] Nginx configured with proxy rules
- [ ] SSL certificate installed
- [ ] Frontend loads at `https://piwebtechnology.com/image-upload`
- [ ] API health check passes
- [ ] Test upload completes successfully
- [ ] Public URLs render images in browser
- [ ] Database backup cron job configured
