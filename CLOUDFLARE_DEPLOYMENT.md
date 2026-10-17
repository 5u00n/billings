# Deploying Suren Billings to Cloudflare Workers

This suite is configured for deployment to **Cloudflare Workers** with native **Static Assets** and single-page application (SPA) routing.

---

## 1. Prerequisites

1. Install Wrangler CLI (already added to `devDependencies`):
   ```bash
   npx wrangler --version
   ```
2. Log in to your Cloudflare account:
   ```bash
   npx wrangler login
   ```

---

## 2. Environment Variables Configuration

Since runtime UI configuration has been removed for production security, your Firebase credentials must be provided as environment variables during build or in your Cloudflare deployment settings:

### Required Variables:
- `VITE_FIREBASE_API_KEY`: Your Firebase project Web API Key
- `VITE_FIREBASE_AUTH_DOMAIN`: e.g. `suren-billings-app.firebaseapp.com`
- `VITE_FIREBASE_PROJECT_ID`: e.g. `suren-billings-app`
- `VITE_FIREBASE_STORAGE_BUCKET`: e.g. `suren-billings-app.firebasestorage.app`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: e.g. `1014950442669`
- `VITE_FIREBASE_APP_ID`: e.g. `1:1014950442669:web:99e5f3e3f9169bf9037824`
- `VITE_ALLOWED_EMAILS`: Authorized owner emails (e.g. `surenhembram97@gmail.com,me.ben007@gmail.com`)

### Optional Worker Variable:
- `BACKEND_URL`: URL of your hosted backend server (e.g. `https://api.yourdomain.com`). The Cloudflare Worker forwards all `/api/*` calls to this URL.

---

## 3. Deployment

Run the deploy script:
```bash
npm run deploy
```

This command:
1. Runs `vite build` to compile the frontend SPA into `./dist`.
2. Uses Wrangler to upload static assets and deploy `server/worker.ts`.
3. Sets up edge routing so all browser routes (`/dashboard`, `/invoices`, `/budget`, etc.) load the SPA properly with zero 404s.

---

## 4. Setting Secrets & Variables in Cloudflare

You can set variables via the Cloudflare Dashboard:
1. Go to **Workers & Pages** > **suren-billings** > **Settings** > **Variables and Secrets**.
2. Add `BACKEND_URL` if you have an external API server running.
