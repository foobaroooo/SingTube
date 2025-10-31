# Manual Deployment Guide for DigitalOcean

This guide provides **clear, step-by-step manual deployment** without automation scripts. Every command is explained.

---

## Prerequisites

- DigitalOcean Droplet (Ubuntu 22.04)
- SSH key configured: `~/.ssh/id_singtube`
- Domain: `singtube.app`
- Droplet IP: Your droplet IP address

---

## Part 1: Initial Server Setup (One-Time Only)

### Step 1: SSH into Your Droplet

```bash
ssh -i ~/.ssh/id_singtube root@24.144.81.34
```

### Step 2: Update System

```bash
apt update && apt upgrade -y
```

### Step 3: Remove Old Node.js (If Exists)

```bash
# Remove old Node.js packages completely
apt remove -y nodejs npm libnode-dev libnode72
apt autoremove -y
apt purge -y nodejs npm libnode-dev libnode72

# Clean up leftover files
rm -rf /usr/lib/node_modules
rm -rf /usr/include/node
```

**Why?** Old Ubuntu Node.js (v12) conflicts with modern Node.js 18.

### Step 4: Install Node.js 18

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js
apt install -y nodejs

# Verify installation
node -v    # Should show v18.x.x
npm -v     # Should show v10.x.x
```

### Step 5: Install PM2 (Process Manager)

```bash
npm install -g pm2

# Verify
pm2 -v
```

### Step 6: Install Nginx

```bash
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify
systemctl status nginx
```

### Step 7: Create Deployment Directories

```bash
# Create main directory
mkdir -p /var/www/singtube/dist
mkdir -p /var/www/singtube/server
mkdir -p /var/www/singtube/api

# Set ownership
chown -R www-data:www-data /var/www/singtube
```

### Step 8: Configure Nginx

Create Nginx configuration:

```bash
nano /etc/nginx/sites-available/singtube
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name singtube.app www.singtube.app;

    # Frontend static files
    location / {
        root /var/www/singtube/dist;
        try_files $uri $uri/ /index.html;

        # IMPORTANT: Add index directive
        index index.html;
    }

    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

**Save**: `Ctrl+X`, `Y`, `Enter`

Enable the site:

```bash
# Enable site
ln -s /etc/nginx/sites-available/singtube /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 9: Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Enable firewall
ufw --force enable

# Check status
ufw status
```

### Step 10: Configure DNS (In DigitalOcean Control Panel)

**Go to**: https://cloud.digitalocean.com/networking/domains

1. Click "Add Domain"
2. Enter: `singtube.app`
3. Add these records:

| Type | Hostname | Value | TTL |
|------|----------|-------|-----|
| A | @ | 24.144.81.34 | 3600 |
| A | www | 24.144.81.34 | 3600 |

**Wait 5-60 minutes** for DNS propagation.

Verify DNS:
```bash
# On your local machine
dig singtube.app
# Should return your droplet IP
```

### Step 11: Setup SSL Certificate

**After DNS is working:**

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d singtube.app -d www.singtube.app

# Follow prompts, Certbot will:
# - Get SSL certificate
# - Update Nginx config for HTTPS
# - Setup auto-renewal
```

**Initial setup complete!** ✅

---

## Part 2: Deploy Application Files

### Step 1: Build Locally

On your **local machine**:

```bash
cd /Users/richard/Sites/localhost/AI/claude-code/SingTube

# Build for production
npm run build:production
```

Verify build succeeded:
```bash
ls -la dist/index.html
# Should show the built file
```

### Step 2: Upload Files via SCP

```bash
# Upload dist folder (frontend)
scp -i ~/.ssh/id_singtube -r dist/* root@24.144.81.34:/var/www/singtube/dist/

# Upload server folder (Node.js backend)
scp -i ~/.ssh/id_singtube -r server root@24.144.81.34:/var/www/singtube/

# Upload api folder (database/API)
scp -i ~/.ssh/id_singtube -r api root@24.144.81.34:/var/www/singtube/

# Upload package files
scp -i ~/.ssh/id_singtube package.json package-lock.json root@24.144.81.34:/var/www/singtube/

# Upload environment file
scp -i ~/.ssh/id_singtube .env.production root@24.144.81.34:/var/www/singtube/.env
```

**Note**: Replace `24.144.81.34` with your actual IP (e.g., `24.144.81.34`)

### Step 3: SSH into Server

```bash
ssh -i ~/.ssh/id_singtube root@24.144.81.34
```

### Step 4: Install Dependencies

```bash
cd /var/www/singtube

# Install production dependencies
npm install --production
```

**This will take 1-2 minutes.**

### Step 5: Set File Permissions

```bash
# Frontend files (dist/)
chown -R www-data:www-data /var/www/singtube/dist
find /var/www/singtube/dist -type d -exec chmod 755 {} \;
find /var/www/singtube/dist -type f -exec chmod 644 {} \;

# Database directory and files
chmod 775 /var/www/singtube/api
chmod 664 /var/www/singtube/api/singtube.db*
chown -R root:www-data /var/www/singtube/api
```

**Why these permissions?**
- `755` on directories = Nginx can enter them
- `644` on files = Nginx can read them
- `664` on database = Both Node.js and Nginx can write
- `775` on api directory = Can create temp files (.db-shm, .db-wal)

### Step 6: Start Node.js Server with PM2

```bash
# Start server
pm2 start server/index.js --name singtube-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

Verify it's running:
```bash
pm2 status
pm2 logs singtube-server --lines 20
```

Should see:
```
🚀 SingTube WebSocket Server running on port 3000
```

### Step 7: Test the Site

Visit: **https://singtube.app**

Should work! ✅

---

## Part 3: Update/Redeploy (Future Updates)

When you make code changes:

### On Local Machine:

```bash
cd /Users/richard/Sites/localhost/AI/claude-code/SingTube

# 1. Build
npm run build:production

# 2. Upload new dist files
scp -i ~/.ssh/id_singtube -r dist/* root@24.144.81.34:/var/www/singtube/dist/

# 3. If you changed server code, upload that too:
scp -i ~/.ssh/id_singtube -r server root@24.144.81.34:/var/www/singtube/

# 4. If you changed api code (*** WARNING: THIS ALSO COPIES DATABASE FILES!!! ***):
scp -i ~/.ssh/id_singtube -r api root@24.144.81.34:/var/www/singtube/

# 5. If you changed dependencies (package.json):
scp -i ~/.ssh/id_singtube package.json package-lock.json root@24.144.81.34:/var/www/singtube/

# 6. If .env.production made changes
scp -i ~/.ssh/id_singtube .env.production root@24.144.81.34:/var/www/singtube/.env

```

### On Server:

```bash
# SSH in
ssh -i ~/.ssh/id_singtube root@24.144.81.34

# If dependencies changed:
cd /var/www/singtube
npm install --production

# Fix permissions (if needed)
chown -R www-data:www-data /var/www/singtube/dist

# Restart Node.js server
pm2 restart singtube-server

# Check logs
pm2 logs singtube-server --lines 20
```

**That's it!** Your updates are live.

---

## Common Issues & Solutions

### Issue 1: ERR_SSL_PROTOCOL_ERROR

**Error**: `GET https://singtube.app:3000/api/... net::ERR_SSL_PROTOCOL_ERROR`

**Cause**: `.env.production` has port number in URLs

**Fix**:
```bash
# .env.production should be:
VITE_API_BASE_URL=https://singtube.app
VITE_SOCKET_URL=https://singtube.app

# NOT:
VITE_API_BASE_URL=https://singtube.app:3000  ❌
```

Then rebuild and reupload.

---

### Issue 2: 403 Forbidden

**Error**: Nginx log shows `Permission denied`

**Fix**: Set proper permissions:
```bash
chown -R www-data:www-data /var/www/singtube/dist
chmod -R 755 /var/www/singtube/dist
```

---

### Issue 3: 500 Internal Server Error / Redirect Loop

**Error**: Page shows 500 or infinite redirects

**Causes**:
1. Missing `/var/www/singtube/dist/` folder
2. Files in wrong location

**Fix**: Ensure files are in correct structure:
```
/var/www/singtube/
  ├── dist/
  │   ├── index.html
  │   └── assets/
  ├── server/
  │   └── index.js
  └── api/
```

If you uploaded with `dist/*`, files go to:
- ✅ Correct: `/var/www/singtube/dist/index.html`
- ❌ Wrong: `/var/www/singtube/index.html`

---

### Issue 4: Database Permission Errors

**Error**: `SQLITE_CANTOPEN` or `database is locked`

**Fix**:
```bash
chmod 775 /var/www/singtube/api
chmod 664 /var/www/singtube/api/singtube.db*
chown -R root:www-data /var/www/singtube/api
```

---

### Issue 5: PM2 Won't Start (EADDRINUSE)

**Error**: `Error: listen EADDRINUSE :::3000`

**Cause**: Port 3000 already in use

**Fix**:
```bash
# Find what's using port 3000
lsof -i :3000

# If it's another PM2 process:
pm2 delete all
pm2 start server/index.js --name singtube-server
```

---

### Issue 6: DNS Not Resolving

**Error**: Certbot says "no valid A records found"

**Fix**:
1. Go to DigitalOcean → Networking → Domains
2. Add A record: `@` → `24.144.81.34`
3. Add A record: `www` → `24.144.81.34`
4. Wait 10-30 minutes
5. Test: `dig singtube.app`

---

### Issue 7: Node.js Version Conflicts

**Error**: `npm WARN EBADENGINE` during install

**Cause**: Old Node.js installed (v12)

**Fix**: Follow Step 3 & 4 in Initial Setup to remove old Node.js and install v18

---

## Useful Commands

### Check Logs

```bash
# PM2 logs
pm2 logs singtube-server
pm2 logs singtube-server --lines 50

# Nginx access log
tail -f /var/log/nginx/access.log

# Nginx error log
tail -f /var/log/nginx/error.log

### Restart Services

```bash
# Restart Node.js
pm2 restart singtube-server

# Restart Nginx
systemctl restart nginx

# Test Nginx config before restart
nginx -t
```

### Check Service Status

```bash
# PM2
pm2 status

# Nginx
systemctl status nginx

# Check what's on port 3000
lsof -i :3000
```

### Database Backup

```bash
# Backup database
cd /var/www/singtube/api
sqlite3 singtube.db ".backup singtube-backup-$(date +%Y%m%d).db"

# Download backup to local machine
scp -i ~/.ssh/id_singtube root@24.144.81.34:/var/www/singtube/api/singtube-backup-*.db ~/Desktop/
```

---

## Quick Deployment Checklist

### First Time:
- [ ] Create droplet (Ubuntu 22.04)
- [ ] Remove old Node.js
- [ ] Install Node.js 18
- [ ] Install PM2, Nginx
- [ ] Configure Nginx
- [ ] Setup DNS records
- [ ] Get SSL certificate
- [ ] Upload files via SCP
- [ ] Install npm dependencies
- [ ] Set permissions
- [ ] Start PM2

### Every Update:
- [ ] Build locally: `npm run build:production`
- [ ] Upload dist: `scp -r dist/* ...`
- [ ] SSH into server
- [ ] Set permissions if needed
- [ ] Restart PM2: `pm2 restart singtube-server`
- [ ] Check logs: `pm2 logs`

---

## Cost

- **Droplet**: $6/month (1GB RAM)
- **Domain**: ~$12/year
- **Total**: ~$84/year

---

## Support

If you encounter issues:

1. **Check PM2 logs**: `pm2 logs singtube-server`
2. **Check Nginx logs**: `tail -f /var/log/nginx/error.log`
3. **Verify DNS**: `dig singtube.app`
4. **Test locally first**: Make sure it works on `http://localhost:8080` before deploying

Common issues are documented above with solutions!
