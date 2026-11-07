/**
 * CCP Site Chrome — shared nav + footer
 * Edit THIS file to update navigation/footer across the entire site.
 * Included by every page via: <script src="/components/site-chrome.js"></script>
 */
(function () {
  /* ── NAV LINKS ──────────────────────────────────────────────────────────────
     Add, remove, or rename links here.
     For blog/inner pages the logo href is "/" so it always goes home. */
  const isHome = document.documentElement.dataset.page === 'home';

  const NAV_LINKS = [
    { label: 'Services',     href: isHome ? '#services' : '/#services' },
    { label: 'Who We Serve', href: isHome ? '#serve'    : '/#serve'    },
    { label: 'Process',      href: isHome ? '#process'  : '/#process'  },
    { label: 'Blog',         href: '/blog/'                             },
    { label: 'Get a Quote',  href: isHome ? '#contact'  : '/#contact', cta: true },
  ];

  const FOOTER_LINKS = [
    { label: 'Services', href: isHome ? '#services' : '/#services' },
    { label: 'Blog',     href: '/blog/' },
    { label: 'Contact',  href: isHome ? '#contact'  : '/#contact'  },
    { label: '(731) 926-6167', href: 'sms:7319266167' },
  ];

  /* ── BUSINESS INFO — edit phone, address, name here ─────────────────────── */
  const BUSINESS = {
    name:    'Create Custom Parts Co.',
    city:    'Savannah, Tennessee',
    mailing: 'PO Box 279, Pickwick Dam, TN 38365',
    year:    new Date().getFullYear(),
  };

  /* ── NAV HTML ─────────────────────────────────────────────────────────────── */
  const logoHref = isHome ? '#hero' : '/';
  const linksHtml = NAV_LINKS.map(l =>
    `<li><a href="${l.href}"${l.cta ? ' class="nav-cta"' : ''}>${l.label}</a></li>`
  ).join('\n      ');

  const navHtml = `
<nav>
  <div class="nav-inner">
    <a class="nav-logo" href="${logoHref}">
      <svg class="nav-logo-hex" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon points="22,2 38,2 44,22 38,42 22,42 16,22" fill="none" stroke="#e85d26" stroke-width="2"/>
        <polygon points="23,8 37,8 41,22 37,36 23,36 19,22" fill="#e85d26" opacity="0.12"/>
        <text x="30" y="27" text-anchor="middle" font-family="'Barlow Condensed',Arial Narrow,Arial,sans-serif" font-weight="800" font-size="13" fill="#e85d26" letter-spacing="-0.5">CCP</text>
      </svg>
      <div class="nav-logo-text">CREATE CUSTOM<span>PARTS CO.</span></div>
    </a>
    <ul class="nav-links">
      ${linksHtml}
    </ul>
  </div>
</nav>`;

  /* ── FOOTER HTML ──────────────────────────────────────────────────────────── */
  const footerLinksHtml = FOOTER_LINKS.map(l =>
    `<a href="${l.href}">${l.label}</a>`
  ).join('\n      ');

  const footerHtml = `
<footer>
  <div class="footer-inner">
    <div>
      <p class="footer-copy">© ${BUSINESS.year} ${BUSINESS.name} — ${BUSINESS.city}</p>
      <p class="footer-copy" style="margin-top:4px">${BUSINESS.mailing}</p>
    </div>
    <div class="footer-links">
      ${footerLinksHtml}
    </div>
  </div>
</footer>`;

  /* ── INJECT ───────────────────────────────────────────────────────────────── */
  const navTarget = document.getElementById('site-nav');
  if (navTarget) {
    navTarget.outerHTML = navHtml;
  } else {
    document.body.insertAdjacentHTML('afterbegin', navHtml);
  }

  const footerTarget = document.getElementById('site-footer');
  if (footerTarget) {
    footerTarget.outerHTML = footerHtml;
  } else {
    document.body.insertAdjacentHTML('beforeend', footerHtml);
  }
})();
