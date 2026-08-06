# Google Search Console (GSC) Setup Guide

This guide walks you through verifying ownership and submitting your website to **Google Search Console** to enable indexation, track performance for keywords like *"hero goodlife login"*, and monitor search traffic.

---

## 1. Prerequisites Checklist

Your website repository is pre-configured with:
- ✅ **Dynamic Sitemap**: Automatically generated at `/sitemap.xml` via `src/app/sitemap.ts`.
- ✅ **Robots Directives**: Configured at `/robots.txt` via `src/app/robots.ts`.
- ✅ **Web Manifest**: PWA metadata at `/manifest.webmanifest` via `src/app/manifest.ts`.
- ✅ **Structured Data (JSON-LD)**: Rich Snippet schemas embedded (`WebSite`, `SoftwareApplication`, `Organization`, `FAQPage`).
- ✅ **GSC Verification Tag Support**: Configured via `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` in `src/app/layout.tsx`.

---

## 2. Step-by-Step Google Search Console Setup

### Step 1: Add Property in Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Sign in with your Google account.
3. Click **Add Property** (top left dropdown).
4. Choose one of the property types:
   - **Domain Property** (Recommended if you own a custom domain like `example.com` via DNS verification).
   - **URL Prefix Property** (Easiest for Vercel/Netlify URLs like `https://goodlife-enrollor.vercel.app`).

---

### Step 2: Verify Site Ownership

#### Method A: HTML Tag (Recommended for Vercel / Next.js)
1. In Search Console, choose **HTML Tag** as your verification method.
2. Google will display a meta tag like:
   ```html
   <meta name="google-site-verification" content="YOUR_UNIQUE_CODE_HERE" />
   ```
3. Copy the string value inside `content="..."` (e.g. `YOUR_UNIQUE_CODE_HERE`).
4. Set the environment variable in your hosting platform (Vercel):
   - Key: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   - Value: `YOUR_UNIQUE_CODE_HERE`
5. Deploy or re-deploy the site.
6. Return to Google Search Console and click **Verify**.

#### Method B: HTML File Upload
1. In Search Console, select **HTML file** verification.
2. Download the verification file (e.g., `google1234567890abcdef.html`).
3. Place the file directly in the `website/public/` folder.
4. Deploy the site.
5. Click **Verify** in Search Console.

---

### Step 3: Submit Your Sitemap
1. Once verified, go to **Sitemaps** under the *Index* section in the left sidebar of Google Search Console.
2. Enter `sitemap.xml` under **Add a new sitemap**.
3. Click **Submit**.
4. Status should show **Success**. Googlebot will now automatically crawl all primary sections of your website.

---

### Step 4: Inspect & Request Indexing
1. Use the URL Inspection tool at the top of Search Console.
2. Enter your main site URL: `https://goodlife-enrollor.vercel.app`.
3. Click **Test Live URL**.
4. Click **Request Indexing** to prioritize instant crawl by Googlebot.

---

## 3. Environment Variables Reference

Create or update `.env.local` (or set in Vercel project settings):

```env
# Custom Domain (Defaults to https://goodlife-enrollor.vercel.app if unset)
NEXT_PUBLIC_SITE_URL=https://goodlife-enrollor.vercel.app

# Google Search Console Verification String
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_gsc_verification_code_here
```

---

## 4. Testing SEO & Rich Results

You can test your live site with Google's official developer tools:
- **Google Rich Results Test**: [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- **PageSpeed Insights**: [https://pagespeed.web.dev/](https://pagespeed.web.dev/)
