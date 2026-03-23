# Deploy to Render.com

## Step 1 — Create a free MySQL database on Aiven

1. Go to [aiven.io](https://aiven.io) and sign up for free
2. Click **Create service** → choose **MySQL**
3. Select the free plan (Hobbyist)
4. Choose a region close to you (e.g. Europe or Middle East)
5. Click **Create service** and wait ~2 minutes
6. Once ready, click on the service and go to **Connection information**
7. Copy the **Service URI** — it looks like:
   `mysql://avnadmin:password@hostname:port/defaultdb?ssl-mode=require`

## Step 2 — Deploy to Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New +** → **Web Service**
3. Connect your GitHub repo: `akaljallaf33-cmyk/akj`
4. Fill in the settings:
   - **Name:** `wi-dash`
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Build Command:** `pnpm install && pnpm run build`
   - **Start Command:** `node dist/index.js`
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = (paste the Aiven MySQL URI from Step 1)
   - `JWT_SECRET` = (any random string, e.g. `wi-dashboard-secret-2026`)
   - `DASHBOARD_USERNAME` = `aaljallaf`
   - `DASHBOARD_PASSWORD` = `aljallaf`
   - `GUEST_USERNAME` = `guest`
   - `GUEST_PASSWORD` = `guest`
6. Click **Create Web Service**
7. Wait ~5 minutes for the first deploy

## Step 3 — Initialize the database

Once deployed, open the Render shell (or run locally with the Aiven DATABASE_URL):

```bash
DATABASE_URL="your-aiven-url" pnpm db:push
```

Then seed the existing data by running the SQL in `seed-data.sql` against your Aiven database.

## Step 4 — Connect wi-dash.com

1. In Render, go to your web service → **Settings** → **Custom Domains**
2. Click **Add Custom Domain** → enter `wi-dash.com`
3. Render will show you a CNAME record to add
4. In Namecheap (Advanced DNS for wi-dash.com):
   - Delete the existing CNAME (www → parkingpage.namecheap.com)
   - Delete the URL Redirect Record
   - Add new CNAME: Host = `www`, Target = (what Render shows you)
   - Add new CNAME: Host = `@`, Target = (what Render shows you)
5. Wait up to 24 hours for DNS to propagate

## Done!

Your team can now access `wi-dash.com` directly — no Manus login required.
