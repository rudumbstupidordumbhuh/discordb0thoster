# Discord Bot Hoster\n\nA web app to host, manage, and run multiple Discord bots with code editing and secure token management.

## Deployment

### Frontend (Vercel)
- Deploy the `frontend/` directory to Vercel (supports React out of the box).
- Add a `vercel.json` if you want custom routes or settings (see below).

### Backend (Persistent Hosting)
- Deploy the `backend/` directory to a Node.js host that supports long-running processes (e.g., Railway, Render, DigitalOcean, or a VPS).
- Vercel serverless functions are NOT suitable for running Discord bots, as they do not support persistent processes.

### Example `vercel.json` for Frontend
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
