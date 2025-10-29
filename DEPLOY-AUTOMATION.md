# Automated Deployment Guide

This guide provides **3 automated deployment options** from easiest to most advanced.

---

## Option 1: One-Command Script (Recommended ⭐)

### Initial Setup (Run Once)

**1. Create DigitalOcean Droplet:**
- Go to https://cloud.digitalocean.com/droplets/new
- Choose Ubuntu 22.04, $6/month plan
- Add your SSH key
- Create droplet

**2. Run Server Setup Script:**
```bash
# From your local machine
ssh -i ~/.ssh/id_singtube root@24.144.81.34 'bash -s' < setup-server.sh
```

This single command installs everything: Node.js, Nginx, PM2, SSL tools, firewall.

**3. Configure Deployment:**
```bash
# Copy and edit deployment config
cp .env.deploy.example .env.deploy
nano .env.deploy

# Fill in:
# SERVER_IP=your_droplet_ip
# DOMAIN=yourdomain.com
```

**4. Setup SSL (after DNS is pointing to your server):**
```bash
ssh root@your_droplet_ip
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Deploy Your App (Every Time You Update)

```bash
./deploy.sh
```

That's it! This single command:
- ✅ Builds your app
- ✅ Uploads to server
- ✅ Installs dependencies
- ✅ Restarts services
- ✅ Zero downtime

**Time**: ~2 minutes per deployment

---

## Option 2: GitHub Actions CI/CD (Auto-Deploy on Push)

### Setup (One Time)

**1. Add GitHub Secrets:**

Go to your repo → Settings → Secrets → Actions:
- `DROPLET_IP`: Your server IP
- `DROPLET_SSH_KEY`: Your private SSH key
- `YOUTUBE_API_KEY`: Your API key

**2. Create Workflow File:**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install and Build
      run: |
        npm install
        npm run build

    - name: Deploy to Server
      uses: appleboy/scp-action@master
      with:
        host: ${{ secrets.DROPLET_IP }}
        username: root
        key: ${{ secrets.DROPLET_SSH_KEY }}
        source: "dist/,server/,api/,package*.json"
        target: "/var/www/singtube"

    - name: Restart Services
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.DROPLET_IP }}
        username: root
        key: ${{ secrets.DROPLET_SSH_KEY }}
        script: |
          cd /var/www/singtube
          npm install --production
          pm2 restart singtube-socket || pm2 start server/index.js --name singtube-socket
          pm2 save
```

**3. Push to GitHub:**

```bash
git add .
git commit -m "Add CI/CD"
git push origin main
```

Now every `git push` **automatically deploys** to your server!

---

## Option 3: DigitalOcean App Platform (Zero DevOps)

**Easiest but costs $12/month instead of $6/month**

### Setup:

1. **Push to GitHub:**
```bash
git push origin main
```

2. **Create App:**
   - Go to https://cloud.digitalocean.com/apps
   - Click "Create App"
   - Connect your GitHub repo
   - DigitalOcean auto-detects Node.js

3. **Configure:**
   - Build: `npm run build`
   - Run: `node server/index.js`
   - Add environment variables
   - Deploy!

**Benefits:**
- ✅ Auto-deploy on git push
- ✅ Auto SSL/HTTPS
- ✅ Auto-scaling
- ✅ Built-in monitoring
- ✅ Zero server management

---

## Comparison

| Feature | Script | GitHub Actions | App Platform |
|---------|--------|---------------|--------------|
| **Cost** | $6/month | $6/month | $12/month |
| **Setup Time** | 10 min | 15 min | 5 min |
| **Deploy Time** | 2 min | Auto | Auto |
| **DevOps Skills** | Basic SSH | Git | None |
| **Control** | Full | Full | Limited |
| **Scaling** | Manual | Manual | Auto |

---

## Recommended Choice

- **Hobby/Side Project**: Use **Script** (cheapest, simple)
- **Team Project**: Use **GitHub Actions** (CI/CD, automatic)
- **Non-Technical**: Use **App Platform** (zero DevOps)

---

## Troubleshooting

**Deploy script fails:**
```bash
# Check SSH connection
ssh root@your_droplet_ip

# Check PM2 status
pm2 status
pm2 logs singtube-socket
```

**Site not loading:**
```bash
# Check Nginx
ssh root@your_droplet_ip
sudo nginx -t
sudo systemctl status nginx

# Check if app is running
pm2 status
```

**Need to rollback:**
```bash
# SSH into server
ssh root@your_droplet_ip

# Restart to previous version
pm2 restart singtube-socket
```

---

## Additional Features

### Add Monitoring:
```bash
# On server
pm2 install pm2-logrotate  # Auto-rotate logs
pm2 set pm2-logrotate:max_size 10M
```

### Add Auto-Restart on Crash:
PM2 already does this! If your app crashes, PM2 restarts it automatically.

### View Logs Remotely:
```bash
ssh root@your_droplet_ip "pm2 logs singtube-socket --lines 50"
```
