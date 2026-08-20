# Deploying BUSCED CMS

The project is a single Node/Express service. It exposes the JSON API **and**
serves the compiled React dashboard from `public/app`, so there is only one
process and one port to deploy.

```
Express (server.js)
├── /api/**            JSON API
├── /uploads/**        uploaded gallery, hero and branding images
├── /uploadedNewsImages/**  uploaded news images
├── /branding/**       default logo + favicon
└── /*                 React dashboard (public/app/index.html)
```

---

## 1. Requirements

| | |
|---|---|
| Node.js | 20 or newer (developed on 22) |
| MongoDB | any reachable instance (Atlas or self-hosted) |
| Disk | persistent storage for uploads (see §5) |

---

## 2. Environment variables

Create `.env` in the project root. **`.env` is gitignored — set these on the
server itself.**

### Required

| Variable | Notes |
|---|---|
| `MONGO_URI` | e.g. `mongodb://user:pass@host:27017/BUSCED-CMS?authSource=admin` |
| `JWT_SECRET` | long random string; signs the login tokens |
| `SESSION_SECRET` | long random string; **defaults to an insecure value if unset** |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Recommended

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | port Express binds to |
| `JWT_EXPIRES_IN` | – | e.g. `15d` |
| `UPLOAD_PATH` | `uploads/` | extra static mount for `/uploads` |
| `CORS_ORIGINS` | – | comma-separated origins allowed to call the API cross-site. Unset allows any origin. The dashboard is same-origin and never needs this |

### Email (password reset OTP)

`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`,
`EMAIL_RECEIVER`

Without these, sign-in still works but **password reset emails will fail**.

### Optional integrations

`GEMINI_API_KEY`, `HUGGINGFACE_API_KEY` (AI chat), `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN` (SMS). Unset simply disables those features.

---

## 3. Build and run

`public/app` is a build artifact that **is committed**, so a host only needs to
install server dependencies and start. Rebuild it locally whenever anything in
`client/src` changes, or the deployed dashboard silently stays stale.

```bash
git clone <repo> && cd "BUSCED CMS"

npm install        # server dependencies
npm run build      # installs client deps and compiles React -> public/app
npm start          # serves API + dashboard on $PORT
```

`npm run build` runs `cd client && npm install` then `cd client && npm run build`.
The client's build tools are devDependencies, so do **not** use
`npm ci --omit=dev` inside `client/` — the build needs them.

Verify:

```bash
curl -s localhost:3000/healthz          # {"status":"OK",...}
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/   # 200 (dashboard)
```

---

## 4. Keep it running

### pm2

```bash
npm i -g pm2
pm2 start server.js --name busced-cms
pm2 save && pm2 startup
```

### systemd

```ini
# /etc/systemd/system/busced-cms.service
[Unit]
Description=BUSCED CMS
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/busced-cms
EnvironmentFile=/var/www/busced-cms/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now busced-cms
```

---

## 5. Persistent uploads (important)

Uploaded files are written to disk, not to the database:

- `public/uploads/galleryImages/` — gallery and hero images
- `public/uploads/settingsImages/` — uploaded logos/favicons
- `public/uploads/programImages/`, `public/uploads/profileImages/`
- `uploadedNewsImages/` — news article images

On any platform with an **ephemeral filesystem** (Heroku, Railway, Render free
tier, most container setups) these are lost on every restart or redeploy.
Either mount a persistent volume at those paths, or move uploads to object
storage (S3/Cloudinary) before going live there. A normal VPS needs nothing
special — just do not wipe the directories on deploy.

---

## 6. Reverse proxy and HTTPS

Run Express behind nginx and terminate TLS there.

```nginx
server {
    server_name cms.example.com;

    # Uploads are capped at 700KB, but leave headroom for multipart overhead.
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then `sudo certbot --nginx -d cms.example.com`.

If you terminate TLS upstream, add `app.set("trust proxy", 1)` in `server.js`
so Express sees the real protocol and client IP.

---

## 7. Before you go live

- [ ] **Change the seeded admin password.** On an empty database the server
      creates `onyeweketerence@gmail.com` with a known default password
      (see `config/db.js`). Sign in and use **Change Password**, or remove the
      seeding once a real admin exists.
- [ ] Set `JWT_SECRET` and `SESSION_SECRET` to fresh random values.
- [ ] Confirm `.env` is not committed.
- [ ] Restrict MongoDB network access to the app server.
- [ ] Tighten CORS — set `CORS_ORIGINS` to the public site(s) that call the API,
      e.g. `CORS_ORIGINS=https://busced.edu.ng,https://www.busced.edu.ng`.
      Left unset, `server.js` reflects any origin.
- [ ] Take a database backup schedule.

---

## 8. Redeploying

```bash
git pull
npm install          # only if server deps changed
npm run build        # always - regenerates public/app
pm2 restart busced-cms
```

---

## 9. Local development

Two processes, with hot reload on the frontend:

```bash
npm run dev          # Express + nodemon on :3000
npm run client:dev   # Vite dev server on :5173
```

Open **http://localhost:5173**. Vite proxies `/api`, `/uploads`,
`/uploadedNewsImages` and `/branding` to :3000, so the API works normally.

Changes to `client/vite.config.ts` require restarting the Vite dev server.
For a production-like check, run `npm run build && npm start` and use :3000.
