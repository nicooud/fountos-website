/* fountos.com — supabase-client.js
   One shared Supabase browser client for the whole site (waitlist + roadmap).

   Load order on any page that needs it:
     1. the @supabase/supabase-js UMD bundle (CDN) — defines window.supabase
     2. this file — creates window.fountSupabase
     3. main.js / roadmap.js / confirm.js — read window.fountSupabase

   The publishable key below is safe to ship client-side (it only grants the
   anon role, gated by row-level security). There is NO service_role key here
   and there must never be one in browser code. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://zlgangwzanaroyhnonke.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_gEaHjLN6tiO29nSbHlrZBA_IbBv7VCK';

  /* Canonical production origin. Magic-link redirects must land on the live
     site — and the target must be allow-listed under Supabase Auth → URL
     Configuration — so this is deliberately hard-coded, not
     window.location.origin (which would be localhost during local testing and
     therefore rejected by Supabase). */
  var SITE_URL = 'https://fountos.com';

  // Config other page scripts read (e.g. to build emailRedirectTo URLs).
  window.fountSupabaseConfig = {
    siteUrl: SITE_URL,
    // Build a confirm.html redirect URL for the magic-link flow.
    confirmUrl: function (params) {
      var qs = Object.keys(params || {}).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      return SITE_URL + '/en/confirm.html' + (qs ? '?' + qs : '');
    }
  };

  /* Best-effort local "already did this" hints. NOT a security boundary —
     the real guarantee is the database's unique constraints. This only lets
     the UI say "you've already voted for this one" without a round-trip.
     confirm.js writes these on a confirmed action; roadmap.js reads them.
     Wrapped in try/catch because localStorage throws in some private modes. */
  window.fountLocal = {
    _get: function (k, fallback) {
      try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    _set: function (k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
    markWaitlist: function (email) {
      this._set('fount:waitlist', { confirmed: true, email: email || null, at: Date.now() });
      if (email) this._set('fount:email', email);
    },
    isWaitlisted: function () {
      var w = this._get('fount:waitlist', null);
      return !!(w && w.confirmed);
    },
    markVote: function (itemId, email) {
      if (!itemId) return;
      var v = this._get('fount:votes', []);
      if (v.indexOf(itemId) === -1) { v.push(itemId); this._set('fount:votes', v); }
      if (email) this._set('fount:email', email);
    },
    hasVoted: function (itemId) {
      return this._get('fount:votes', []).indexOf(itemId) !== -1;
    },
    email: function () { return this._get('fount:email', null); }
  };

  // The UMD bundle exposes window.supabase (the library namespace).
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    // Library failed to load (offline / CDN blocked). Leave the handle null;
    // every caller must degrade gracefully rather than fake success.
    window.fountSupabase = null;
    return;
  }

  window.fountSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        // Pick the session up from the magic-link tokens in confirm.html's URL.
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true
      }
    }
  );
})();
