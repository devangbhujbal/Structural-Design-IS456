/* Structural Studio — cookie consent banner.
 *
 * Pairs with the Consent Mode v2 defaults set inline in each page's head.
 * Those defaults deny everything before gtag.js loads, so no cookie is set
 * until the visitor accepts here. Only analytics_storage is ever granted;
 * the ad_* signals stay denied permanently because the site runs no ads.
 *
 * Dismissing the banner without choosing is deliberately not possible —
 * silence is not consent, so there is no close button, only two buttons.
 */
(function () {
  'use strict';

  var KEY = 'ss-consent';
  var banner = null;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function write(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
  }

  function build() {
    var el = document.createElement('div');
    el.className = 'consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie choices');
    el.innerHTML =
      '<div class="consent-inner">' +
        '<div class="consent-copy">' +
          '<p class="consent-title">Cookies</p>' +
          '<p>We use Google Analytics to see which notes people actually read. ' +
          'It sets cookies in your browser. Decline and nothing is stored — ' +
          'the site works exactly the same either way. ' +
          '<a href="/privacy.html">What we collect</a>.</p>' +
        '</div>' +
        '<div class="consent-actions">' +
          '<button type="button" data-consent="decline">Decline</button>' +
          '<button type="button" data-consent="accept">Accept</button>' +
        '</div>' +
      '</div>';
    return el;
  }

  function show() {
    if (banner) { return; }
    banner = build();
    document.body.appendChild(banner);
  }

  function hide() {
    if (banner && banner.parentNode) { banner.parentNode.removeChild(banner); }
    banner = null;
  }

  /* Consent Mode stops GA writing new cookies, but it does not remove ones
     already set. Withdrawing has to actually clear them, so expire every _ga*
     cookie across the host and each parent domain — GA sets them on the
     registrable domain, which is not necessarily location.hostname. */
  function clearAnalyticsCookies() {
    var names = document.cookie.split(';')
      .map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return n.indexOf('_ga') === 0 || n === '_gid'; });

    var parts = location.hostname.split('.');
    var domains = ['', location.hostname];
    for (var i = 0; i < parts.length - 1; i++) {
      domains.push('.' + parts.slice(i).join('.'));
    }

    names.forEach(function (name) {
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' +
          '; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function decide(granted) {
    write(granted ? 'granted' : 'denied');
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': granted ? 'granted' : 'denied'
      });
    }
    if (!granted) { clearAnalyticsCookies(); }
    hide();
  }

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) { return; }

      var choice = t.closest('[data-consent]');
      if (choice) {
        decide(choice.getAttribute('data-consent') === 'accept');
        return;
      }

      /* Withdrawal has to be as easy as consent, so any element carrying
         data-consent-reopen brings the banner back — see the footer link. */
      var reopen = t.closest('[data-consent-reopen]');
      if (reopen) {
        e.preventDefault();
        show();
      }
    });

    if (!read()) { show(); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
