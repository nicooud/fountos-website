/* fountos.com — main.js
   Vanilla-herbouw van de interactie uit het Claude Design-prototype
   ("Fount - Home v2 (standalone).html", unbundled 2026-07-16).
   Alle copy in dit bestand is verbatim uit de prototype-JSX overgenomen. */
(function () {
  'use strict';

  var EASE_SETTLE = 720; // ms — zelfde venster als Reveal 'settled' in het prototype
  var MOBILE = window.matchMedia('(max-width: 760px)');

  /* ---------- nav: scrolled-state + mobiel menu ---------- */
  var nav = document.querySelector('.sitenav');
  var sheet = document.querySelector('.nav-sheet');
  var menuBtn = document.querySelector('.nav-menu-btn');
  var menuOpen = false;

  function syncNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8 || menuOpen);
  }
  window.addEventListener('scroll', syncNav, { passive: true });
  syncNav();

  if (menuBtn && sheet) {
    menuBtn.addEventListener('click', function () {
      menuOpen = !menuOpen;
      sheet.hidden = !menuOpen;
      menuBtn.textContent = menuOpen ? 'Close' : 'Menu';
      menuBtn.setAttribute('aria-expanded', String(menuOpen));
      syncNav();
    });
  }

  /* ---------- focus-pull reveal (rect-check, zoals het prototype) ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  function checkReveals() {
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    var batch = [];
    revealEls = revealEls.filter(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) { batch.push(el); return false; }
      return true;
    });
    batch.forEach(function (el, i) {
      var delay = i * 80; // stagger vervangt de per-element delays uit de JSX
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('in');
      setTimeout(function () { el.style.transitionDelay = ''; }, delay + EASE_SETTLE);
    });
    if (!revealEls.length) window.removeEventListener('scroll', checkReveals);
  }
  window.addEventListener('scroll', checkReveals, { passive: true });
  window.addEventListener('resize', checkReveals);
  checkReveals();

  /* ---------- ScreenFigure: schaal hercalculeren (ResizeObserver in het prototype) ---------- */
  function rescaleFig(fig) {
    var mid = fig.firstElementChild;
    var inner = mid && mid.firstElementChild;
    if (!inner || !inner.style.width) return;
    var w = parseFloat(inner.style.width);
    var h = parseFloat(inner.style.height);
    var cw = fig.clientWidth;
    if (!w || !cw) return;
    var scale = cw / w;
    mid.style.height = Math.round(h * scale) + 'px';
    inner.style.transform = 'scale(' + scale + ')';
  }
  function rescaleAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.screen-fig'), rescaleFig);
  }
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (e) { rescaleFig(e.target); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.screen-fig'), function (f) { ro.observe(f); });
  } else {
    window.addEventListener('resize', function () { rescaleAll(); });
  }
  rescaleAll();

  /* ---------- accordions: FAQ + six-views (één tegelijk open) ---------- */
  function wireAccordion(rootSel, itemSel, headSel) {
    Array.prototype.forEach.call(document.querySelectorAll(rootSel), function (root) {
      var items = root.querySelectorAll(itemSel);
      Array.prototype.forEach.call(items, function (item) {
        var head = item.querySelector(headSel);
        if (!head) return;
        head.addEventListener('click', function () {
          var wasOpen = item.classList.contains('open');
          Array.prototype.forEach.call(items, function (it) {
            it.classList.remove('open');
            var h = it.querySelector(headSel);
            if (h) h.setAttribute('aria-expanded', 'false');
          });
          if (!wasOpen) {
            item.classList.add('open');
            head.setAttribute('aria-expanded', 'true');
            rescaleAll(item); // figuur in de body op de juiste schaal
          }
        });
      });
    });
  }
  wireAccordion('.faq', '.faq-item', '.faq-q');
  wireAccordion('.views-acc', '.va-item', '.va-head');

  /* ---------- LensSwap: folder ↔ lens, states 1-op-1 uit het prototype geoogst ---------- */
  var swap = document.querySelector('.lens-swap');
  if (swap) {
    var touchX = null;
    var renderSwap = function (state) {
      var variant = MOBILE.matches ? 'mobile' : 'desktop';
      var tpl = document.getElementById('tpl-swap-' + variant + '-' + state);
      if (!tpl) return;
      swap.setAttribute('data-swap-state', state);
      swap.innerHTML = tpl.innerHTML;
      Array.prototype.forEach.call(swap.querySelectorAll('.lens-toggle button'), function (btn) {
        btn.addEventListener('click', function () {
          renderSwap(btn.textContent.indexOf('folder') !== -1 ? 'folder' : 'lens');
        });
      });
      rescaleAll(swap);
    };
    swap.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    swap.addEventListener('touchend', function (e) {
      if (touchX == null || !MOBILE.matches) { touchX = null; return; }
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) renderSwap(dx < 0 ? 'lens' : 'folder');
      touchX = null;
    }, { passive: true });
    var onMq = function () { renderSwap(swap.getAttribute('data-swap-state') || 'lens'); };
    if (MOBILE.addEventListener) MOBILE.addEventListener('change', onMq); else MOBILE.addListener(onMq);
    renderSwap('lens');
  }

  /* ---------- waitlist: e-mail-validatie → Supabase magic-link OTP ----------
     Een geldige submit stuurt een bevestigingsmail (signInWithOtp). De
     inschrijving telt pas écht mee ná de klik op die link (op confirm.html,
     waar confirm_subscriber draait). Daarom tonen we hier een "check your
     inbox"-tussenstaat — niet "You're in.". */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function waitlistBlock(titleText, bodyNodes) {
    var wrap = document.createElement('div');
    wrap.className = 'waitlist-done';
    wrap.setAttribute('aria-live', 'polite');
    var h = document.createElement('div');
    h.className = 'h3';
    h.textContent = titleText;
    var p = document.createElement('p');
    p.className = 'body-copy';
    p.style.maxWidth = '460px';
    bodyNodes.forEach(function (n) { p.appendChild(n); });
    wrap.appendChild(h);
    wrap.appendChild(p);
    return wrap;
  }

  Array.prototype.forEach.call(document.querySelectorAll('.waitlist-form'), function (form) {
    var container = form.parentElement;
    var input = form.querySelector('.waitlist-input');
    var button = form.querySelector('button[type="submit"], .btn');
    var source = form.getAttribute('data-source'); // opt-in marker for the real flow
    var busy = false;

    function showError(msg) {
      input.classList.add('invalid');
      var err = container.querySelector('.waitlist-err');
      if (!err) {
        err = document.createElement('p');
        err.className = 'waitlist-err';
        err.setAttribute('aria-live', 'polite');
        form.insertAdjacentElement('afterend', err);
      }
      err.textContent = msg;
    }
    function clearError() {
      input.classList.remove('invalid');
      var err = container.querySelector('.waitlist-err');
      if (err) err.remove();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var email = (input.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        showError('That address doesn’t look right. Check it and try again.');
        return;
      }
      clearError();

      var sb = window.fountSupabase;
      var cfg = window.fountSupabaseConfig;
      // The real magic-link flow runs only for forms explicitly wired with a
      // data-source AND on a page that loaded the Supabase client. Other
      // "Join the waitlist" CTAs across the site (feature/academy/compare/
      // pricing pages) aren't wired to Supabase yet, so they keep their prior
      // client-side confirmation — nothing regresses. See "Voor Nico".
      if (!source || !sb || !cfg) {
        container.replaceWith(waitlistBlock('You’re in.', [
          document.createTextNode('We’ll email you twice: when there’s real news, and when it’s your turn to try Fount. That’s it — your inbox stays calm.')
        ]));
        return;
      }

      busy = true;
      var label = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      function fail(msg) {
        busy = false;
        if (button) { button.disabled = false; button.textContent = label; }
        showError(msg);
      }

      sb.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: cfg.confirmUrl({ source: source }) }
      }).then(function (res) {
        if (res && res.error) {
          if (res.error.status === 429) {
            fail('That’s a lot of tries. Wait a minute, then try again.');
          } else {
            fail('We couldn’t send the email just now. Please try again in a moment.');
          }
          return;
        }
        var strong = document.createElement('strong');
        strong.textContent = email;
        container.replaceWith(waitlistBlock('Check your inbox.', [
          document.createTextNode('We sent a link to '),
          strong,
          document.createTextNode('. Click it to confirm and you’re on the list.')
        ]));
      }, function () {
        fail('Something went wrong on our side. Please try again in a moment.');
      });
    });

    input.addEventListener('input', clearError);
  });
})();
