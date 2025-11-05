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

### Step 7b: Set Environment Variables (IMPORTANT - Security)

🔒 **NEVER upload `.env` files to your server!** Set environment variables directly:

```bash
# Create environment file for PM2
nano /var/www/singtube/.env
```

Paste this configuration (replace with your actual keys):

```bash
# API Keys (SERVER-SIDE ONLY - Never expose these!)
OPENAI_API_KEY=your-openai-api-key-here

# Frontend Configuration (embedded in Vite build)
VITE_API_BASE_URL=https://singtube.app
VITE_SOCKET_URL=https://singtube.app
VITE_YOUTUBE_API_KEY=your-youtube-api-key-here

# Backend Configuration
PORT=3000
NODE_ENV=production
```

**Save**: `Ctrl+X`, `Y`, `Enter`

**Set file permissions (make it readable only by root):**
```bash
chmod 600 /var/www/singtube/.env
chown root:root /var/www/singtube/.env
```

**⚠️ CRITICAL SECURITY NOTES:**
- `OPENAI_API_KEY` is **NOT** prefixed with `VITE_` - this keeps it server-side only
- Never use `VITE_OPENAI_API_KEY` - it will expose your key in the built JavaScript!
- The `.env` file should only be readable by root (chmod 600)

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

# ⚠️ DO NOT UPLOAD .env FILES! Set them manually on the server instead (see Step 7b)
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
cd /var/www/singtube

# Start server with environment file
pm2 start server/index.js --name singtube-server --env-file /var/www/singtube/.env

# Alternative: Start with environment variables directly
# pm2 start server/index.js --name singtube-server \
#   --env OPENAI_API_KEY="your-key" \
#   --env PORT=3000 \
#   --env NODE_ENV=production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

**Verify environment variables are loaded:**
```bash
pm2 env 0  # Shows environment variables for process 0
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

# 6. If environment variables changed:
# ⚠️ DO NOT UPLOAD .env FILES!
# SSH into server and edit /var/www/singtube/.env manually
# OR use PM2 env variables when restarting (see below)
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

### Issue 8: AI Recommendations Not Working

**Error**: `AI recommendations service is not configured` in browser console

**Cause**: `OPENAI_API_KEY` environment variable is not set or not loaded by the server

**Fix**:
```bash
# SSH into server
ssh -i ~/.ssh/id_singtube root@24.144.81.34

# Check if .env file exists
cat /var/www/singtube/.env

# If missing, create it:
nano /var/www/singtube/.env
# Add: OPENAI_API_KEY=your-actual-key-here

# Restart PM2 with env file
cd /var/www/singtube
pm2 restart singtube-server --update-env

# Verify env vars are loaded
pm2 env 0 | grep OPENAI
```

**⚠️ IMPORTANT**:
- Use `OPENAI_API_KEY` (NOT `VITE_OPENAI_API_KEY`)
- The key stays server-side only and never gets embedded in your JavaScript build
- If you see the key in your built files (`dist/assets/*.js`), you're using the wrong variable name!

---

### Issue 9: API Key Exposed in JavaScript Build

**Error**: Running `grep -r "sk-proj" dist/` shows your OpenAI key

**Cause**: Used `VITE_OPENAI_API_KEY` instead of `OPENAI_API_KEY`

**Fix**:
1. **IMMEDIATELY** revoke the exposed key at https://platform.openai.com/api-keys
2. Generate a new API key
3. Update server `.env` file with **`OPENAI_API_KEY`** (no VITE_ prefix)
4. Rebuild locally: `npm run build:production`
5. Verify key is NOT in build: `grep -r "sk-proj" dist/` (should return nothing)
6. Upload new build
7. Restart PM2: `pm2 restart singtube-server --update-env`

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
- [ ] **Set environment variables** (create `/var/www/singtube/.env` with `OPENAI_API_KEY`)
- [ ] Setup DNS records
- [ ] Get SSL certificate
- [ ] Upload files via SCP (DO NOT upload .env files)
- [ ] Install npm dependencies
- [ ] Set permissions
- [ ] Start PM2 with env file
- [ ] **Verify**: `grep -r "sk-proj" /var/www/singtube/dist/` returns nothing

### Every Update:
- [ ] Build locally: `npm run build:production`
- [ ] **Verify locally**: `grep -r "sk-proj" dist/` returns nothing (no exposed keys!)
- [ ] Upload dist: `scp -r dist/* ...`
- [ ] Upload server (if changed): `scp -r server ...`
- [ ] SSH into server
- [ ] Install dependencies if package.json changed: `npm install --production`
- [ ] Set permissions if needed
- [ ] Restart PM2: `pm2 restart singtube-server --update-env`
- [ ] Check logs: `pm2 logs singtube-server --lines 50`
- [ ] **Test AI features** in browser to ensure OPENAI_API_KEY is working

---

## Cost

- **Droplet**: $6/month (1GB RAM)
- **Domain**: ~$12/year
- **Total**: ~$84/year

---

## Security Best Practices

### 🔒 API Key Security

**CRITICAL - OpenAI API Key Protection:**

1. **NEVER use `VITE_OPENAI_API_KEY`** - this exposes your key in the JavaScript build
2. **ALWAYS use `OPENAI_API_KEY`** (no VITE_ prefix) - keeps it server-side only
3. **Verify before deploying**: Run `grep -r "sk-proj" dist/` - should return NOTHING
4. **Never commit .env files** to git - already in `.gitignore`
5. **Rotate keys regularly** - especially if you suspect exposure

**How the Secure Setup Works:**

```
Frontend (Browser)
  ↓ Calls /api/ai/recommendations
Backend (Node.js Server)
  ↓ Has OPENAI_API_KEY in environment
  ↓ Calls OpenAI API securely
  ↓ Returns recommendations
Frontend (Browser)
  ↓ Displays results
```

**The key NEVER reaches the browser!** ✅

### 🛡️ Additional Security Measures

```bash
# 1. Restrict .env file permissions
chmod 600 /var/www/singtube/.env
chown root:root /var/www/singtube/.env

# 2. Update CORS in server/index.js (production only)
# Change from:
#   origin: ["http://localhost:8080", "http://localhost:5173"]
# To:
#   origin: ["https://singtube.app"]

# 3. Add rate limiting for AI endpoint (optional but recommended)
# Prevents abuse and controls OpenAI costs
```

### 📊 Monitor Your Costs

1. **OpenAI Usage Dashboard**: https://platform.openai.com/usage
2. **Set spending limits** in OpenAI dashboard
3. **Monitor PM2 logs** for unusual AI request patterns:
   ```bash
   pm2 logs singtube-server | grep "ai/recommendations"
   ```

---

## Support

If you encounter issues:

1. **Check PM2 logs**: `pm2 logs singtube-server`
2. **Check Nginx logs**: `tail -f /var/log/nginx/error.log`
3. **Verify DNS**: `dig singtube.app`
4. **Test locally first**: Make sure it works on `http://localhost:8080` before deploying
5. **Security check**: Always run `grep -r "sk-proj" dist/` before uploading (should be empty!)

Common issues are documented above with solutions!
