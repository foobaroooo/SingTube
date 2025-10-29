# Deployment Guide

This guide covers deploying SingTube to a production server.

## Requirements

### Server Requirements
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Operating System**: Linux (Ubuntu/Debian recommended), macOS, or Windows Server
- **RAM**: Minimum 512MB, recommended 1GB+
- **Storage**: Minimum 1GB free space
- **Ports**:
  - Port 80 (HTTP) or 443 (HTTPS) for frontend
  - Port 3000 (or custom) for WebSocket server
  - Both ports must be accessible from the internet

### Domain Setup (Recommended)
- Domain name pointing to your server IP
- SSL certificate (Let's Encrypt recommended for free HTTPS)

---

## Deployment Steps

### 1. Prepare Production Environment Variables

Create a `.env.production` file:

```bash
# Frontend (Vite)
VITE_API_BASE_URL=https://your-domain.com
VITE_SOCKET_URL=https://your-domain.com
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# Backend (Node.js)
PORT=3000
NODE_ENV=production
```

**Important**:
- Replace `your-domain.com` with your actual domain
- Get a YouTube API key from [Google Cloud Console](https://console.cloud.google.com/)
- For WebSocket over HTTPS, use `wss://` protocol (handled by Socket.io automatically)

---

### 2. Build the Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with optimized static files.

---

### 3. Deployment Options

## Option A: Single Server Deployment (Recommended for Small to Medium Traffic)

Deploy both frontend and backend on the same server using Nginx as reverse proxy.

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx

Create `/etc/nginx/sites-available/singtube`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /var/www/singtube/dist;
        try_files $uri $uri/ /index.html;
    }

    # WebSocket and API proxy
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

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/singtube /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Deploy Files

```bash
# Copy built frontend to web root
# Replace 'cp' with 
# scp -i ~/.ssh/id_singtube -r dist/* root@24.144.81.34:/var/www/singtube/
sudo mkdir -p /var/www/singtube
sudo cp -r dist/* /var/www/singtube/

# Copy backend files
sudo mkdir -p /opt/singtube
sudo cp -r server/ /opt/singtube/
sudo cp -r api/ /opt/singtube/
sudo cp package*.json /opt/singtube/
sudo cp .env.production /opt/singtube/.env

# Install production dependencies
cd /opt/singtube
sudo npm install --production
```

### Run WebSocket Server with PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the server
cd /opt/singtube
pm2 start server/index.js --name singtube-server

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Add SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

---

## Option B: Separate Servers (Recommended for High Traffic)

Deploy frontend and backend on different servers for better scalability.

### Frontend Server (Static Hosting)
- Deploy `dist/` folder to any static hosting:
  - **Netlify**: Free, automatic SSL
  - **Vercel**: Free, automatic SSL
  - **AWS S3 + CloudFront**
  - **DigitalOcean App Platform**

### Backend Server (Node.js)
- Deploy WebSocket server to:
  - **DigitalOcean Droplet** ($6/month)
  - **AWS EC2**
  - **Heroku** (with WebSocket support)
  - **Railway.app**

Update frontend `.env.production`:
```bash
VITE_API_BASE_URL=https://api.your-domain.com
VITE_SOCKET_URL=https://api.your-domain.com
```

---

## Option C: Platform-as-a-Service (Easiest)

### Railway.app (Recommended for Beginners)

1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Railway auto-detects Node.js and deploys both frontend and backend
4. Set environment variables in Railway dashboard
5. Get automatic HTTPS domain

### Render.com

1. Create two services:
   - **Web Service** (Frontend): Build command: `npm run build`, Start: `npx serve -s dist`
   - **Web Service** (Backend): Start command: `npm run server`
2. Set environment variables
3. Get automatic HTTPS

---

## 4. Database Considerations

### SQLite in Production

The app uses SQLite with WAL mode, which is suitable for:
- **Small to medium traffic** (up to 100 concurrent users)
- **Single server deployments**

**Important**:
- Ensure database file has write permissions
- Regular backups recommended

```bash
# Backup database
sqlite3 api/singtube.db ".backup backup-$(date +%Y%m%d).db"

# Setup daily backup cron job
crontab -e
# Add: 0 2 * * * cd /opt/singtube && sqlite3 api/singtube.db ".backup /backup/singtube-$(date +\%Y\%m\%d).db"
```

### Upgrade to PostgreSQL/MySQL (For High Traffic)

For production with heavy traffic, consider migrating to PostgreSQL:

1. Install database driver:
```bash
npm install pg
```

2. Update `server/index.js` to use PostgreSQL instead of SQLite
3. Benefits:
   - Better concurrent access
   - Horizontal scaling
   - Cloud database options (AWS RDS, DigitalOcean Managed DB)

---

## 5. Environment-Specific Configuration

### Update Frontend Build

In `src/services/apiService.ts`, the base URL is determined by environment:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
```

### Update Socket.io Client

In `src/services/socketService.ts`:

```typescript
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
```

---

## 6. Monitoring and Maintenance

### PM2 Monitoring

```bash
# View logs
pm2 logs singtube-server

# Monitor resources
pm2 monit

# Restart server
pm2 restart singtube-server

# Stop server
pm2 stop singtube-server
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Check WebSocket Connections

```bash
# View active connections
pm2 logs singtube-server | grep "Client connected"
```

---

## 7. Performance Optimization

### Enable Gzip Compression

Add to Nginx config:

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Cache Static Assets

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Increase WebSocket Limits

In `server/index.js`, add after creating `io`:

```javascript
io.engine.on("connection_error", (err) => {
  console.error("WebSocket connection error:", err);
});

// Increase max connections
httpServer.maxConnections = 1000;
```

---

## 8. Security Considerations

### CORS Configuration

Update `server/index.js`:

```javascript
const io = new Server(httpServer, {
  cors: {
    origin: ["https://your-domain.com"],
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### Environment Variables

Never commit `.env` files to git. Use server environment variables.

### Firewall Rules

```bash
# Ubuntu UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # If not behind Nginx
sudo ufw enable
```

---

## 9. Scaling Considerations

### Load Balancing (For High Traffic)

Use Nginx load balancer with multiple WebSocket servers:

```nginx
upstream websocket_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

location /socket.io/ {
    proxy_pass http://websocket_backend;
    # ... rest of proxy config
}
```

### Redis Adapter (For Multiple Servers)

Install Redis adapter for Socket.io:

```bash
npm install @socket.io/redis-adapter redis
```

Update `server/index.js`:

```javascript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

---

## 10. Quick Deployment Checklist

- [ ] Node.js v18+ installed
- [ ] `.env.production` configured
- [ ] YouTube API key obtained
- [ ] Frontend built (`npm run build`)
- [ ] Backend dependencies installed (`npm install --production`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed (HTTPS)
- [ ] PM2 process manager running server
- [ ] Database backup configured
- [ ] Firewall rules configured
- [ ] Domain DNS pointing to server
- [ ] WebSocket connection tested

---

## Troubleshooting

### WebSocket Connection Failed

1. Check if server is running: `pm2 status`
2. Check Nginx WebSocket proxy config
3. Verify firewall allows port 3000 (or 443 for HTTPS)
4. Check browser console for CORS errors
5. Ensure SSL certificate is valid for WebSocket (wss://)

### Songs Not Syncing

1. Check server logs: `pm2 logs singtube-server`
2. Verify WebSocket connection in browser console
3. Check database permissions
4. Verify room GUID matches between clients

### Server Crashes

1. Check PM2 logs: `pm2 logs --err`
2. Increase PM2 memory limit: `pm2 start server/index.js --max-memory-restart 500M`
3. Monitor with: `pm2 monit`

---

## Support

For deployment issues:
- Check server logs
- Verify all environment variables
- Test locally first with production build
- Ensure all ports are accessible

For production support, consider:
- Managed hosting platforms (Railway, Render)
- DevOps consultation
- Server monitoring tools (New Relic, Datadog)
