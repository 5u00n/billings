# Deploying Suren Billings & Expense Suite to Cloudflare Workers with Cloudflare D1

This application is fully equipped with:
1. **Cloudflare D1 (Serverless SQLite)**: Native edge SQLite database hosting all 14 tables and statutory compliance records.
2. **Cloudflare Worker Edge Router**: Directly executes SQLite queries via `env.DB` with zero external backend dependency.
3. **Dynamic Runtime Variables**: Variables added in the Cloudflare Dashboard are automatically injected at runtime into the browser without needing to rebuild or re-bundle the frontend.
4. **Static Assets with SPA Routing**: Seamless routing across all pages (`/dashboard`, `/invoices`, `/budget`, `/tax`, etc.) with zero 404s.

---

## 1. Prerequisites

1. Login to your Cloudflare account with Wrangler:
   ```bash
   npx wrangler login
   ```

---

## 2. Create Your Cloudflare D1 (SQLite) Database

Run this command once to provision your serverless SQLite database on Cloudflare:
```bash
npx wrangler d1 create billings-db
```

Wrangler will output something like:
```jsonc
[[d1_databases]]
binding = "DB"
database_name = "billings-db"
database_id = "xxxx-xxxx-xxxx-xxxx"
```

Copy the generated `database_id` into your [wrangler.jsonc](file:///Users/suren/git-projects/billings-and-expences/wrangler.jsonc):
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "billings-db",
    "database_id": "xxxx-xxxx-xxxx-xxxx"
  }
]
```

---

## 3. Initialize the Remote SQLite Schema

Apply all 14 tables, indexes, and statutory tax reminders to your remote Cloudflare D1 database:
```bash
npx wrangler d1 execute billings-db --file=./schema.sql --remote
```

*(For local testing with `npx wrangler dev`, use `--local` instead of `--remote`)*

---

## 4. Environment Variables in Cloudflare Dashboard

Because the Worker dynamically injects `window.__ENV__` into `index.html` at runtime, any variable configured in your Cloudflare Workers Dashboard is immediately active!

In **Cloudflare Dashboard** > **Workers & Pages** > **suren-billings** > **Settings** > **Variables and Secrets**, add:

| Variable Name | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `suren-billings-app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `suren-billings-app` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `suren-billings-app.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `1014950442669` |
| `VITE_FIREBASE_APP_ID` | `1:1014950442669:web:99e5f3e3f9169bf9037824` |
| `VITE_ALLOWED_EMAILS` | `surenhembram97@gmail.com,me.ben007@gmail.com` |

---

## 5. Deploy

Run the deployment script:
```bash
npm run deploy
```

This will:
1. Build the frontend into `./dist` (`vite build`).
2. Upload the static assets and deploy the edge Worker with Cloudflare D1 database binding.
