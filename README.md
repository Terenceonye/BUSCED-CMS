# BUSCED CMS

Content management system for news, events, galleries and academic records.

An Express + MongoDB API with a React dashboard. One process serves both: the
JSON API under `/api`, and the compiled dashboard for every other route.

## Stack

- **Server** — Node/Express 5, Mongoose, JWT auth, Multer uploads
- **Client** — React 18 + TypeScript, Vite, Tailwind, shadcn/ui (Radix), Recharts

## Quick start

```bash
npm install
npm run build     # installs client deps and compiles the dashboard
npm start         # http://localhost:3000
```

Requires a `.env` with at least `MONGO_URI`, `JWT_SECRET` and `SESSION_SECRET`.
See [DEPLOYMENT.md](DEPLOYMENT.md) for the full list.

On an empty database the server seeds a default admin account and prints the
credentials to the console — **change that password immediately**.

## Development

```bash
npm run dev          # Express on :3000 (nodemon)
npm run client:dev   # Vite dev server on :5173 with hot reload
```

Work against **http://localhost:5173**; Vite proxies the API to :3000.

## Layout

```
server.js            Express app, static serving, SPA fallback
routes/              API route modules
controllers/         request handlers
models/              Mongoose schemas
middlewares/         auth, validation, settings loader
config/              db connection and Multer upload configs
client/              React dashboard source
public/app/          compiled dashboard (build artifact, gitignored)
public/branding/     default logo and favicon
public/uploads/      uploaded images
uploadedNewsImages/  uploaded news images
```

## Scripts

| Script | Does |
|---|---|
| `npm start` | run the server |
| `npm run dev` | run the server with nodemon |
| `npm run build` | install client deps and build the dashboard |
| `npm run client:dev` | Vite dev server with hot reload |
| `npm run client:build` | build the dashboard only |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).
# BUSCED-CMS
