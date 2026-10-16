/* Anxious Black Girls app. Content lives in /content: edit those files, not this one. */
(function () {
  'use strict';

  var view = document.getElementById('view');
  var toastEl = document.getElementById('toast');
  var AFFIRMATIONS = [];
  var PROMPTS = [];
  var DATA = { topics: [], articles: [] };
  var articleCache = {};

  // ---------- storage (saved items stay on this phone only) ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function savedAffs() { return store.get('abg.savedAffirmations', []); }
  function savedArts() { return store.get('abg.savedArticles', []); }
  function toggle(key, value) {
    var list = store.get(key, []);
    var i = list.indexOf(value);
    if (i === -1) list.unshift(value); else list.splice(i, 1);
    store.set(key, list);
    return i === -1;
  }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function dayNumber() {
    var n = new Date();
    return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
  }
  function topicById(id) { return DATA.topics.filter(function (t) { return t.id === id; })[0]; }
  function articleById(id) { return DATA.articles.filter(function (a) { return a.id === id; })[0]; }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  var ICON = {
    heart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    chev: '<svg class="icon chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    out: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    chat: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  };

  // ---------- tiny markdown reader for article files ----------
  function renderMarkdown(src) {
    var lines = src.replace(/\r/g, '').split('\n');
    var html = '', para = [], list = [], sources = false, inSkill = false;
    function flushP() { if (para.length) { html += '<p>' + inline(para.join(' ')) + '</p>'; para = []; } }
    function closeSkill() { flushP(); flushL(); if (inSkill) { html += '</section>'; inSkill = false; } }
    function flushL() {
      if (list.length) {
        html += '<ul' + (sources ? ' class="sources"' : '') + '>' +
          list.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>';
        list = [];
      }
    }
    lines.forEach(function (raw) {
      var l = raw.trim();
      if (!l) { flushP(); flushL(); return; }
      if (l.indexOf('### ') === 0) { closeSkill(); sources = /source/i.test(l); html += '<h3>' + inline(l.slice(4)) + '</h3>'; return; }
      if (/^## try this/i.test(l)) {
        closeSkill();
        var rest = l.slice(3).replace(/^try this\s*:?\s*/i, '');
        html += '<section class="skill"><span class="eyebrow">Try this</span>' +
          (rest ? '<h2>' + inline(rest.charAt(0).toUpperCase() + rest.slice(1)) + '</h2>' : '');
        inSkill = true; return;
      }
      if (l.indexOf('## ') === 0) { closeSkill(); html += '<h2>' + inline(l.slice(3)) + '</h2>'; return; }
      if (inSkill && /988/.test(l) && !/^- /.test(l)) { closeSkill(); }
      if (l.indexOf('> ') === 0) { flushP(); flushL(); html += '<aside class="lens"><span class="eyebrow">Through our lens</span><p>' + inline(l.slice(2)) + '</p></aside>'; return; }
      if (l.indexOf('- ') === 0) { flushP(); list.push(l.slice(2)); return; }
      flushL(); para.push(l);
    });
    closeSkill();
    return html;
  }

  // ---------- share ----------
  function shareAffirmation(text) {
    var msg = '"' + text + '" Today\'s affirmation from Anxious Black Girls® anxiousblackgirls.com';
    if (navigator.share) {
      navigator.share({ text: msg }).catch(function () { copy(msg); });
    } else { copy(msg); }
  }
  function copy(msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(function () { toast('Copied. Paste it anywhere to share.'); },
        function () { toast('Couldn\'t copy. Press and hold the text to copy it.'); });
    } else { toast('Press and hold the text to copy it.'); }
  }

  // ---------- views ----------
  function articleRow(a) {
    var t = topicById(a.topic) || { name: '', color: '#F0DFB8' };
    return '<a class="row-link" href="#article-' + esc(a.id) + '">' +
      '<span class="badge" style="background:' + esc(t.color) + '">' + esc(t.name.slice(0, 2).toUpperCase()) + '</span>' +
      '<span class="text"><span class="meta">' + esc(t.name) + ' · ' + a.minutes + ' min</span>' +
      '<span class="title">' + esc(a.title) + '</span></span>' + ICON.chev + '</a>';
  }

  function viewToday() {
    var n = dayNumber();
    var aff = AFFIRMATIONS[n % AFFIRMATIONS.length];
    var art = DATA.articles[n % DATA.articles.length];
    var hello = 'To My Anxious Black Girl,';
    var date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    var isSaved = savedAffs().indexOf(aff.text) !== -1;
    view.innerHTML =
      '<div><div class="date">' + esc(date) + '</div><h1 class="greeting">' + hello + '</h1></div>' +
      '<section class="affirmation" aria-label="Today\'s affirmation">' +
        '<span class="eyebrow">Today\'s affirmation</span>' +
        '<blockquote>' + esc(aff.text) + '</blockquote>' +
        '<p>' + esc(aff.note) + '</p>' +
        '<div class="actions">' +
          '<button id="save-aff" class="btn solid" aria-pressed="' + isSaved + '">' + ICON.heart + '<span>' + (isSaved ? 'Saved' : 'Save') + '</span></button>' +
          '<button id="share-aff" class="btn">' + ICON.share + 'Share</button>' +
        '</div>' +
      '</section>' +
      '<h2 class="section-title">Today\'s read</h2>' + articleRow(art) +
      '<a class="row-link" href="#learn"><span class="text"><span class="title">Browse all topics</span><span class="lede" style="margin:0">Anxiety, depression, bipolar, BPD, ADHD, autism and more</span></span>' + ICON.chev + '</a>';

    document.getElementById('save-aff').addEventListener('click', function () {
      var on = toggle('abg.savedAffirmations', aff.text);
      this.setAttribute('aria-pressed', on);
      this.querySelector('span').textContent = on ? 'Saved' : 'Save';
      toast(on ? 'Saved to your favorites' : 'Removed from favorites');
    });
    document.getElementById('share-aff').addEventListener('click', function () { shareAffirmation(aff.text); });
  }

  function viewLearn() {
    view.innerHTML =
      '<div><h1 class="page-title">Learn</h1><p class="lede">What it is, how it shows up in us, and why it so often gets missed.</p></div>' +
      '<label class="search" for="search-input">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<span class="sr">Search articles</span><input id="search-input" type="search" placeholder="Search articles" autocomplete="off"></label>' +
      '<div id="learn-body"></div>';
    var body = document.getElementById('learn-body');
    function showTopics() {
      body.innerHTML = '<div class="topics">' + DATA.topics.map(function (t) {
        var count = DATA.articles.filter(function (a) { return a.topic === t.id; }).length;
        return '<a class="topic" href="#topic-' + esc(t.id) + '" style="background:' + esc(t.color) + '">' +
          '<span class="count">' + count + (count === 1 ? ' read' : ' reads') + '</span>' +
          '<span><span class="name">' + esc(t.name) + '</span><span class="blurb" style="display:block">' + esc(t.blurb) + '</span></span></a>';
      }).join('') + '</div>';
    }
    showTopics();
    document.getElementById('search-input').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) { showTopics(); return; }
      var hits = DATA.articles.filter(function (a) {
        var t = topicById(a.topic);
        return (a.title + ' ' + (t ? t.name : '')).toLowerCase().indexOf(q) !== -1;
      });
      body.innerHTML = hits.length
        ? '<div class="stack">' + hits.map(articleRow).join('') + '</div>'
        : '<p class="empty">No articles match "' + esc(q) + '" yet.</p>';
    });
  }

  function viewTopic(id) {
    var t = topicById(id);
    if (!t) { location.hash = '#learn'; return; }
    var list = DATA.articles.filter(function (a) { return a.topic === id; });
    view.innerHTML =
      '<div class="article-top"><a class="icon-btn" href="#learn" aria-label="Back to Learn">' + ICON.back + '</a></div>' +
      '<div><h1 class="page-title">' + esc(t.name) + '</h1><p class="lede">' + esc(t.blurb) + '</p></div>' +
      '<div class="stack">' + list.map(articleRow).join('') + '</div>';
  }

  function viewArticle(id) {
    var a = articleById(id);
    if (!a) { location.hash = '#learn'; return; }
    var t = topicById(a.topic) || { name: '', color: '#F0DFB8', id: '' };
    var isSaved = savedArts().indexOf(id) !== -1;
    view.innerHTML =
      '<div class="article-top"><a class="icon-btn" href="#topic-' + esc(t.id) + '" aria-label="Back to ' + esc(t.name) + '">' + ICON.back + '</a>' +
      '<button id="save-art" class="icon-btn" aria-pressed="' + isSaved + '" aria-label="Save this article">' + ICON.heart.replace('class="icon"', '') + '</button></div>' +
      '<article class="prose"><div class="tags"><span class="tag" style="background:' + esc(t.color) + '">' + esc(t.name) + '</span><span class="tag" style="background:var(--bg)">' + a.minutes + ' min read</span></div>' +
      '<h1>' + esc(a.title) + '</h1><div id="article-body" class="stack" style="gap:14px"><p>Loading…</p></div></article>' +
      '<a class="crisis primary" href="#help"><span class="text"><span class="big" style="display:block">Find support</span><span class="small">Crisis lines and Black therapist directories</span></span></a>' +
      '<p class="disclaimer">This is education, not a diagnosis or medical advice. Talk with a licensed professional about your own health.</p>';
    document.getElementById('save-art').addEventListener('click', function () {
      var on = toggle('abg.savedArticles', id);
      this.setAttribute('aria-pressed', on);
      toast(on ? 'Article saved' : 'Removed from saved');
    });
    var bodyEl = document.getElementById('article-body');
    function fill(md) { bodyEl.innerHTML = renderMarkdown(md); }
    if (articleCache[id]) { fill(articleCache[id]); return; }
    fetch('content/articles/' + encodeURIComponent(id) + '.md')
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (md) { articleCache[id] = md; if (location.hash === '#article-' + id) fill(md); })
      .catch(function () { bodyEl.innerHTML = '<p>This article didn\'t load. Check your connection and try again.</p>'; });
  }

  // ---------- journal (entries never leave this phone) ----------
  var CRISIS_WORDS = /\b(suicid\w*|kill (my ?self|me)|end (it all|my life)|want to die|wanna die|don'?t want to (be here|live|wake up)|no reason to live|better off without me|hurt(ing)? myself|cut(ting)? myself|self[- ]?harm\w*|overdose|take all (my|the) pills)\b/i;

  function journalEntries() { return store.get('abg.journal', []); }

  function crisisBanner() {
    return '<section class="crisis-banner" role="alert">' +
      '<strong>You don\'t have to go through this alone.</strong>' +
      '<p>If you\'re thinking about hurting yourself or ending your life, reach out right now. Call or text <strong>988</strong>, or text <strong>HOME</strong> to <strong>741741</strong>. If you\'re in danger, call <strong>911</strong>.</p>' +
      '<a class="btn solid" href="#help">See all help options</a></section>';
  }

  function viewJournal() {
    var prompt = PROMPTS.length ? PROMPTS[dayNumber() % PROMPTS.length] : '';
    var entries = journalEntries();
    var draft = store.get('abg.journalDraft', '');
    view.innerHTML =
      '<div><h1 class="page-title">Journal</h1><p class="lede">Your entries stay on this phone. No one else can read them, including Anxious Black Girls®.</p></div>' +
      '<section class="journal-card">' +
        '<span class="eyebrow">Today\'s prompt</span>' +
        '<p class="prompt">' + esc(prompt) + '</p>' +
        '<label class="sr" for="journal-text">Write your entry</label>' +
        '<textarea id="journal-text" rows="7" placeholder="Write as much or as little as you want…">' + esc(draft) + '</textarea>' +
        '<div class="actions"><button id="journal-save" class="btn dark">Save entry</button>' +
        '<button id="journal-free" class="btn">Write without the prompt</button></div>' +
      '</section>' +
      '<div id="journal-alert"></div>' +
      '<p class="disclaimer">This journal is private and not monitored. If you\'re in crisis, call or text 988. Deleting the app or clearing your browser data erases your entries, so use "Copy all entries" to keep a backup.</p>' +
      '<div class="row-between"><h2 class="section-title">Past entries</h2>' +
        (entries.length ? '<button id="journal-copy" class="btn small">Copy all entries</button>' : '') + '</div>' +
      (entries.length ? '<div class="stack">' + entries.map(function (e) {
        var d = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        return '<details class="entry"><summary><span class="entry-date">' + esc(d) + '</span>' +
          '<span class="entry-preview">' + esc(e.text.slice(0, 80)) + (e.text.length > 80 ? '…' : '') + '</span></summary>' +
          (e.prompt ? '<p class="entry-prompt">' + esc(e.prompt) + '</p>' : '') +
          '<p class="entry-text">' + esc(e.text) + '</p>' +
          '<div class="actions"><button class="btn small" data-del="' + esc(e.id) + '">Delete</button>' +
          '<span class="confirm" data-confirm="' + esc(e.id) + '" hidden>Delete this entry for good? ' +
          '<button class="btn small dark" data-del-yes="' + esc(e.id) + '">Yes, delete</button> ' +
          '<button class="btn small" data-del-no="' + esc(e.id) + '">Keep it</button></span></div>' +
          '</details>';
      }).join('') + '</div>' : '<p class="empty">Your saved entries will show up here.</p>');

    var usePrompt = true;
    var ta = document.getElementById('journal-text');
    var alertBox = document.getElementById('journal-alert');
    function check() { alertBox.innerHTML = CRISIS_WORDS.test(ta.value) ? crisisBanner() : ''; }
    ta.addEventListener('input', function () { store.set('abg.journalDraft', ta.value); check(); });
    check();
    document.getElementById('journal-free').addEventListener('click', function () {
      usePrompt = !usePrompt;
      view.querySelector('.journal-card .prompt').hidden = !usePrompt;
      this.textContent = usePrompt ? 'Write without the prompt' : 'Use today\'s prompt';
      ta.focus();
    });
    document.getElementById('journal-save').addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) { toast('Write something first, then tap Save.'); ta.focus(); return; }
      var list = journalEntries();
      list.unshift({ id: String(Date.now()), date: new Date().toISOString(), prompt: usePrompt ? prompt : '', text: text });
      store.set('abg.journal', list);
      store.set('abg.journalDraft', '');
      var flagged = CRISIS_WORDS.test(text);
      viewJournal();
      if (flagged) document.getElementById('journal-alert').innerHTML = crisisBanner();
      toast('Entry saved on this phone');
    });
    var copyBtn = document.getElementById('journal-copy');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var all = journalEntries().map(function (e) {
        return new Date(e.date).toLocaleString('en-US') + (e.prompt ? '\nPrompt: ' + e.prompt : '') + '\n\n' + e.text;
      }).join('\n\n-----\n\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(all).then(function () { toast('Copied. Paste into your Notes app or an email to yourself.'); },
          function () { toast('Couldn\'t copy on this device.'); });
      } else { toast('Couldn\'t copy on this device.'); }
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-del]'), function (b) {
      b.addEventListener('click', function () { view.querySelector('[data-confirm="' + b.getAttribute('data-del') + '"]').hidden = false; b.hidden = true; });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-del-no]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del-no');
        view.querySelector('[data-confirm="' + id + '"]').hidden = true;
        view.querySelector('[data-del="' + id + '"]').hidden = false;
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-del-yes]'), function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del-yes');
        store.set('abg.journal', journalEntries().filter(function (e) { return e.id !== id; }));
        viewJournal();
        toast('Entry deleted');
      });
    });
  }

  function viewSaved() {
    var affs = savedAffs();
    var arts = savedArts().map(articleById).filter(Boolean);
    view.innerHTML =
      '<div><h1 class="page-title">Saved</h1><p class="lede">Your favorites stay on this phone. Only you can see them.</p></div>' +
      '<h2 class="section-title">Affirmations</h2>' +
      (affs.length ? '<div class="stack">' + affs.map(function (text, i) {
        return '<div class="saved-aff"><p>' + esc(text) + '</p><button class="icon-btn" data-unsave="' + i + '" aria-label="Remove this affirmation" aria-pressed="true">' + ICON.heart.replace('class="icon"', '') + '</button></div>';
      }).join('') + '</div>' : '<p class="empty">Tap Save on today\'s affirmation to keep it here.</p>') +
      '<h2 class="section-title">Articles</h2>' +
      (arts.length ? '<div class="stack">' + arts.map(articleRow).join('') + '</div>' : '<p class="empty">Tap the heart on any article to keep it here.</p>');
    Array.prototype.forEach.call(view.querySelectorAll('[data-unsave]'), function (b) {
      b.addEventListener('click', function () {
        toggle('abg.savedAffirmations', affs[+b.getAttribute('data-unsave')]);
        viewSaved();
      });
    });
  }

  function viewHelp() {
    view.innerHTML =
      '<div><h1 class="page-title">You don\'t have to carry this alone.</h1><p class="lede">Free, 24/7, and you can stay anonymous.</p></div>' +
      '<a class="crisis primary" href="tel:988"><span class="circle">' + ICON.phone + '</span><span><span class="big" style="display:block">Call or text 988</span><span class="small">Suicide &amp; Crisis Lifeline</span></span></a>' +
      '<a class="crisis secondary" href="sms:741741"><span class="circle">' + ICON.chat + '</span><span><span class="big" style="display:block">Text HOME to 741741</span><span class="small">Crisis Text Line</span></span></a>' +
      '<a class="outline-link" href="tel:911">In danger right now? Call 911</a>' +
      '<h2 class="section-title">Find a Black therapist</h2>' +
      '<div class="stack">' +
        '<a class="row-link" href="https://therapyforblackgirls.com" target="_blank" rel="noopener"><span class="text"><span class="title">Therapy for Black Girls</span><span class="lede" style="margin:0">Directory of therapists by state</span></span>' + ICON.out + '</a>' +
        '<a class="row-link" href="https://beam.community" target="_blank" rel="noopener"><span class="text"><span class="title">BEAM</span><span class="lede" style="margin:0">Black Emotional and Mental Health Collective</span></span>' + ICON.out + '</a>' +
        '<a class="row-link" href="https://www.anxiousblackgirls.com" target="_blank" rel="noopener"><span class="text"><span class="title">Anxious Black Girls® services</span><span class="lede" style="margin:0">Workshops, community and support</span></span>' + ICON.out + '</a>' +
      '</div>' +
      '<p class="disclaimer">This app offers education and encouragement. It is not therapy and does not replace care from a licensed professional.</p>' +
      '<div class="legal-links">' +
        '<a href="https://www.anxiousblackgirls.com/medical-disclaimer" target="_blank" rel="noopener">Medical Disclaimer</a>' +
        '<a href="https://www.anxiousblackgirls.com/terms-of-use" target="_blank" rel="noopener">Terms of Use</a>' +
        '<a href="https://www.anxiousblackgirls.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>' +
      '</div>';
  }

  // ---------- router ----------
  function route() {
    var h = (location.hash || '#today').slice(1);
    var tab = 'today';
    if (h === 'learn') { tab = 'learn'; viewLearn(); }
    else if (h.indexOf('topic-') === 0) { tab = 'learn'; viewTopic(h.slice(6)); }
    else if (h.indexOf('article-') === 0) { tab = 'learn'; viewArticle(h.slice(8)); }
    else if (h === 'journal') { tab = 'journal'; viewJournal(); }
    else if (h === 'saved') { tab = 'saved'; viewSaved(); }
    else if (h === 'help') { tab = 'help'; viewHelp(); }
    else { viewToday(); }
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  // ---------- cover screen ----------
  var splash = document.getElementById('splash');
  function hideSplash() {
    if (!splash || splash.hidden) return;
    splash.classList.add('out');
    setTimeout(function () { splash.hidden = true; }, 500);
  }
  var seen = false;
  try { seen = sessionStorage.getItem('abg.cover') === '1'; sessionStorage.setItem('abg.cover', '1'); } catch (e) {}
  if (seen) { splash.hidden = true; }
  else {
    setTimeout(hideSplash, 1600);
    splash.addEventListener('click', hideSplash);
    splash.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') hideSplash(); });
  }

  // ---------- first-open welcome notice ----------
  var welcome = document.getElementById('welcome');
  if (welcome && !store.get('abg.welcomed', false)) {
    welcome.hidden = false;
    document.getElementById('welcome-ok').addEventListener('click', function () {
      store.set('abg.welcomed', true);
      welcome.hidden = true;
      view.focus();
    });
  }

  // ---------- start ----------
  Promise.all([
    fetch('content/affirmations.json').then(function (r) { return r.json(); }),
    fetch('content/articles.json').then(function (r) { return r.json(); }),
    fetch('content/journal-prompts.json').then(function (r) { return r.json(); }).catch(function () { return []; })
  ]).then(function (res) {
    AFFIRMATIONS = res[0]; DATA = res[1]; PROMPTS = res[2];
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () {
    view.innerHTML = '<p class="empty">Something didn\'t load. Check your connection and refresh. If you need help right now, call or text 988.</p>';
  });

  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }
})();
