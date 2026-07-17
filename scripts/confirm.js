/* fountos.com — confirm.js
   Landing page for the magic link. The Supabase client (loaded first) picks
   the session up from the link's URL automatically (detectSessionInUrl). We
   then read the querystring and call the matching SECURITY DEFINER RPC:
     source=home_*      → confirm_subscriber(p_source)      → "You're in."
     source=roadmap_vote→ confirm_roadmap_vote(p_item_id)   → "Counted."
   No valid session, a bad/expired link, or an RPC error → one calm error
   state. We never print a stack trace to the page. */
(function () {
  'use strict';

  var panel = document.getElementById('confirm-panel');
  if (!panel) return;

  function setState(opts) {
    var html = '';
    html += '<div class="sec-label" style="margin-bottom: 16px;">' + opts.label + '</div>';
    html += '<h1 class="h1" style="font-size: clamp(34px, 4.5vw, 56px);">' + opts.title + '</h1>';
    if (opts.body) html += '<p class="lead-sub" style="margin-top: 18px;">' + opts.body + '</p>';
    if (opts.cta) {
      html += '<div style="margin-top: 32px; display: flex; gap: 14px; ' +
              'justify-content: center; flex-wrap: wrap;">' + opts.cta + '</div>';
    }
    panel.innerHTML = html;
  }

  function showError() {
    setState({
      label: 'Confirmation',
      title: 'This link didn’t work.',
      body: 'It may have expired or already been used. Head back and start again — it only takes a moment.',
      cta: '<a class="btn" href="/en/#waitlist">Back to the waitlist</a>' +
           '<a class="btn btn-quiet" href="/en/roadmap.html">Go to the roadmap</a>'
    });
  }

  var sb = window.fountSupabase;
  if (!sb) { showError(); return; }

  var params = new URLSearchParams(window.location.search);
  var source = params.get('source');
  var item = params.get('item');

  // Supabase redirects failed links back with an error in the URL hash.
  var hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  if (hash.get('error') || hash.get('error_description') || hash.get('error_code')) {
    showError();
    return;
  }
  if (!source) { showError(); return; }

  sb.auth.getSession().then(function (res) {
    var session = res && res.data && res.data.session;
    if (!session) { showError(); return; }
    var email = session.user && session.user.email;

    if (source.indexOf('home_') === 0) {
      sb.rpc('confirm_subscriber', { p_source: source }).then(function (r) {
        if (r && r.error) { showError(); return; }
        if (window.fountLocal) window.fountLocal.markWaitlist(email);
        setState({
          label: 'You’re on the list',
          title: 'You’re in.',
          body: 'We’ll email you twice: when there’s real news, and when it’s your turn.',
          cta: '<a class="btn" href="/en/">Back to the home page →</a>'
        });
      }, showError);
    } else if (source === 'roadmap_vote') {
      if (!item) { showError(); return; }
      sb.rpc('confirm_roadmap_vote', { p_item_id: item }).then(function (r) {
        if (r && r.error) { showError(); return; }
        if (window.fountLocal) window.fountLocal.markVote(item, email);
        setState({
          label: 'Vote counted',
          title: 'Counted.',
          body: 'One vote per person, per idea.',
          cta: '<a class="btn" href="/en/roadmap.html">Back to the roadmap →</a>'
        });
      }, showError);
    } else {
      showError();
    }
  }, showError);
})();
