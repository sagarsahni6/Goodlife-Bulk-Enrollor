# Vercel 404 Error Troubleshooting & Fix Guide for `https://goodlife.calclabz.com`

If `https://goodlife.calclabz.com` is showing a **404: NOT_FOUND** error on Vercel, this guide explains why it happens and how to resolve it instantly.

---

## 1. Why Did the 404 Error Occur?

When your repository was upgraded to **Next.js 16 App Router**:
- Vercel's project configuration in the Vercel Dashboard was previously set to **"Other / Static HTML"** (expecting a static `index.html` file at the root).
- Since `index.html` was replaced with Next.js App Router (`src/app/page.tsx`), Vercel couldn't find `index.html` and returned a 404 error.

---

## 2. Quick Fix (2 Steps)

### Step 1: Update Framework Preset in Vercel Dashboard
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your project (e.g. `goodlife-bulk-enrollor` or `goodlife-calclabz`).
3. Go to **Settings** → **General**.
4. Scroll down to **Build & Development Settings**.
5. Change **Framework Preset** to **`Next.js`**.
6. Ensure:
   - **Build Command**: `next build` (or leave default)
   - **Output Directory**: `.next` (or leave default)
   - **Root Directory**: `./` (or leave blank)
7. Click **Save**.

### Step 2: Trigger a New Deployment
1. We have updated `vercel.json` at the root of the repository specifying `"framework": "nextjs"`.
2. Go to the **Deployments** tab in Vercel.
3. Click **Redeploy** on the latest deployment (or push a new commit to GitHub).

---

## 3. Verify Custom Domain Routing
1. In Vercel Project Settings, go to **Domains**.
2. Ensure `goodlife.calclabz.com` is attached to your project.
3. Verify DNS records:
   - **CNAME**: `goodlife` → `cname.vercel-dns.com`
4. Once deployed, visit **https://goodlife.calclabz.com/** — your site will render seamlessly!
