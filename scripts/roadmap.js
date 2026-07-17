/* fountos.com — roadmap.js
   Turns the roadmap board from a static placeholder into a live, data-driven
   page backed by Supabase:
     - reads roadmap_items (anon-readable) + roadmap_vote_counts (public view)
     - each column shows real items or a calm empty state
     - "Vote" opens a small inline email field → signInWithOtp (double opt-in,
       confirmed later on confirm.html?source=roadmap_vote&item=<id>)
     - the request form inserts straight into roadmap_requests (no OTP; the
       copy promises no confirmation, only "Thanks — we read everything.")
   roadmap_items is intentionally empty right now, so in production every
   column renders its empty state until the team adds real items. */
(function () {
  'use strict';

  var sb = window.fountSupabase;
  var cfg = window.fountSupabaseConfig;
  var local = window.fountLocal;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var COLUMNS = ['shipped', 'building', 'considering'];

  /* ================= board ================= */
  var board = document.getElementById('roadmap-board');

  function colBody(status) {
    return board ? board.querySelector('.roadmap-col[data-status="' + status + '"]') : null;
  }

  function quietCard(text) {
    var d = document.createElement('div');
    d.className = 'card';
    d.style.padding = '18px 20px';
    d.style.opacity = '0.7';
    var p = document.createElement('p');
    p.className = 'micro';
    p.style.margin = '0';
    p.textContent = text;
    d.appendChild(p);
    return d;
  }

  function fillColumns(fn) {
    COLUMNS.forEach(function (status) {
      var body = colBody(status);
      if (!body) return;
      body.innerHTML = '';
      fn(status, body);
    });
  }

  function renderBoardError() {
    fillColumns(function (status, body) {
      body.appendChild(quietCard('Couldn’t load the board just now. Refresh to try again.'));
    });
  }

  /* ---- one item card, incl. the inline-email vote flow ---- */
  function itemCard(item, votes) {
    var card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '18px 20px';

    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '14px';
    row.style.alignItems = 'flex-start';

    var main = document.createElement('div');
    main.style.flex = '1 1 0%';
    var title = document.createElement('div');
    title.style.fontFamily = 'var(--font-display)';
    title.style.fontWeight = '600';
    title.style.fontSize = '17px';
    title.style.lineHeight = '1.25';
    title.textContent = item.title;
    main.appendChild(title);
    if (item.one_liner) {
      var ol = document.createElement('p');
      ol.className = 'micro';
      ol.style.margin = '6px 0 0';
      ol.textContent = item.one_liner;
      main.appendChild(ol);
    }
    row.appendChild(main);
    card.appendChild(row);

    // Shipped items are done — no voting.
    if (item.status === 'shipped') return card;

    var slot = document.createElement('div');
    slot.style.flexShrink = '0';
    row.appendChild(slot);

    var expand = document.createElement('div');
    expand.style.marginTop = '14px';
    expand.hidden = true;
    card.appendChild(expand);

    wireVote(item, votes, slot, expand);
    return card;
  }

  function wireVote(item, votes, slot, expand) {
    // Best-effort local hint: this browser already confirmed a vote here.
    if (local && local.hasVoted(item.id)) {
      var voted = document.createElement('span');
      voted.className = 'micro';
      voted.textContent = 'You’ve already voted for this one.';
      slot.appendChild(voted);
      return;
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-quiet';
    btn.style.padding = '6px 12px';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Vote for ' + item.title);
    btn.textContent = votes > 0 ? '▲ Vote · ' + votes : '▲ Vote';
    slot.appendChild(btn);

    var built = false;
    btn.addEventListener('click', function () {
      var willOpen = expand.hidden;
      expand.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen && !built) { buildVoteForm(item, btn, expand); built = true; }
      if (willOpen) {
        var inp = expand.querySelector('input');
        if (inp) inp.focus();
      }
    });
  }

  function buildVoteForm(item, btn, expand) {
    var form = document.createElement('form');
    form.setAttribute('novalidate', '');
    form.style.display = 'flex';
    form.style.flexDirection = 'column';
    form.style.gap = '8px';

    var line = document.createElement('div');
    line.style.display = 'flex';
    line.style.gap = '8px';
    line.style.flexWrap = 'wrap';

    var input = document.createElement('input');
    input.type = 'email';
    input.className = 'waitlist-input';
    input.placeholder = 'you@yourcompany.com';
    input.setAttribute('aria-label', 'Email to confirm your vote for ' + item.title);
    input.style.maxWidth = 'none';
    input.style.flex = '1 1 200px';

    var submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-sm';
    submit.style.flexShrink = '0';
    submit.textContent = 'Confirm vote';

    line.appendChild(input);
    line.appendChild(submit);

    var help = document.createElement('p');
    help.className = 'micro';
    help.style.margin = '0';
    help.textContent = 'Confirming your vote also puts you on the waitlist. Unsubscribe any time.';

    form.appendChild(line);
    form.appendChild(help);
    expand.appendChild(form);

    function showErr(msg) {
      input.classList.add('invalid');
      var e = form.querySelector('.waitlist-err');
      if (!e) {
        e = document.createElement('p');
        e.className = 'waitlist-err';
        e.style.margin = '0';
        form.appendChild(e);
      }
      e.textContent = msg;
    }
    input.addEventListener('input', function () {
      input.classList.remove('invalid');
      var e = form.querySelector('.waitlist-err');
      if (e) e.remove();
    });

    var busy = false;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      var email = (input.value || '').trim();
      if (!EMAIL_RE.test(email)) {
        showErr('That address doesn’t look right. Check it and try again.');
        return;
      }
      if (!sb || !cfg) {
        showErr('Something went wrong on our side. Please try again in a moment.');
        return;
      }
      busy = true;
      var label = submit.textContent;
      submit.disabled = true; submit.textContent = 'Sending…';

      function fail(msg) {
        busy = false; submit.disabled = false; submit.textContent = label;
        showErr(msg);
      }

      sb.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: cfg.confirmUrl({ source: 'roadmap_vote', item: item.id }) }
      }).then(function (res) {
        if (res && res.error) {
          fail(res.error.status === 429
            ? 'That’s a lot of tries. Wait a minute, then try again.'
            : 'We couldn’t send the email just now. Please try again in a moment.');
          return;
        }
        // Pending — swap the whole vote area for the "check your inbox" note.
        if (btn) btn.remove();
        expand.hidden = false;
        expand.innerHTML = '';
        var msg = document.createElement('p');
        msg.className = 'micro';
        msg.style.margin = '0';
        msg.textContent = 'Check your inbox to confirm the vote. We’ll add you to the waitlist too — unsubscribe any time.';
        expand.appendChild(msg);
      }, function () {
        fail('Something went wrong on our side. Please try again in a moment.');
      });
    });
  }

  function loadBoard() {
    if (!board) return;
    if (!sb) { renderBoardError(); return; }

    Promise.all([
      sb.from('roadmap_items').select('id, title, one_liner, status, sort_order'),
      sb.from('roadmap_vote_counts').select('item_id, votes')
    ]).then(function (results) {
      var itemsRes = results[0], countsRes = results[1];
      if (itemsRes.error) { renderBoardError(); return; }

      var counts = {};
      if (countsRes && !countsRes.error && countsRes.data) {
        countsRes.data.forEach(function (r) { counts[r.item_id] = r.votes; });
      }

      var byStatus = { shipped: [], building: [], considering: [] };
      (itemsRes.data || []).forEach(function (it) {
        if (byStatus[it.status]) byStatus[it.status].push(it);
      });

      fillColumns(function (status, body) {
        var list = byStatus[status];
        list.sort(function (a, b) {
          return (a.sort_order - b.sort_order) || (a.title < b.title ? -1 : (a.title > b.title ? 1 : 0));
        });
        if (!list.length) {
          body.appendChild(quietCard('More items coming soon.'));
          return;
        }
        list.forEach(function (it) { body.appendChild(itemCard(it, counts[it.id] || 0)); });
      });
    }, function () {
      renderBoardError();
    });
  }

  /* ================= request form ================= */
  function wireRequestForm() {
    var form = document.getElementById('roadmap-request-form');
    if (!form) return;
    var titleI = form.querySelector('[name="title"]');
    var descI = form.querySelector('[name="description"]');
    var emailI = form.querySelector('[name="email"]');
    var submit = form.querySelector('button[type="submit"]');
    var busy = false;

    function showErr(msg) {
      var e = form.parentElement.querySelector('.waitlist-err');
      if (!e) {
        e = document.createElement('p');
        e.className = 'waitlist-err';
        e.style.marginTop = '10px';
        e.setAttribute('aria-live', 'polite');
        form.insertAdjacentElement('afterend', e);
      }
      e.textContent = msg;
    }
    function clearErr() {
      var e = form.parentElement.querySelector('.waitlist-err');
      if (e) e.remove();
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (busy) return;
      clearErr();

      var title = (titleI.value || '').trim();
      var description = (descI.value || '').trim();
      var email = (emailI.value || '').trim();

      if (!title) { showErr('Add a short title for your request.'); titleI.focus(); return; }
      if (title.length > 120) { showErr('Keep the title under 120 characters.'); titleI.focus(); return; }
      if (!description) { showErr('Add a line or two on why it matters.'); descI.focus(); return; }
      if (description.length > 600) { showErr('Keep the details under 600 characters.'); descI.focus(); return; }
      if (!EMAIL_RE.test(email)) { showErr('That address doesn’t look right. Check it and try again.'); emailI.focus(); return; }
      if (!sb) { showErr('Something went wrong on our side. Please try again in a moment.'); return; }

      busy = true;
      var label = submit.textContent;
      submit.disabled = true; submit.textContent = 'Sending…';

      sb.from('roadmap_requests').insert({ title: title, description: description, email: email })
        .then(function (res) {
          if (res && res.error) {
            busy = false; submit.disabled = false; submit.textContent = label;
            showErr('We couldn’t send that just now. Please try again in a moment.');
            return;
          }
          var done = document.createElement('div');
          done.className = 'waitlist-done';
          done.setAttribute('aria-live', 'polite');
          var h = document.createElement('div');
          h.className = 'h3';
          h.textContent = 'Thanks — we read everything.';
          var p = document.createElement('p');
          p.className = 'body-copy';
          p.style.marginTop = '10px';
          p.textContent = 'We don’t publish comments — but every request shapes what we build.';
          done.appendChild(h);
          done.appendChild(p);
          form.replaceWith(done);
        }, function () {
          busy = false; submit.disabled = false; submit.textContent = label;
          showErr('Something went wrong on our side. Please try again in a moment.');
        });
    });
  }

  loadBoard();
  wireRequestForm();
})();
