# CCP Website — Setup Guide

## What's in this folder

```
ccp-website/
├── content/blog/        ← Your blog posts (Markdown files)
├── public/              ← Built site (what Cloudflare serves)
│   ├── index.html       ← PASTE YOUR EXISTING SITE HERE
│   ├── blog/            ← Generated blog pages
│   ├── admin/           ← Decap CMS editor (/admin)
│   └── sitemap.xml      ← Auto-generated sitemap
├── functions/api/       ← Cloudflare Pages function (OAuth)
│   └── auth.js
├── build.js             ← Build script (runs on each deploy)
└── package.json
```

---

## Step 1 — Add your existing site

Copy your current `index.html` into the `public/` folder.

---

## Step 2 — Push to GitHub

1. Go to github.com → New repository → name it `ccp-website` → Public → Create
2. Run these commands in Terminal (Mac) or Command Prompt (Windows):

```bash
cd ccp-website
git init
git add .
git commit -m "Initial site with blog"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ccp-website.git
git push -u origin main
```

---

## Step 3 — Connect to Cloudflare Pages

1. Go to Cloudflare Dashboard → Workers & Pages → Create
2. Choose **Pages** → Connect to Git → Select `ccp-website`
3. Build settings:
   - **Build command:** `node build.js`
   - **Build output directory:** `public`
4. Click Save and Deploy
5. Note your Pages URL (e.g. `ccp-website.pages.dev`)

---

## Step 4 — Create GitHub OAuth App

1. Go to: https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** CCP Website CMS
   - **Homepage URL:** `https://createcustomparts.com`
   - **Authorization callback URL:** `https://ccp-website.pages.dev/api/auth/callback`
     *(use your actual Pages URL)*
4. Click Register — copy the **Client ID**
5. Click **Generate a new client secret** — copy the secret

---

## Step 5 — Add Environment Variables in Cloudflare

1. Go to Cloudflare → Pages → ccp-website → Settings → Environment Variables
2. Add two variables (Production):
   - `GITHUB_CLIENT_ID` = paste your Client ID
   - `GITHUB_CLIENT_SECRET` = paste your Client Secret
3. Redeploy the site

---

## Step 6 — Update config.yml

Edit `public/admin/config.yml`:
- Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username
- Replace `YOUR_CLOUDFLARE_DOMAIN` with your actual Pages domain

Then push again:
```bash
git add .
git commit -m "Update CMS config"
git push
```

---

## Step 7 — Test the CMS

1. Go to `https://ccp-website.pages.dev/admin`
2. Click **Login with GitHub**
3. Authorize — you should see the CMS editor

---

## Writing a New Blog Post

1. Go to your site's `/admin` page
2. Click **Blog Posts** → **New Blog Post**
3. Fill in Title, Date, Description, and body text
4. Click **Publish** — Cloudflare rebuilds in ~2 minutes, post is live

---

## Connect Custom Domain

In Cloudflare Pages → Custom Domains → add `createcustomparts.com`

---

## Questions?

Text (731) 926-6167 or email through the site form.
