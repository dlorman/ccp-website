#!/usr/bin/env node
/**
 * CCP Blog Build Script
 * Reads markdown posts from content/blog/, generates:
 *   - public/blog/[slug]/index.html  (each post)
 *   - public/blog/index.html          (blog listing)
 *   - public/sitemap.xml
 * Run: node build.js
 */

const fs = require('fs');
const path = require('path');

// ── Minimal front-matter parser ──────────────────────────────────────────────
function parseFrontMatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(': ');
    if (!key) return;
    let val = rest.join(': ').trim().replace(/^"(.*)"$/, '$1');
    if (val.startsWith('[')) {
      try { val = JSON.parse(val.replace(/'/g, '"')); } catch (e) { val = []; }
    }
    meta[key.trim()] = val;
  });
  return { meta, body: match[2] };
}

// ── Minimal Markdown→HTML converter ─────────────────────────────────────────
function mdToHtml(md) {
  let html = md
    // Tables
    .replace(/^\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)*)/gm, (_, header, rows) => {
      const th = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const tr = rows.trim().split('\n').map(row => {
        const tds = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
    })
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Unordered lists
    .replace(/^(- .+\n?)+/gm, match => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^- /, '').trim()}</li>`).join('');
      return `<ul>${items}</ul>`;
    })
    // Paragraphs
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Clean up
    .replace(/<\/p>\n<p>/g, '</p><p>')
    .replace(/\n{2,}/g, '\n');
  return html;
}

// ── Shared nav/footer — edit /components/site-chrome.js to update all pages ──
const NAV = `<div id="site-nav"></div>\n<script src="/components/site-chrome.js"></script>`;

const BASE_CSS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap">
<style>
:root{--accent:#e85d26;--accent-dark:#c94d18;--bg:#f0f2f7;--bg2:#fff;--bg-dark:#0f1117;--fg:#111520;--fg-muted:#5a6278;--steel:#b0bcd4;--divider:#d8dce8;--divider-dark:#2a2e3f}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Barlow',Arial,sans-serif;font-size:16px;line-height:1.6;background:var(--bg);color:var(--fg)}
img{max-width:100%;display:block}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
nav{position:fixed;top:0;left:0;right:0;background:rgba(15,17,23,.96);backdrop-filter:blur(8px);z-index:100;border-bottom:1px solid var(--divider-dark)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 16px;display:flex;align-items:center;justify-content:space-between;height:60px}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.nav-logo-hex{width:36px;height:36px;flex-shrink:0}
.nav-logo-text{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:17px;letter-spacing:1px;color:#e8eaf0;line-height:1.15}
.nav-logo-text span{display:block;font-weight:600;font-size:11px;letter-spacing:3px;color:#e85d26}
.nav-links{display:flex;gap:28px;list-style:none}
.nav-links a{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#b0bcd4;text-decoration:none;transition:color .2s}
.nav-links a:hover{color:#e85d26}
.nav-cta{background:#e85d26;color:#fff!important;padding:8px 18px;border-radius:2px;font-weight:700!important}
.nav-cta:hover{background:#c94d18;text-decoration:none!important}
footer{background:#070a10;border-top:1px solid #1a1d27;padding:28px 16px}
.footer-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
.footer-copy{font-size:13px;color:#5a6278}
.footer-links{display:flex;gap:20px}
.footer-links a{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#5a6278;text-decoration:none}
.footer-links a:hover{color:#e85d26}
@media(max-width:768px){.nav-links{display:none}}
</style>`;

const FOOTER = `<div id="site-footer"></div>`;

// ── Build ────────────────────────────────────────────────────────────────────
const contentDir = path.join(__dirname, 'content/blog');
const publicDir  = path.join(__dirname, 'public');
const blogDir    = path.join(publicDir, 'blog');
const siteUrl    = 'https://createcustomparts.com';

if (!fs.existsSync(blogDir)) fs.mkdirSync(blogDir, { recursive: true });

const files = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
const posts = [];

files.forEach(file => {
  const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const slug = meta.slug || file.replace('.md', '');
  const bodyHtml = mdToHtml(body);
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const dateStr = meta.date || '';
  const displayDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  posts.push({ ...meta, slug, bodyHtml, tags, displayDate, file });

  // ── Individual post page ──
  const postDir = path.join(blogDir, slug);
  if (!fs.existsSync(postDir)) fs.mkdirSync(postDir, { recursive: true });

  const postHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.title} | Create Custom Parts Co.</title>
<meta name="description" content="${meta.description || ''}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${siteUrl}/blog/${slug}/">
<meta property="og:title" content="${meta.title}">
<meta property="og:description" content="${meta.description || ''}">
<meta property="og:type" content="article">
<meta property="og:url" content="${siteUrl}/blog/${slug}/">
<meta property="og:site_name" content="Create Custom Parts Co.">
<script type="application/ld+json">
{
  "@context":"https://schema.org",
  "@type":"Article",
  "headline":"${meta.title}",
  "description":"${meta.description || ''}",
  "datePublished":"${dateStr}",
  "author":{"@type":"Organization","name":"Create Custom Parts Co.","url":"${siteUrl}"},
  "publisher":{"@type":"Organization","name":"Create Custom Parts Co.","logo":{"@type":"ImageObject","url":"${siteUrl}/images/logo.png"}},
  "url":"${siteUrl}/blog/${slug}/",
  "mainEntityOfPage":"${siteUrl}/blog/${slug}/"
}
</script>
${BASE_CSS}
<style>
.post-wrap{max-width:760px;margin:0 auto;padding:100px 20px 80px}
.post-breadcrumb{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--fg-muted,#5a6278);margin-bottom:20px}
.post-breadcrumb a{color:var(--accent)}
.post-date{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.post-title{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:clamp(28px,5vw,46px);line-height:1.05;letter-spacing:.5px;color:var(--fg);margin-bottom:32px}
.post-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:40px}
.post-tag{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;background:var(--bg2);border:1px solid var(--divider);color:var(--fg-muted,#5a6278);padding:4px 10px;border-radius:2px}
.post-body{color:var(--fg)}
.post-body h2{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:clamp(22px,3vw,32px);letter-spacing:.5px;margin:48px 0 16px;color:var(--fg)}
.post-body h3{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:700;font-size:clamp(18px,2.5vw,24px);letter-spacing:.3px;margin:32px 0 12px;color:var(--fg)}
.post-body p{margin-bottom:20px;line-height:1.75}
.post-body ul{margin:0 0 20px 24px;line-height:1.75}
.post-body li{margin-bottom:8px}
.post-body strong{color:var(--fg)}
.post-body table{width:100%;border-collapse:collapse;margin:24px 0}
.post-body th{background:var(--bg-dark);color:#e8eaf0;font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:600;font-size:13px;letter-spacing:.1em;text-transform:uppercase;padding:10px 14px;text-align:left;border:1px solid var(--divider-dark,#2a2e3f)}
.post-body td{padding:10px 14px;border:1px solid var(--divider);font-size:14px}
.post-body tr:nth-child(even) td{background:var(--bg2)}
.post-cta{background:var(--bg-dark,#0f1117);border-radius:4px;padding:40px;margin:48px 0 0;text-align:center}
.post-cta h3{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:28px;color:#e8eaf0;margin-bottom:12px}
.post-cta p{color:#8891a8;margin-bottom:24px}
.btn-primary{display:inline-block;background:#e85d26;color:#fff;font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:700;font-size:15px;letter-spacing:.1em;text-transform:uppercase;padding:14px 28px;border-radius:2px;text-decoration:none}
.btn-primary:hover{background:#c94d18;text-decoration:none;color:#fff}
</style>
</head>
<body>
${NAV}
<div class="post-wrap">
  <p class="post-breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/blog/">Blog</a> &rsaquo; ${meta.title}</p>
  ${displayDate ? `<p class="post-date">${displayDate}</p>` : ''}
  <h1 class="post-title">${meta.title}</h1>
  ${tags.length ? `<div class="post-tags">${tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>` : ''}
  <div class="post-body">${bodyHtml}</div>
  <div class="post-cta">
    <h3>Ready to Get Your Part Printed?</h3>
    <p>Text us a photo or fill out our quick quote form — we'll get back to you fast.</p>
    <a href="/#contact" class="btn-primary">Get a Free Quote →</a>
  </div>
</div>
${FOOTER}
</body>
</html>`;

  fs.writeFileSync(path.join(postDir, 'index.html'), postHtml);
  console.log(`✓ /blog/${slug}/`);
});

// Sort posts newest first
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// ── Blog listing page ────────────────────────────────────────────────────────
const postCards = posts.map(p => `
  <article class="post-card">
    <a href="/blog/${p.slug}/" class="post-card-link">
      <div class="post-card-meta">
        <span class="post-card-date">${p.displayDate}</span>
        ${p.tags && p.tags[0] ? `<span class="post-card-tag">${p.tags[0]}</span>` : ''}
      </div>
      <h2 class="post-card-title">${p.title}</h2>
      <p class="post-card-desc">${p.description || ''}</p>
      <span class="post-card-read">Read Article →</span>
    </a>
  </article>`).join('');

const blogIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog — 3D Printing Tips & Local Resources | Create Custom Parts Co.</title>
<meta name="description" content="Tips, guides, and local resources from Create Custom Parts Co. in Savannah, TN — your source for custom 3D printed parts in Hardin County and West Tennessee.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${siteUrl}/blog/">
<meta property="og:title" content="Blog | Create Custom Parts Co.">
<meta property="og:type" content="website">
<meta property="og:url" content="${siteUrl}/blog/">
<meta property="og:site_name" content="Create Custom Parts Co.">
${BASE_CSS}
<style>
.blog-wrap{max-width:900px;margin:0 auto;padding:100px 20px 80px}
.blog-eyebrow{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#e85d26;margin-bottom:12px}
.blog-title{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:clamp(32px,5vw,52px);line-height:1.05;letter-spacing:.5px;margin-bottom:12px}
.blog-sub{font-size:16px;color:#5a6278;margin-bottom:56px;max-width:540px;line-height:1.65}
.post-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.post-card{background:#fff;border:1px solid #d8dce8;border-top:3px solid #e85d26;border-radius:2px;overflow:hidden}
.post-card-link{display:block;padding:28px;text-decoration:none;color:inherit;transition:box-shadow .2s}
.post-card-link:hover{box-shadow:0 4px 20px rgba(0,0,0,.08);text-decoration:none}
.post-card-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.post-card-date{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:#8891a8}
.post-card-tag{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;background:#e85d26;color:#fff;padding:2px 8px;border-radius:2px}
.post-card-title{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-weight:800;font-size:22px;line-height:1.15;letter-spacing:.3px;color:#111520;margin-bottom:10px}
.post-card-desc{font-size:14px;color:#5a6278;line-height:1.65;margin-bottom:20px}
.post-card-read{font-family:'Barlow Condensed',Arial Narrow,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e85d26}
@media(max-width:600px){.post-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${NAV}
<div class="blog-wrap">
  <p class="blog-eyebrow">From the Shop</p>
  <h1 class="blog-title">Tips, Guides & Local Resources</h1>
  <p class="blog-sub">Practical articles on custom 3D printing, parts sourcing, and what we're working on in Savannah, TN.</p>
  <div class="post-grid">
    ${postCards}
  </div>
</div>
${FOOTER}
</body>
</html>`;

fs.writeFileSync(path.join(blogDir, 'index.html'), blogIndexHtml);
console.log('✓ /blog/');

// ── Sitemap ──────────────────────────────────────────────────────────────────
const postUrls = posts.map(p => `
  <url>
    <loc>${siteUrl}/blog/${p.slug}/</loc>
    <lastmod>${p.date || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/blog/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>${postUrls}
</urlset>`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
console.log('✓ sitemap.xml');
console.log(`\nBuild complete — ${posts.length} posts.`);
