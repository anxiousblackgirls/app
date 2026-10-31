/* Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. Unauthorized copying or reuse is prohibited. See LICENSE. */
/* Anxious Black Girls app. Content lives in /content: edit those files, not this one. */
(function () {
  'use strict';

  var view = document.getElementById('view');
  var toastEl = document.getElementById('toast');
  var AFFIRMATIONS = [];
  var PROMPTS = [];
  var ABOUT = null;
  var FAQ = [];
  var DATA = { topics: [], articles: [] };
  var SKILLS = { groups: [], skills: [] };
  var PAID = null;
  var PATHS = { needs: [], plans: [], challenges: [] };
  var GROUP_COLORS = { thinking: '#EBD3A6', traps: '#DEDDC2', dbt: '#D3B094', body: '#F0DFB8', neuro: '#E9D7C8', relationships: '#EAD9C0', rest: '#D9CFA8' };
  var articleCache = {};
  // Set only inside the iPhone and Android apps (see native.js). The website leaves it null.
  var NATIVE = (window.ABGNative && window.ABGNative.native) ? window.ABGNative : null;

  // ---------- storage (saved items stay on this phone only) ----------
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) {
      var json = JSON.stringify(v);
      try { localStorage.setItem(k, json); } catch (e) {}
      if (NATIVE) NATIVE.save(k, json);
    }
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
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((#article-[a-z0-9-]+)\)/g, '<a class="inline-link" href="$2">$1</a>');
  }
  function dayNumber() {
    var n = new Date();
    return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5);
  }
  // Saturdays and Sundays skip affirmations marked "work": true in affirmations.json.
  function affirmationFor(date, list) {
    var n = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
    var day = date.getDay();
    var pick = list[n % list.length];
    if ((day === 0 || day === 6) && pick.work) {
      var off = list.filter(function (a) { return !a.work; });
      var near = [list[(n + list.length - 1) % list.length], list[(n + 1) % list.length]];
      for (var i = 0; i < off.length; i++) {
        var alt = off[(n + Math.floor(off.length / 2) + i) % off.length];
        if (near.indexOf(alt) === -1) return alt;
      }
    }
    return pick;
  }
  window.ABGAffirmationFor = affirmationFor;
  function topicById(id) { return DATA.topics.filter(function (t) { return t.id === id; })[0]; }
  function articleById(id) { return DATA.articles.filter(function (a) { return a.id === id; })[0]; }
  function toast(msg, ms) {
    toastEl.textContent = msg; toastEl.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.hidden = true; }, ms || 2200);
  }

  var ICON = {
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    bag: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 9V7.5a3.5 3.5 0 0 1 7 0V9"/><path class="bag-body" d="M4.6 9h14.8l-1.1 10.1a2 2 0 0 1-2 1.9H7.7a2 2 0 0 1-2-1.9z"/><path d="M10.5 13h3"/></svg>',
    spark: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    heart: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    share: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    chev: '<svg class="icon chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    out: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
    phone: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    pen: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    bell: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
    plus: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
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
  // ---------- branded share image ----------
  var SHARE_SIZES = { post: [1080, 1350], story: [1080, 1920] };
  var logoImg = null;
  function loadLogo() {
    if (logoImg) return Promise.resolve(logoImg);
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { logoImg = im; resolve(im); };
      im.onerror = reject;
      im.src = 'logo-circle.png';
    });
  }
  function wrapLines(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else { line = test; }
    });
    if (line) lines.push(line);
    return lines;
  }
  function makeShareImage(text, format, opts) {
    opts = opts || {};
    var size = SHARE_SIZES[format] || SHARE_SIZES.post, W = size[0], H = size[1];
    var fontsReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('800 80px Montserrat'), document.fonts.load('700 36px "DM Sans"')]).catch(function () {})
      : Promise.resolve();
    return Promise.all([loadLogo(), fontsReady]).then(function (res) {
      var logo = res[0];
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      var ink = '#2B2118', pad = 96;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
      // inner border
      ctx.strokeStyle = '#BB831D'; ctx.lineWidth = 6;
      ctx.strokeRect(40, 40, W - 80, H - 80);
      // logo
      var lw = format === 'story' ? 760 : 620, lh = lw * logo.height / logo.width;
      var logoY = format === 'story' ? 200 : 120;
      ctx.drawImage(logo, (W - lw) / 2, logoY, lw, lh);
      // label
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 34px "DM Sans", Arial, sans-serif';
      var labelY = logoY + lh + (format === 'story' ? 150 : 100);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
      ctx.fillStyle = '#8A5F12';
      ctx.fillText(opts.label || 'TO MY ANXIOUS BLACK GIRL,', W / 2, labelY);
      ctx.fillStyle = ink;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      // affirmation, shrink to fit
      var footerTop = H - (format === 'story' ? 340 : 290);
      var areaTop = labelY + 50, areaH = footerTop - areaTop - 40;
      var fs = format === 'story' ? 92 : 80, lines, lineH;
      do {
        ctx.font = '800 ' + fs + 'px Montserrat, Arial, sans-serif';
        lines = wrapLines(ctx, text, W - pad * 2);
        lineH = fs * 1.22;
        if (lines.length * lineH <= areaH) break;
        fs -= 4;
      } while (fs > 36);
      var startY = areaTop + (areaH - lines.length * lineH) / 2 + fs;
      lines.forEach(function (l, i) { ctx.fillText(l, W / 2, startY + i * lineH); });
      // footer
      ctx.font = '700 34px "DM Sans", Arial, sans-serif';
      ctx.fillText(opts.footer || 'Download the Anxious Black Girls\u00AE app', W / 2, footerTop + 30);
      ctx.font = '800 40px Montserrat, Arial, sans-serif';
      ctx.fillText(DOWNLOAD_TEXT, W / 2, footerTop + 86);
      ctx.strokeStyle = '#BB831D'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W / 2 - 60, footerTop + 116); ctx.lineTo(W / 2 + 60, footerTop + 116); ctx.stroke();
      ctx.fillStyle = '#8A5F12';
      ctx.font = '700 32px "DM Sans", Arial, sans-serif';
      ctx.fillText('@anxiousblackgirls  \u00B7  www.anxiousblackgirls.com', W / 2, footerTop + 162);
      ctx.fillStyle = ink;
      return new Promise(function (resolve) { c.toBlob(resolve, 'image/png'); });
    });
  }

  // article share image: looks like a page from the app, with a preview of the article
  var headerLogo = null;
  function loadHeaderLogo() {
    if (headerLogo) return Promise.resolve(headerLogo);
    return new Promise(function (resolve, reject) {
      var im = new Image();
      im.onload = function () { headerLogo = im; resolve(im); };
      im.onerror = reject;
      im.src = 'logo-header.png';
    });
  }
  function articleExcerpt(md) {
    var lines = (md || '').split('### Sources')[0].split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l && !/^(#|>)/.test(l); })
      .map(function (l) { return l.replace(/^- /, ''); });
    return lines.join(' ').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').split(/\s+/).slice(0, 160).join(' ');
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function makeArticleImage(a, format) {
    var t = topicById(a.topic) || { name: '', color: '#F0DFB8' };
    var mdP = articleCache[a.id] ? Promise.resolve(articleCache[a.id])
      : fetch(encodeURIComponent(a.id) + '.md').then(function (r) { return r.text(); }).catch(function () { return ''; });
    return mdP.then(function (md) {
      return makeCardImage({ tag: t.name, color: t.color, meta: a.minutes + ' min read', title: a.title, excerpt: articleExcerpt(md), cta: 'Read the full article in the app' }, format);
    });
  }
  function makeCardImage(card, format) {
    var size = SHARE_SIZES[format] || SHARE_SIZES.post, W = size[0], H = size[1], story = format === 'story';
    var a = { title: card.title, minutes: 0 }, t = { name: card.tag, color: card.color };
    var mdP = Promise.resolve('');
    var fontsReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('800 80px Montserrat'), document.fonts.load('700 36px "DM Sans"'), document.fonts.load('400 36px "DM Sans"')]).catch(function () {})
      : Promise.resolve();
    return Promise.all([loadHeaderLogo(), mdP, fontsReady]).then(function (res) {
      var logo = res[0], excerpt = card.excerpt;
      var c = document.createElement('canvas'); c.width = W; c.height = H;
      var ctx = c.getContext('2d'), ink = '#2B2118';
      ctx.fillStyle = '#F7F1EB'; ctx.fillRect(0, 0, W, H);
      // logo
      var lw = story ? 520 : 440, lh = lw * logo.height / logo.width, ly = story ? 120 : 64;
      ctx.drawImage(logo, (W - lw) / 2, ly, lw, lh);
      // card
      var cx = 64, cy = ly + lh + (story ? 70 : 44), cw = W - 128, ch = H - cy - (story ? 230 : 150), pad = 64;
      ctx.save(); ctx.shadowColor = 'rgba(43,33,24,0.10)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
      roundRect(ctx, cx, cy, cw, ch, 48); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.restore();
      // tags
      var x = cx + pad, y = cy + pad;
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      function pill(txt, bg) {
        ctx.font = '700 32px "DM Sans", Arial, sans-serif';
        var w = ctx.measureText(txt).width + 52;
        roundRect(ctx, x, y, w, 64, 32); ctx.fillStyle = bg; ctx.fill();
        ctx.fillStyle = ink; ctx.fillText(txt, x + 26, y + 33); x += w + 16;
      }
      pill(t.name, t.color); pill(card.meta, '#F7F1EB');
      // title
      var maxW = cw - pad * 2, fs = story ? 84 : 76, lines;
      ctx.textBaseline = 'alphabetic';
      do { ctx.font = '800 ' + fs + 'px Montserrat, Arial, sans-serif'; lines = wrapLines(ctx, a.title, maxW); if (lines.length <= 3) break; fs -= 4; } while (fs > 44);
      var ty = y + 64 + 40 + fs; ctx.fillStyle = ink;
      lines.forEach(function (l, i) { ctx.fillText(l, cx + pad, ty + i * fs * 1.12); });
      // excerpt with fade
      var btnH = 104, btnY = cy + ch - pad - btnH;
      var ey = ty + (lines.length - 1) * fs * 1.12 + (story ? 110 : 92);
      var efs = story ? 42 : 38, elh = efs * 1.5;
      ctx.font = '400 ' + efs + 'px "DM Sans", Arial, sans-serif'; ctx.fillStyle = '#4D4A45';
      var elines = wrapLines(ctx, excerpt, maxW), room = Math.floor((btnY - 50 - ey) / elh) + 1;
      elines = elines.slice(0, Math.max(0, room));
      elines.forEach(function (l, i) { ctx.fillText(l, cx + pad, ey + i * elh); });
      var fadeTop = Math.max(ey - efs, btnY - 50 - elh * 2.2);
      var g = ctx.createLinearGradient(0, fadeTop, 0, btnY - 30);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g; ctx.fillRect(cx + 4, fadeTop, cw - 8, btnY - 30 - fadeTop + 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(cx + 4, btnY - 30, cw - 8, 30);
      // button
      roundRect(ctx, cx + pad, btnY, maxW, btnH, btnH / 2); ctx.fillStyle = card.accent || '#8A5F12'; ctx.fill();
      ctx.fillStyle = card.accentText || '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 38px "DM Sans", Arial, sans-serif';
      ctx.fillText(card.cta, W / 2, btnY + btnH / 2 + 2);
      // footer
      ctx.textBaseline = 'alphabetic'; ctx.fillStyle = ink;
      var fy = cy + ch + (story ? 100 : 72);
      ctx.font = '800 38px Montserrat, Arial, sans-serif';
      ctx.fillText(DOWNLOAD_TEXT, W / 2, fy);
      ctx.fillStyle = '#8A5F12'; ctx.font = '700 30px "DM Sans", Arial, sans-serif';
      ctx.fillText('@anxiousblackgirls', W / 2, fy + 48);
      return new Promise(function (resolve) { c.toBlob(resolve, 'image/png'); });
    });
  }

  var APP_URL = 'https://app.anxiousblackgirls.com';
  // Shares from the phone app point people to the download page, which sends
  // iPhones to the App Store and Android phones to Google Play.
  var DOWNLOAD_URL = APP_URL + '/download', DOWNLOAD_TEXT = 'app.anxiousblackgirls.com/download';
  function openShareSheet(aff) {
    var caption = '"' + aff.text + '" Today\'s affirmation from Anxious Black Girls®. Download the app: ' + DOWNLOAD_TEXT;
    openSharePanel({
      heading: 'Share today\'s affirmation', imageText: aff.text, imageOpts: {},
      alt: 'Branded image of today\'s affirmation', file: 'anxious-black-girls-affirmation.png',
      caption: caption, link: DOWNLOAD_URL, linkHeading: 'Or post a link to download the app',
      sendText: function () { shareAffirmation(aff.text); }
    });
  }
  function shareArticle(a) {
    var t = topicById(a.topic) || { name: '' };
    var link = DOWNLOAD_URL;
    var caption = 'This one hit home: ' + a.title + '. Read it in the Anxious Black Girls® app.';
    openSharePanel({
      heading: 'Share this article', imageText: a.title,
      makeImage: function (format) { return makeArticleImage(a, format); },
      alt: 'Branded image with the article title', file: 'anxious-black-girls-article.png',
      caption: caption + ' ' + link, link: link, linkHeading: 'Or post a link to download the app',
      sendText: function () {
        if (navigator.share) navigator.share({ title: a.title, text: caption, url: link }).catch(function () { copy(caption + ' ' + link); });
        else copy(caption + ' ' + link);
      }
    });
  }
  function openSharePanel(o) {
    var aff = { text: o.imageText };
    var format = 'post', blob = null, url = null;
    var caption = o.caption, APP_LINK = o.link;
    var el = document.createElement('div');
    el.className = 'share-sheet';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'share-title');
    el.innerHTML =
      '<div class="share-card">' +
        '<div class="share-head"><h2 id="share-title">' + esc(o.heading) + '</h2>' +
        '<button class="icon-btn" id="share-close" aria-label="Close">' + ICON.close + '</button></div>' +
        '<div class="share-toggle" role="group" aria-label="Image size">' +
          '<button class="btn small" data-format="post" aria-pressed="true">Feed post</button>' +
          '<button class="btn small" data-format="story" aria-pressed="false">Story &amp; TikTok</button>' +
        '</div>' +
        '<div class="share-preview"><img id="share-img" alt="' + esc(o.alt) + '"></div>' +
        '<button id="share-go" class="btn dark">' + ICON.share + 'Share image</button>' +
        '<a id="share-save" class="btn" download="' + esc(o.file) + '" hidden>Save image</a>' +
        '<p class="mind-note">Tap the button above, then choose Instagram, TikTok, Messages, or Save Image.</p>' +
        '<h3 class="share-sub">' + esc(o.linkHeading) + '</h3>' +
        '<div class="social-share">' +
          '<a class="btn small" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(APP_LINK) + '">Facebook</a>' +
          '<a class="btn small" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + encodeURIComponent(caption) + '">X</a>' +
          '<a class="btn small" target="_blank" rel="noopener" href="https://www.threads.net/intent/post?text=' + encodeURIComponent(caption) + '">Threads</a>' +
          '<a class="btn small" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(caption) + '">WhatsApp</a>' +
          '<a class="btn small" target="_blank" rel="noopener" href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(APP_LINK) + '">LinkedIn</a>' +
        '</div>' +
        '<button id="share-text" class="btn">Copy or send as text</button>' +
        '<button id="share-done" class="btn share-done">Close</button>' +
      '</div>';
    document.body.appendChild(el);
    var img = el.querySelector('#share-img');
    function close() { window.removeEventListener('hashchange', close); if (url) URL.revokeObjectURL(url); el.parentNode && el.parentNode.removeChild(el); }
    window.addEventListener('hashchange', close);
    function render() {
      img.removeAttribute('src');
      (o.makeImage ? o.makeImage(format) : makeShareImage(aff.text, format, o.imageOpts)).then(function (b) {
        blob = b;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(b);
        img.src = url;
        el.querySelector('#share-save').href = url;
      }).catch(function () { toast('Couldn\'t make the image. Try Share as text.'); });
    }
    function canShareFile() {
      if (!blob || !navigator.canShare) return false;
      try { return navigator.canShare({ files: [new File([blob], 'affirmation.png', { type: 'image/png' })] }); } catch (e) { return false; }
    }
    el.querySelector('#share-close').addEventListener('click', close);
    el.querySelector('#share-done').addEventListener('click', close);
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-format]'), function (b) {
      b.addEventListener('click', function () {
        format = b.getAttribute('data-format');
        Array.prototype.forEach.call(el.querySelectorAll('[data-format]'), function (x) { x.setAttribute('aria-pressed', x === b); });
        render();
      });
    });
    el.querySelector('#share-go').addEventListener('click', function () {
      if (!blob) return;
      if (NATIVE) { NATIVE.shareImage(blob, caption); return; }
      if (canShareFile()) {
        var file = new File([blob], o.file, { type: 'image/png' });
        navigator.share({ files: [file], text: caption }).catch(function () {});
      } else {
        el.querySelector('#share-save').hidden = false;
        toast('Tap "Save image," then post it from your photos.');
      }
    });
    el.querySelector('#share-text').addEventListener('click', o.sendText);
    render();
    el.querySelector('#share-close').focus();
  }

  function shareAffirmation(text) {
    var msg = '"' + text + '" Today\'s affirmation from Anxious Black Girls®. Download the app: ' + DOWNLOAD_TEXT;
    if (NATIVE) { NATIVE.shareText(msg); return; }
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
      '<span class="text"><span class="meta">Article · ' + esc(t.name) + ' · ' + a.minutes + ' min' + (isLocked(a) ? ' <span class="plus-tag">Plus</span>' : '') + '</span>' +
      '<span class="title">' + esc(a.title) + '</span></span>' + ICON.chev + '</a>';
  }

  // ---------- page navigation ----------
  function navBar(href, label, right) {
    return '<div class="page-nav"><a class="back-link" href="' + href + '">' + ICON.back + '<span>' + esc(label) + '</span></a>' + (right || '') + '</div>';
  }
  function saveArticleBtn(idAttr, on) {
    return '<button id="' + idAttr + '" class="btn save-btn" aria-pressed="' + on + '">' + ICON.heart + '<span>' + (on ? 'Saved' : 'Save article') + '</span></button>';
  }

  // ---------- Greeting on Today (owner: let people choose; saved only on this phone) ----------
  function greetingPrefs() { var g = store.get('abg.greeting', null); return g && typeof g === 'object' ? g : { style: 'classic', name: '' }; }
  function timeOfDay(d) { var h = (d || new Date()).getHours(); return h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : h >= 17 && h < 21 ? 'Good evening' : 'Good night'; }
  function greetingText(g, d) {
    g = g || greetingPrefs();
    var name = String(g.name || '').trim();
    if (g.style === 'time') return timeOfDay(d) + (name ? ', ' + name : '') + ',';
    return 'To My Anxious Black Girl,';
  }
  function viewGreeting() {
    var g = greetingPrefs();
    view.innerHTML = navBar('#today', 'Back to Today') +
      '<div><h1 class="page-title">Your greeting</h1><p class="lede">Choose how the app says hello on the Today page. Your name stays on this phone.</p></div>' +
      '<div class="greet-options" role="radiogroup" aria-label="Greeting style">' +
        '<button class="greet-opt" role="radio" data-style="classic"><span class="greet-preview">To My Anxious Black Girl,</span><span class="greet-desc">The classic</span></button>' +
        '<button class="greet-opt" role="radio" data-style="time"><span class="greet-preview" id="greet-time-preview"></span><span class="greet-desc">Changes with the time of day: morning, afternoon, evening and night</span></button>' +
      '</div>' +
      '<div class="greet-name" id="greet-name-box"><label for="greet-name">What should we call you?</label>' +
        '<input id="greet-name" type="text" maxlength="30" autocomplete="given-name" autocapitalize="words" placeholder="Your first name or nickname" value="' + esc(g.name || '') + '">' +
        '<p class="greet-hint">Optional. Leave it blank and we\'ll just say "Good morning."</p></div>' +
      '<button id="greet-save" class="btn dark" style="width:100%">Save my greeting</button>';
    var style = g.style === 'time' ? 'time' : 'classic';
    var nameEl = document.getElementById('greet-name');
    function paint() {
      document.getElementById('greet-time-preview').textContent = greetingText({ style: 'time', name: nameEl.value });
      Array.prototype.forEach.call(view.querySelectorAll('.greet-opt'), function (b) { b.setAttribute('aria-checked', b.getAttribute('data-style') === style); });
      document.getElementById('greet-name-box').hidden = style !== 'time';
    }
    Array.prototype.forEach.call(view.querySelectorAll('.greet-opt'), function (b) {
      b.addEventListener('click', function () { style = b.getAttribute('data-style'); paint(); if (style === 'time') nameEl.focus(); });
    });
    nameEl.addEventListener('input', paint);
    paint();
    document.getElementById('greet-save').addEventListener('click', function () {
      store.set('abg.greeting', { style: style, name: nameEl.value.trim().slice(0, 30) });
      location.hash = '#today';
      toast('Greeting saved');
    });
  }

  function viewToday() {
    var n = dayNumber();
    var aff = affirmationFor(new Date(), AFFIRMATIONS);
    var art = DATA.articles[n % DATA.articles.length];
    var hello = esc(greetingText());
    var date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    var isSaved = savedAffs().indexOf(aff.text) !== -1;
    view.innerHTML =
      '<div><div class="date">' + esc(date) + '</div><h1 class="greeting">' + hello + ' <a class="greeting-edit" href="#greeting" aria-label="Change your greeting">' + ICON.pencil + '</a></h1>' +
        (daysWithUs() >= 2 ? '<p class="days-with-us">' + ICON.spark + 'You\'ve shown up for yourself for ' + daysWithUs() + ' days</p>' : '') + '</div>' +
      '<section class="affirmation" aria-label="Today\'s affirmation">' +
        '<span class="eyebrow">Today\'s affirmation</span>' +
        '<blockquote>' + esc(aff.text) + '</blockquote>' +
        '<p>' + esc(aff.note) + '</p>' +
        '<div class="actions">' +
          '<button id="save-aff" class="btn solid" aria-pressed="' + isSaved + '">' + ICON.heart + '<span>' + (isSaved ? 'Saved' : 'Save') + '</span></button>' +
          '<button id="share-aff" class="btn">' + ICON.share + 'Share</button>' +
        '</div>' +
      '</section>' +
      needsCard() +
      (function () { var vids = SKILLS.skills.filter(function (x) { return x.video; }); if (!vids.length) return '';
        var k = vids[n % vids.length];
        return '<section class="sotd"><span class="eyebrow">Today\'s skill</span>' +
          '<h2 class="sotd-title">' + esc(k.name) + '</h2><p class="sotd-when">' + esc(k.when) + '</p>' +
          '<button class="sotd-video" id="sotd-play" data-src="' + esc(k.video) + '" aria-label="Play the video for ' + esc(k.name) + '">' +
            '<img src="' + esc(k.video.replace(/\.mp4$/, '.jpg')) + '" alt="">' +
            '<span class="sotd-play">' + ICON.play + '</span><span class="sotd-watch">Watch · about 30 seconds</span></button>' +
          '<a class="btn dark sotd-more" href="#skill-' + esc(k.id) + '">Learn more and practice this skill</a>' +
          '<a class="text-link sotd-all" href="#pocketbook">See all ' + SKILLS.skills.length + ' skills in the Pocketbook</a></section>'; })() +

      homeWorkSection();

    document.getElementById('save-aff').addEventListener('click', function () {
      var on = toggle('abg.savedAffirmations', aff.text);
      this.setAttribute('aria-pressed', on);
      this.querySelector('span').textContent = on ? 'Saved' : 'Save';
      toast(on ? 'Saved to your favorites' : 'Removed from favorites');
      if (on) setTimeout(maybeAskForRating, 2500);
    });
    document.getElementById('share-aff').addEventListener('click', function () { openShareSheet(aff); });
    wireNeeds();
    var sp = document.getElementById('sotd-play');
    if (sp) sp.addEventListener('click', function () {
      var v = document.createElement('video'); v.src = sp.getAttribute('data-src'); v.controls = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.className = 'sotd-player';
      sp.parentNode.replaceChild(v, sp); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    });
    wirePlanRemove(viewToday);
  }

  function viewLearn(mode) {
    mode = ['plans', 'challenges', 'skills', 'articles'].indexOf(mode) !== -1 ? mode : 'subject';
    var opts = [['subject', 'Subject'], ['plans', 'Plans'], ['challenges', 'Challenges'], ['skills', 'Skills'], ['articles', 'Articles']];
    view.innerHTML =
      navBar('#today', 'Home') +
      '<div><h1 class="page-title">Learn</h1><p class="lede">What would you like to learn about today? Pick a subject to see the plans, skills and articles that go with it, or browse one kind at a time.</p></div>' +
      '<label class="search" for="search-input">' +
        '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<span class="sr">Search</span><input id="search-input" type="search" placeholder="Search plans, skills and articles" autocomplete="off"></label>' +
      '<section class="learn-card"><label class="filter-label" for="browse-by">Browse by</label>' +
        '<div class="select-wrap"><select id="browse-by">' + opts.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === mode ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + ICON.chev + '</div>' +
      '</section>' +
      '<div id="learn-body" class="learn-body"></div>' + ideaLink('learn', 'Don\'t see a topic you need?');
    var body = document.getElementById('learn-body');
    body.innerHTML = learnBody(mode); wireLearnSub(mode);
    document.getElementById('browse-by').addEventListener('change', function () {
      location.hash = this.value === 'subject' ? '#learn' : '#learn-' + this.value;
    });
    document.getElementById('search-input').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      if (!q) { body.innerHTML = learnBody(mode); wireLearnSub(mode); return; }
      var ps = allPaths().filter(function (p) { return (p.title + ' ' + p.tagline).toLowerCase().indexOf(q) !== -1; });
      var ks = SKILLS.skills.filter(function (k) { return (k.name + ' ' + k.when).toLowerCase().indexOf(q) !== -1; });
      var as = DATA.articles.filter(function (a) { var t = topicById(a.topic); return (a.title + ' ' + (t ? t.name : '')).toLowerCase().indexOf(q) !== -1; });
      body.innerHTML = (ps.length + ks.length + as.length)
        ? (ps.length ? '<section class="stack"><h2 class="section-title">Plans and challenges</h2><div class="plan-grid">' + ps.filter(notFinished).map(planCard).join('') + '</div></section>' : '') +
          (ks.length ? '<section class="stack"><h2 class="section-title">Skills</h2>' + ks.map(skillRow).join('') + '</section>' : '') +
          (as.length ? '<section class="stack"><h2 class="section-title">Articles</h2>' + as.map(articleRow).join('') + '</section>' : '')
        : '<p class="empty">Nothing matches "' + esc(q) + '" yet.</p>';
    });
  }

  function viewTopic(id) {
    var t = topicById(id);
    if (!t) { location.hash = '#learn'; return; }
    var list = DATA.articles.filter(function (a) { return a.topic === id; });
    var ps = allPaths().filter(function (p) { return p.topics.indexOf(id) !== -1; });
    var ks = SKILLS.skills.filter(function (k) { return k.topics.indexOf(id) !== -1; });
    view.innerHTML =
      navBar('#learn', 'Back to Learn') +
      '<div class="topic-head" style="background:' + esc(t.color) + '"><h1 class="page-title">' + esc(t.name) + '</h1><p class="lede">' + esc(t.blurb) + '</p></div>' +
      (ps.length ? '<section class="stack"><h2 class="section-title">Plans and challenges</h2><div class="plan-grid">' + ps.filter(notFinished).map(planCard).join('') + '</div></section>' : '') +
      '<section class="stack"><h2 class="section-title">Articles</h2>' + list.map(articleRow).join('') + '</section>' +
      (ks.length ? '<section class="stack"><h2 class="section-title">Skills that help</h2>' + ks.slice(0, 6).map(skillRow).join('') +
        (ks.length > 6 ? '<details class="more-skills"><summary class="btn">See all ' + ks.length + ' skills</summary><div class="stack">' + ks.slice(6).map(skillRow).join('') + '</div></details>' : '') + '</section>' : '');
  }

  function setupListen() {
    var au = document.getElementById('listen-audio'), btn = document.getElementById('listen-btn'),
      bar = document.getElementById('listen-bar'), time = document.getElementById('listen-time');
    function fmt(x) { x = Math.max(0, Math.floor(x || 0)); return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2); }
    function show() {
      var d = au.duration || 0;
      time.textContent = fmt(au.currentTime) + (d ? ' / ' + fmt(d) : '');
      if (d && !bar.dragging) bar.value = (au.currentTime / d) * 100;
    }
    function setBtn(playing) { btn.innerHTML = playing ? ICON.pause : ICON.play; btn.setAttribute('aria-label', playing ? 'Pause' : 'Play this article'); }
    btn.addEventListener('click', function () { if (au.paused) au.play(); else au.pause(); });
    au.addEventListener('play', function () { setBtn(true); });
    au.addEventListener('pause', function () { setBtn(false); });
    au.addEventListener('ended', function () { setBtn(false); });
    au.addEventListener('timeupdate', show);
    au.addEventListener('loadedmetadata', show);
    bar.addEventListener('input', function () { bar.dragging = true; if (au.duration) time.textContent = fmt(bar.value / 100 * au.duration) + ' / ' + fmt(au.duration); });
    bar.addEventListener('change', function () { bar.dragging = false; if (au.duration) au.currentTime = bar.value / 100 * au.duration; });
    window.addEventListener('hashchange', function stop() { au.pause(); window.removeEventListener('hashchange', stop); });
  }

  function reportIssue(kind, title, hash) {
    var subject = 'App issue: ' + title;
    var body = 'Page: ' + APP_URL + '/' + hash + '\n\nWhat happened:\n';
    return '<section class="report-issue"><span class="report-icon" aria-hidden="true">!</span><div>' +
      '<strong>Need to report an issue with the app?</strong>' +
      '<p>If something on this ' + kind + ' isn\'t working or looks wrong, email us at ' +
      '<a href="mailto:support@anxiousblackgirls.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body) + '">support@anxiousblackgirls.com</a>. ' +
      'This inbox isn\'t for emergencies. If you\'re in crisis, call 911 or call/text 988.</p></div></section>';
  }

  function viewArticle(id) {
    var a = articleById(id);
    if (!a) { location.hash = '#learn'; return; }
    var t = topicById(a.topic) || { name: '', color: '#F0DFB8', id: '' };
    var isSaved = savedArts().indexOf(id) !== -1;
    var locked = isLocked(a), audioLocked = !!(a.audio && (locked || (PAID && PAID.enabled && PAID.lockAudio && !hasPlus())));
    view.innerHTML =
      navBar(esc(planBack('#topic-' + t.id, 'Back to ' + t.name).href), planBack('#topic-' + t.id, 'Back to ' + t.name).label, '<div class="nav-actions"><button id="share-art-top" class="btn icon-only" aria-label="Share this article">' + ICON.share + '</button>' + saveArticleBtn('save-art-top', isSaved) + '</div>') +
      '<article class="prose"><div class="tags"><span class="tag" style="background:' + esc(t.color) + '">' + esc(t.name) + '</span><span class="tag" style="background:var(--bg)">' + a.minutes + ' min read</span></div>' +
      '<h1>' + esc(a.title) + '</h1>' +
      (audioLocked ? '<a class="listen" href="#plus"><span class="listen-btn" aria-hidden="true">' + ICON.lock + '</span><span class="listen-info"><span class="listen-title">Listen with ' + esc(PAID.name) + '</span></span></a>' :
       a.audio ? '<div class="listen" id="listen"><button class="listen-btn" id="listen-btn" type="button" aria-label="Play this article">' + ICON.play + '</button>' +
        '<div class="listen-info"><span class="listen-title">Listen to this article</span>' +
        '<input class="listen-bar" id="listen-bar" type="range" min="0" max="100" value="0" step="0.1" aria-label="Playback position">' +
        '<span class="listen-time" id="listen-time">0:00</span></div>' +
        '<audio id="listen-audio" preload="metadata" src="' + esc(a.audio) + '"></audio></div>' : '') +
      '<div id="article-body" class="stack" style="gap:14px"><p>Loading…</p></div></article>' +
      (function () { var ks = skillsForTopic(a.topic, 3, DATA.articles.indexOf(a));
        return ks.length ? '<section class="practice-panel"><span class="skill-hero-label">' + ICON.bag + 'From the Pocketbook</span><h2 class="section-title">Now practice it</h2><p class="section-note" style="margin:0">Short skills to try today, and to keep in your pocketbook for next time.</p><div class="stack">' + ks.map(skillRow).join('') + '</div><a class="text-link" href="#pocketbook">Open the Pocketbook</a></section>' : ''; })() +
      (NATIVE && ['adhd', 'audhd', 'autism'].indexOf(t.id) !== -1 ? '<a class="row-link reminders-link" href="#reminders"><span class="badge" style="background:var(--gold-soft)">' + ICON.bell + '</span><span class="text"><span class="title">Set a reminder for this</span><span class="lede" style="margin:0">Meds, meals, starting tasks: let your phone hold it for you</span></span>' + ICON.chev + '</a>' : '') +
      '<div class="article-end">' + saveArticleBtn('save-art-bottom', isSaved) +
        '<button id="share-art-bottom" class="btn save-btn">' + ICON.share + 'Share</button>' +
        '<a class="btn" href="#topic-' + esc(t.id) + '">More on ' + esc(t.name) + '</a>' +
        '<a class="btn" href="#today">Home</a></div>' +
      '<a class="crisis primary" href="#help"><span class="text"><span class="big" style="display:block">Find support</span><span class="small">Crisis lines and Black therapist directories</span></span></a>' +
      '<p class="disclaimer"><strong>Disclaimer:</strong> This is education, not a diagnosis or medical advice. Talk with a licensed professional about your own health.</p>' +
      reportIssue('article', a.title, '#article-' + a.id) +
      '<p class="copyright">© 2026 Anxious Black Girls, LLC. All rights reserved.</p>';
    ['share-art-top', 'share-art-bottom'].forEach(function (sid) {
      document.getElementById(sid).addEventListener('click', function () { shareArticle(a); });
    });
    var saveBtns = [document.getElementById('save-art-top'), document.getElementById('save-art-bottom')];
    saveBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = toggle('abg.savedArticles', id);
        saveBtns.forEach(function (b) {
          b.setAttribute('aria-pressed', on);
          b.querySelector('span').textContent = on ? 'Saved' : 'Save article';
        });
        toast(on ? 'Saved. Find it anytime in the Saved tab.' : 'Removed from Saved');
      });
    });
    if (a.audio && !audioLocked) setupListen();
    var bodyEl = document.getElementById('article-body');
    function fill(md) {
      if (!locked) { bodyEl.innerHTML = renderMarkdown(md); return; }
      var tmp = document.createElement('div'); tmp.innerHTML = renderMarkdown(md);
      var ps = Array.prototype.filter.call(tmp.children, function (el) { return el.tagName === 'P'; }).slice(0, 2);
      bodyEl.innerHTML = '<div class="plus-preview">' + ps.map(function (p) { return p.outerHTML; }).join('') + '</div>' + plusLockCard('article');
    }
    if (articleCache[id]) { fill(articleCache[id]); return; }
    fetch(encodeURIComponent(id) + '.md')
      .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (md) { articleCache[id] = md; if (location.hash === '#article-' + id) fill(md); })
      .catch(function () { bodyEl.innerHTML = '<p>This article didn\'t load. Check your connection and try again.</p>'; });
  }

  // ---------- journal (entries never leave this phone) ----------
  var CRISIS_WORDS = /\b(suicid\w*|kill (my ?self|me)|end (it all|my life)|want to die|wanna die|don'?t want to (be here|live|wake up)|no reason to live|better off without me|hurt(ing)? myself|cut(ting)? myself|self[- ]?harm\w*|overdose|take all (my|the) pills)\b/i;

  function journalEntries() { return store.get('abg.journal', []); }

  // Full-screen pause shown once per journal visit when crisis words appear. Runs only on this phone.
  var pauseShownThisVisit = false;
  function showPause(onContinue) {
    if (document.getElementById('crisis-pause')) return;
    pauseShownThisVisit = true;
    var el = document.createElement('div');
    el.id = 'crisis-pause';
    el.className = 'pause';
    el.setAttribute('role', 'alertdialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'pause-title');
    el.innerHTML =
      '<div class="pause-card">' +
        '<h2 id="pause-title" tabindex="-1">You don\'t have to carry this alone.</h2>' +
        '<p>It sounds like you may be going through something really heavy right now. Please reach out for support.</p>' +
        '<div class="pause-actions">' +
          '<a class="crisis primary" href="tel:911"><span class="circle">' + ICON.phone + '</span><span><span class="big" style="display:block">Call 911</span><span class="small">If you are in danger right now</span></span></a>' +
          '<a class="crisis primary" href="tel:988"><span class="circle">' + ICON.phone + '</span><span><span class="big" style="display:block">Call or text 988</span><span class="small">Suicide &amp; Crisis Lifeline, 24/7</span></span></a>' +
          '<a class="crisis secondary" href="sms:741741"><span class="circle">' + ICON.chat + '</span><span><span class="big" style="display:block">Text HOME to 741741</span><span class="small">Crisis Text Line, 24/7</span></span></a>' +
        '</div>' +
        '<div class="pause-notice">' +
          '<strong>Disclaimer: This app is not monitored.</strong> No one at Anxious Black Girls® can see what you write, respond to it, or send help. If you are in danger or thinking about ending your life, contact one of the resources above now.' +
        '</div>' +
        '<p class="pause-legal">Anxious Black Girls® provides education and self-reflection tools only. This app is not a crisis service and does not provide medical advice, diagnosis, or treatment. It does not replace care from a licensed professional. Use of this app is subject to our Terms of Use, Privacy Policy, and Medical Disclaimer.</p>' +
        '<button id="pause-continue" class="btn">I\'m safe right now. Keep writing.</button>' +
      '</div>';
    document.body.appendChild(el);
    document.getElementById('pause-title').focus();
    document.getElementById('pause-continue').addEventListener('click', function () {
      el.parentNode.removeChild(el);
      if (onContinue) onContinue();
    });
  }

  function crisisBanner() {
    return '<section class="crisis-banner" role="alert">' +
      '<strong>You don\'t have to go through this alone.</strong>' +
      '<p>If you\'re thinking about hurting yourself or ending your life, reach out right now. Call <strong>911</strong> or call/text <strong>988</strong>. You can also text <strong>HOME</strong> to <strong>741741</strong>.</p>' +
      '<a class="btn solid" href="#help">See all help options</a></section>';
  }

  function viewJournal() {
    var prompt = PROMPTS.length ? PROMPTS[dayNumber() % PROMPTS.length] : '';
    var entries = journalEntries();
    var draft = store.get('abg.journalDraft', '');
    view.innerHTML =
      navBar('#today', 'Home') +
      '<div><h1 class="page-title">Journal</h1><p class="lede">Your entries stay on this phone. No one else can read them, including Anxious Black Girls®.</p></div>' +
      '<section class="journal-card">' +
        '<div class="share-toggle mode-toggle" role="group" aria-label="How do you want to write?">' +
          '<button class="btn small" data-mode="prompt" aria-pressed="true">Today\'s prompt</button>' +
          '<button class="btn small" data-mode="free" aria-pressed="false">Free write</button>' +
        '</div>' +
        '<div id="mode-prompt"><span class="eyebrow">Today\'s prompt</span>' +
        '<p class="prompt">' + esc(prompt) + '</p></div>' +
        '<div id="mode-free" hidden><span class="eyebrow">Free write</span>' +
        '<p class="prompt">No prompt needed. Write whatever is on your mind.</p></div>' +
        '<label class="sr" for="journal-text">Write your entry</label>' +
        '<textarea id="journal-text" rows="7" placeholder="Write as much or as little as you want…">' + esc(draft) + '</textarea>' +
        '<div class="actions"><button id="journal-save" class="btn dark">Save entry</button></div>' +
      '</section>' +
      '<div id="journal-alert"></div>' +
      '<p class="disclaimer"><strong>Disclaimer:</strong> This journal is private and not monitored. If you\'re in crisis, call 911 or call/text 988. Deleting the app or clearing your browser data erases your entries, so use "Copy all entries" to keep a backup.</p>' +
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
    function check(fromTyping) {
      var hit = CRISIS_WORDS.test(ta.value);
      alertBox.innerHTML = hit ? crisisBanner() : '';
      if (hit && fromTyping && !pauseShownThisVisit) {
        ta.blur();
        showPause(function () { ta.focus(); });
      }
    }
    ta.addEventListener('input', function () { store.set('abg.journalDraft', ta.value); check(true); });
    check();
    function setMode(mode, focus) {
      usePrompt = mode !== 'free';
      store.set('abg.journalMode', usePrompt ? 'prompt' : 'free');
      document.getElementById('mode-prompt').hidden = !usePrompt;
      document.getElementById('mode-free').hidden = usePrompt;
      ta.placeholder = usePrompt ? 'Write as much or as little as you want…' : 'Start anywhere. This space is yours.';
      Array.prototype.forEach.call(view.querySelectorAll('[data-mode]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-mode') === (usePrompt ? 'prompt' : 'free'));
      });
      if (focus) ta.focus();
    }
    Array.prototype.forEach.call(view.querySelectorAll('[data-mode]'), function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode'), true); });
    });
    setMode(store.get('abg.journalMode', 'prompt'));
    document.getElementById('journal-save').addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) { toast('Write something first, then tap Save.'); ta.focus(); return; }
      var list = journalEntries();
      list.unshift({ id: String(Date.now()), date: new Date().toISOString(), prompt: usePrompt ? prompt : '', text: text });
      store.set('abg.journal', list);
      store.set('abg.journalDraft', '');
      var flagged = CRISIS_WORDS.test(text);
      viewJournal();
      if (flagged) {
        document.getElementById('journal-alert').innerHTML = crisisBanner();
        if (!pauseShownThisVisit) showPause();
      }
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

  // ---------- FAQ (content lives in faq.json) ----------
  function viewFaq() {
    view.innerHTML =
      navBar('#help', 'Back to Help') +
      '<div><h1 class="page-title">Frequently asked questions</h1><p class="lede">Tap a question to see the answer.</p></div>' +
      '<div class="stack">' + FAQ.map(function (f) {
        var a = esc(f.a).replace('support@anxiousblackgirls.com', '<a href="mailto:support@anxiousblackgirls.com">support@anxiousblackgirls.com</a>').replace(/\[([^\]]+)\]\((#[a-z0-9-]+)\)/g, '<a class="inline-link" href="$2">$1</a>');
        return '<details class="faq"><summary>' + esc(f.q) + ICON.chev + '</summary><p>' + a + '</p></details>';
      }).join('') + '</div>' +
      '<section class="mind-card"><h2 class="section-title">Still have a question?</h2>' +
        '<p class="mind-note" style="font-size:15px">Email us at <a href="mailto:support@anxiousblackgirls.com">support@anxiousblackgirls.com</a>. This inbox isn\'t monitored for emergencies. If you\'re in crisis, call 911 or call/text 988.</p></section>';
  }

  // ---------- about / resources (content lives in about.json) ----------
  function viewAbout() {
    var a = ABOUT;
    if (!a) {
      view.innerHTML = navBar('#today', 'Home') + '<div><h1 class="page-title">About Anxious Black Girls®</h1></div>' +
        '<a class="row-link" href="https://www.anxiousblackgirls.com" target="_blank" rel="noopener"><span class="text"><span class="title">Visit anxiousblackgirls.com</span></span>' + ICON.out + '</a>';
      return;
    }
    function outRow(o) {
      return '<a class="row-link" href="' + esc(o.url) + '" target="_blank" rel="noopener"><span class="text"><span class="title">' + esc(o.name) + '</span>' +
        (o.blurb ? '<span class="lede" style="margin:0">' + esc(o.blurb) + '</span>' : '') + '</span>' + ICON.out + '</a>';
    }
    view.innerHTML =
      navBar('#today', 'Home') +
      '<div><h1 class="page-title">' + esc(a.title) + '</h1>' +
        '<p class="about-tagline">' + esc(a.tagline) + '</p></div>' +
      (a.founder && a.founder.hero ? '<img class="about-hero-photo" src="' + esc(a.founder.hero) + '" alt="' + esc(a.founder.name) + ', founder of Anxious Black Girls®">' : '') +
      '<p class="about-intro">' + esc(a.intro) + '</p>' +
      (a.founder ? '<section class="founder-card">' +
        '<div class="founder-head">' + (a.founder.photo ? '<img class="founder-photo" src="' + esc(a.founder.photo) + '" alt="' + esc(a.founder.name) + '" width="88" height="88">' : '') +
          '<div><span class="meta">Meet the founder</span><h2 class="founder-name">' + esc(a.founder.name) + '</h2></div></div>' +
        '<p class="founder-bio">' + esc(a.founder.bio || a.founder.blurb) + '</p>' +
        '<a class="text-link" href="' + esc(a.founder.url) + '" target="_blank" rel="noopener">More about Deseray</a>' +
        (a.playlist ? '<a class="playlist-inline" href="' + esc(a.playlist.url) + '" target="_blank" rel="noopener">' +
          '<span class="playlist-icon" aria-hidden="true">' + ICON.music + '</span>' +
          '<span class="text"><span class="title">' + esc(a.playlist.heading || 'Listen to the playlist') + '</span>' +
          '<span class="lede" style="margin:0">' + esc(a.playlist.note || a.playlist.blurb) + '</span></span>' + ICON.out + '</a>' : '') +
      '</section>' : '') +
      '<h2 class="section-title">What we offer</h2>' +
      '<div class="stack">' + (a.offerings || []).map(outRow).join('') + '</div>' +
      friendCard('friend-about') +
      '<h2 class="section-title">Follow us</h2>' +
      '<div class="social-row">' + (a.social || []).map(function (s) {
        return '<a class="btn" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a>';
      }).join('') + '</div>' +
      '<h2 class="section-title">Get in touch</h2>' +
      '<div class="stack">' +
        '<a class="row-link" href="' + esc(a.contact.url) + '" target="_blank" rel="noopener"><span class="text"><span class="title">Contact us</span><span class="lede" style="margin:0">' + esc(a.contact.email) + '</span></span>' + ICON.out + '</a>' +
        '<a class="row-link" href="' + esc(a.website) + '" target="_blank" rel="noopener"><span class="text"><span class="title">Visit anxiousblackgirls.com</span></span>' + ICON.out + '</a>' +
      '</div>' +
      '<p class="disclaimer">This app offers education and encouragement. It is not therapy. If you\'re in crisis, call 911 or call/text 988.</p>' +
      '<div class="legal-links">' +
        '<a href="https://www.anxiousblackgirls.com/medical-disclaimer" target="_blank" rel="noopener">Medical Disclaimer</a>' +
        '<a href="https://www.anxiousblackgirls.com/terms-of-use" target="_blank" rel="noopener">Terms of Use</a>' +
        '<a href="https://www.anxiousblackgirls.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>' +
      '</div>' +
      '<p class="copyright">© 2026 Anxious Black Girls, LLC. All rights reserved.</p>';
    wireFriend('friend-about');
  }

  // Every saved practice from every skill, newest first (Saved tab)
  function allPractices() {
    var out = [];
    SKILLS.skills.forEach(function (k) { practiceList(k).forEach(function (e) { out.push({ k: k, e: e }); }); });
    return out.sort(function (a, b) { return a.e.date < b.e.date ? 1 : -1; });
  }
  function savedPracticesSection() {
    var list = allPractices();
    function fmt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    return '<h2 class="section-title">My practices</h2>' +
      (list.length ? '<div class="stack">' + list.map(function (p) {
        return '<a class="row-link" href="#practice-' + esc(p.k.id) + '--' + esc(p.e.id) + '"><span class="badge skill-badge">' + ICON.pencil.replace('<svg ', '<svg class="icon" ') + '</span>' +
          '<span class="text"><span class="meta skill-meta">Practice · ' + esc(fmt(p.e.date)) + '</span><span class="title">' + esc(p.k.name) + '</span></span>' + ICON.chev + '</a>';
      }).join('') + '</div>' : '<p class="empty">When you work through a skill and tap "Save this practice," it shows up here so you can look back on it.</p>');
  }
  function wireSavedPractices() {
    function sel(attr, key) { return view.querySelector('[' + attr + '="' + key + '"]'); }
    Array.prototype.forEach.call(view.querySelectorAll('[data-spdel]'), function (b) {
      b.addEventListener('click', function () { sel('data-spconfirm', b.getAttribute('data-spdel')).hidden = false; b.hidden = true; });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-spdel-no]'), function (b) {
      b.addEventListener('click', function () { var key = b.getAttribute('data-spdel-no'); sel('data-spconfirm', key).hidden = true; sel('data-spdel', key).hidden = false; });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-spdel-yes]'), function (b) {
      b.addEventListener('click', function () {
        var parts = b.getAttribute('data-spdel-yes').split('|'), k = skillById(parts[0]);
        if (k) store.set('abg.practice.' + k.id, practiceList(k).filter(function (e) { return e.id !== parts[1]; }));
        viewSaved(); toast('Practice deleted');
      });
    });
  }

  function viewSaved() {
    var affs = savedAffs();
    var arts = savedArts().map(articleById).filter(Boolean);
    view.innerHTML =
      navBar('#today', 'Home') +
      '<div><h1 class="page-title">Saved</h1><p class="lede">Your favorites stay on this phone. Only you can see them.</p></div>' +
      '<h2 class="section-title">My plans and challenges</h2>' +
      (function () { var act = activePlans(), fin = finishedPlans();
        if (!act.length && !fin.length) return '<p class="empty">Plans and challenges you start will show up here. <a class="inline-link" href="#plans">Find one</a></p>';
        return (act.length ? inProgressSection(act) : '<p class="empty">Nothing in progress right now. <a class="inline-link" href="#plans">Start a new one</a></p>') +
          (fin.length ? '<details class="completed"><summary><span class="section-title">Completed</span><span class="completed-count">' + fin.length + '</span>' + ICON.chev + '</summary><div class="stack">' + fin.map(completedRow).join('') + '</div></details>' : ''); })() +
      '<h2 class="section-title">Affirmations</h2>' +
      (affs.length ? '<div class="stack">' + affs.map(function (text, i) {
        return '<div class="saved-aff"><p>' + esc(text) + '</p><button class="icon-btn" data-unsave="' + i + '" aria-label="Remove this affirmation" aria-pressed="true">' + ICON.heart.replace('class="icon"', '') + '</button></div>';
      }).join('') + '</div>' : '<p class="empty">Tap Save on today\'s affirmation to keep it here.</p>') +
      '<h2 class="section-title">Articles</h2>' +
      (arts.length ? '<div class="stack">' + arts.map(articleRow).join('') + '</div>' : '<p class="empty">Tap "Save article" on any article to keep it here.</p>') +
      '<h2 class="section-title">My pocketbook</h2>' +
      (function () { var ks = savedSkills().map(skillById).filter(Boolean);
        return ks.length ? '<div class="stack">' + ks.map(skillRow).join('') + '</div>' : '<p class="empty">Tap "Save to my pocketbook" on any skill to keep it here, ready for when you need it.</p>'; })() +
      savedPracticesSection() +
      friendCard('friend-saved');
    wireFriend('friend-saved');
    wireSavedPractices();
    wirePlanRemove(viewSaved);
    Array.prototype.forEach.call(view.querySelectorAll('[data-unsave]'), function (b) {
      b.addEventListener('click', function () {
        toggle('abg.savedAffirmations', affs[+b.getAttribute('data-unsave')]);
        viewSaved();
      });
    });
  }

  function viewHelp() {
    view.innerHTML =
      navBar('#today', 'Home') +
      '<div><h1 class="page-title">You don\'t have to carry this alone.</h1><p class="lede">Free, 24/7, and you can stay anonymous.</p></div>' +
      '<a class="crisis primary" href="tel:988"><span class="circle">' + ICON.phone + '</span><span><span class="big" style="display:block">Call or text 988</span><span class="small">Suicide &amp; Crisis Lifeline</span></span></a>' +
      '<a class="crisis secondary" href="sms:741741"><span class="circle">' + ICON.chat + '</span><span><span class="big" style="display:block">Text HOME to 741741</span><span class="small">Crisis Text Line</span></span></a>' +
      '<a class="outline-link" href="tel:911">In danger right now? Call 911</a>' +
      '<a class="row-link" href="https://findahelpline.com" target="_blank" rel="noopener"><span class="text"><span class="title">Outside the US?</span><span class="lede" style="margin:0">Find a free crisis line in your country</span></span>' + ICON.out + '</a>' +
      '<h2 class="section-title">Find a Black therapist</h2>' +
      '<div class="stack">' +
        '<a class="row-link" href="https://www.anxiousblackgirls.com/florida-online-counseling-service" target="_blank" rel="noopener"><span class="text"><span class="title">Anxious Black Girls® Therapy</span><span class="lede" style="margin:0">Virtual therapy with licensed clinicians who understand our culture</span></span>' + ICON.out + '</a>' +
        '<a class="row-link" href="https://therapyforblackgirls.com" target="_blank" rel="noopener"><span class="text"><span class="title">Therapy for Black Girls</span><span class="lede" style="margin:0">Directory of therapists by state</span></span>' + ICON.out + '</a>' +
        '<a class="row-link" href="https://beam.community" target="_blank" rel="noopener"><span class="text"><span class="title">BEAM</span><span class="lede" style="margin:0">Black Emotional and Mental Health Collective</span></span>' + ICON.out + '</a>' +
      '</div>' +
      '<h2 class="section-title">Questions about the app</h2>' +
      ideaLink('help', 'Share an idea for the app') +
      '<a class="row-link faq-tile" href="#faq"><span class="badge" style="background:var(--gold-soft)">?</span><span class="text"><span class="title">Frequently asked questions</span><span class="lede" style="margin:0">Plus, privacy, your journal and more</span></span>' + ICON.chev + '</a>' +
      '<h2 class="section-title">Privacy and settings</h2>' +
      '<p class="lede" style="margin-top:-4px">No account, no tracking. Everything you write and save stays on this phone.</p>' +
      '<div class="settings">' + '<a class="setting-row" href="#greeting"><div class="text"><span class="title">Your greeting</span><span class="lede" style="margin:0">' + esc(greetingText()) + '</span></div>' + ICON.chev + '</a>' + (NATIVE ? reminderCard() + remindersCard() + lockSetting() : '') +
        (PAID && (PAID.enabled || PAID.preview) ? '<a class="setting-row" href="#plus"><div class="text"><span class="title">' + esc(PAID.name) + '</span><span class="lede" style="margin:0">' + (PAID.enabled ? 'See what\'s included' : 'Preview of the paid screen (test builds only)') + '</span></div>' + ICON.chev + '</a>' : '') +
        deleteSetting() + '</div>' +
      '<p class="disclaimer">This app offers education and encouragement. It is not therapy and does not replace care from a licensed professional.</p>' +
      '<div class="legal-links">' +
        '<a href="https://www.anxiousblackgirls.com/medical-disclaimer" target="_blank" rel="noopener">Medical Disclaimer</a>' +
        '<a href="https://www.anxiousblackgirls.com/terms-of-use" target="_blank" rel="noopener">Terms of Use</a>' +
        '<a href="https://www.anxiousblackgirls.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a>' +
      '</div>' +
      '<p class="copyright">© 2026 Anxious Black Girls, LLC. All rights reserved.</p>';
    if (NATIVE) { wireReminder(); wireLockSetting(); }
    wireDeleteSetting();
  }

  // ---------- daily reminder (app only) ----------
  function fmtTime(t) {
    var hm = t.split(':'), h = +hm[0], m = hm[1];
    return (h % 12 || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
  }
  function reminderCard() {
    var r = NATIVE.reminder.get();
    return '<div class="setting-row reminder-row">' +
      '<div class="text"><span class="title" id="rem-title">Daily affirmation reminder</span>' +
      '<span id="rem-status" class="lede" style="margin:0">' + (r.on ? 'On at ' + esc(fmtTime(r.time)) : 'Off') + '</span></div>' +
      '<div class="reminder-controls">' +
        '<label class="sr" for="rem-time">Reminder time</label>' +
        '<input id="rem-time" class="reminder-time" type="time" value="' + esc(r.time) + '"' + (r.on ? '' : ' hidden') + '>' +
        '<button id="rem-toggle" class="btn small' + (r.on ? '' : ' dark') + '" data-on="' + r.on + '">' + (r.on ? 'Turn off' : 'Turn on') + '</button>' +
      '</div></div>';
  }
  function wireReminder() {
    var btn = document.getElementById('rem-toggle'), time = document.getElementById('rem-time'), status = document.getElementById('rem-status');
    function show(r) {
      status.textContent = r.on ? 'On at ' + fmtTime(r.time) : 'Off';
      btn.textContent = r.on ? 'Turn off' : 'Turn on';
      btn.setAttribute('data-on', r.on);
      btn.classList.toggle('dark', !r.on);
      time.hidden = !r.on;
    }
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('data-on') === 'true';
      (on ? NATIVE.reminder.turnOff(AFFIRMATIONS) : NATIVE.reminder.turnOn(time.value || '08:00', AFFIRMATIONS)).then(function (r) {
        show(r);
        if (r.denied) toast('Notifications are off for this app. Turn them on in your phone\'s Settings.');
        else toast(r.on ? 'You\'ll get a new affirmation every day at ' + fmtTime(r.time) : 'Daily reminder turned off');
      });
    });
    time.addEventListener('change', function () {
      if (!time.value) return;
      NATIVE.reminder.changeTime(time.value, AFFIRMATIONS).then(function (r) { show(r); toast('Reminder moved to ' + fmtTime(r.time)); });
    });
  }

  // ---------- the Toolkit (content lives in skills.json) ----------
  function skillById(id) { return SKILLS.skills.filter(function (k) { return k.id === id; })[0]; }
  function groupName(id) { var g = SKILLS.groups.filter(function (x) { return x.id === id; })[0]; return g ? g.name : ''; }
  function savedSkills() { return store.get('abg.savedSkills', []); }
  function skillRow(k) {
    return '<a class="row-link" href="#skill-' + esc(k.id) + '">' +
      '<span class="badge skill-badge">' + ICON.bag + '</span>' +
      '<span class="text"><span class="meta skill-meta">Skill · ' + esc(groupName(k.group)) + (isLocked(k) ? ' <span class="plus-tag">Plus</span>' : '') + '</span>' +
      '<span class="title">' + esc(k.name) + '</span></span>' + ICON.chev + '</a>';
  }
  function skillsForTopic(topicId, n, seed) {
    var list = SKILLS.skills.filter(function (k) { return k.topics.indexOf(topicId) !== -1; });
    var start = list.length ? (seed % list.length) : 0;
    return list.slice(start).concat(list.slice(0, start)).slice(0, n);
  }
  // ---------- Share an idea (sent as an email from the person's phone; the app collects nothing) ----------
  function ideaLink(ctx, title) {
    return '<a class="row-link idea-link" href="#idea-' + ctx + '"><span class="badge" style="background:var(--sage)">+</span><span class="text"><span class="title">' + esc(title || 'Don\'t see what you need?') + '</span><span class="lede" style="margin:0">Tell us what you\'d like to see in the app.</span></span>' + ICON.chev + '</a>';
  }
  var IDEA_KINDS = ['A new topic', 'A coping skill', 'A video', 'An affirmation', 'A feature', 'Something else'];
  function viewIdea(ctx) {
    var back = ctx === 'learn' ? '#learn' : ctx === 'pocketbook' ? '#pocketbook' : ctx === 'today' ? '#today' : '#help';
    view.innerHTML = navBar(back, 'Back') +
      '<div><h1 class="page-title">Share an idea</h1><p class="lede">This app grows with you. Tell us the topics, skills and features you\'d love to see, and Deseray and the team will read every one.</p></div>' +
      '<section class="idea-card"><span class="filter-label">What is it about?</span><div class="idea-chips">' +
        IDEA_KINDS.map(function (k) { return '<button class="idea-chip" aria-pressed="false">' + esc(k) + '</button>'; }).join('') + '</div>' +
        '<label class="filter-label" for="idea-text">What would you like to see?</label>' +
        '<textarea id="idea-text" rows="5" placeholder="Example: Articles about caring for aging parents, or a skill for when I can\'t sleep."></textarea>' +
        '<button id="idea-send" class="btn dark" style="width:100%">Send my idea</button>' +
        '<p class="idea-note">This opens your email app with your idea filled in. Nothing is sent until you tap Send, and the app doesn\'t keep a copy. This inbox isn\'t for emergencies. If you\'re in crisis, call 911 or call/text 988.</p>' +
      '</section>';
    var draft = store.get('abg.ideaDraft', '');
    var ta = document.getElementById('idea-text'); ta.value = draft;
    ta.addEventListener('input', function () { store.set('abg.ideaDraft', ta.value); });
    Array.prototype.forEach.call(view.querySelectorAll('.idea-chip'), function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); });
    });
    document.getElementById('idea-send').addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text) { toast('Write your idea first, then tap Send.'); ta.focus(); return; }
      var kinds = Array.prototype.filter.call(view.querySelectorAll('.idea-chip'), function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.textContent; });
      var subject = 'App idea' + (kinds.length ? ': ' + kinds.join(', ') : '');
      var body = text + '\n\n(Sent from the Anxious Black Girls app' + (kinds.length ? ' · ' + kinds.join(', ') : '') + ')';
      var a = document.createElement('a');
      a.href = 'mailto:support@anxiousblackgirls.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      document.body.appendChild(a); a.click(); a.remove();
      store.set('abg.ideaDraft', '');
      toast('Thank you! Your email app should open now.', 3500);
    });
  }

  function viewToolkit() {
    var filter = store.get('abg.toolkitFilter', 'all');
    view.innerHTML =
      navBar('#learn', 'Learn') +
      '<div><h1 class="page-title">The Pocketbook</h1><p class="lede">Our grandmothers and aunties carried pocketbooks with exactly what you needed inside. This one holds coping skills you can pull out in the moment. Each card tells you what the skill is, when to use it and how to do it, step by step. Add your favorites to your pocketbook to find them fast.</p></div>' +
      '<section class="filter-card">' +
        '<label class="filter-label" for="skill-type">Type of skill</label>' +
        '<div class="select-wrap"><select id="skill-type">' +
          '<option value="all">All skills (' + SKILLS.skills.length + ')</option>' +
          SKILLS.groups.map(function (g) {
            var n = SKILLS.skills.filter(function (k) { return k.group === g.id; }).length;
            return '<option value="' + esc(g.id) + '">' + esc(g.name) + ' (' + n + ')</option>';
          }).join('') +
        '</select>' + ICON.chev + '</div>' +
        '<label class="filter-label" for="skill-topic">Helps with</label>' +
        '<div class="select-wrap"><select id="skill-topic">' +
          '<option value="all">Any topic</option>' +
          DATA.topics.filter(function (t) { return SKILLS.skills.some(function (k) { return k.topics.indexOf(t.id) !== -1; }); })
            .map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') +
        '</select>' + ICON.chev + '</div>' +
      '</section>' +
      '<p id="skill-summary" class="section-desc" aria-live="polite"></p>' +
      '<div id="skill-list" class="stack"></div>' + ideaLink('pocketbook', 'Want a skill we don\'t have yet?') +
      '<p class="disclaimer"><strong>Disclaimer:</strong> These skills are for learning and practice. They don\'t replace care from a licensed professional. If you\'re in crisis, call 911 or call/text 988.</p>';
    var topic = store.get('abg.toolkitTopic', 'all');
    var typeSel = document.getElementById('skill-type'), topicSel = document.getElementById('skill-topic');
    typeSel.value = SKILLS.groups.some(function (g) { return g.id === filter; }) ? filter : 'all';
    topicSel.value = topicSel.querySelector('option[value="' + topic + '"]') ? topic : 'all';
    function show() {
      filter = typeSel.value; topic = topicSel.value;
      store.set('abg.toolkitFilter', filter); store.set('abg.toolkitTopic', topic);
      var list = SKILLS.skills.filter(function (k) {
        return (filter === 'all' || k.group === filter) && (topic === 'all' || k.topics.indexOf(topic) !== -1);
      });
      var g = SKILLS.groups.filter(function (x) { return x.id === filter; })[0], t = topicById(topic);
      document.getElementById('skill-summary').textContent =
        'Showing ' + list.length + (list.length === 1 ? ' skill' : ' skills') + (t ? ' for ' + t.name : '') + '. ' + (g ? g.desc : '');
      document.getElementById('skill-list').innerHTML = list.length ? list.map(skillRow).join('')
        : '<p class="empty">No skills match both choices yet. Try "Any topic" or "All skills."</p>';
    }
    typeSel.addEventListener('change', show);
    topicSel.addEventListener('change', show);
    show();
  }
  function shareSkill(k) {
    var link = DOWNLOAD_URL;
    var caption = 'A coping skill worth trying: ' + k.name + '. Get more skills like this in the Anxious Black Girls® app.';
    openSharePanel({
      heading: 'Share this skill', imageText: k.name,
      makeImage: function (format) {
        return makeCardImage({ tag: 'Coping skill', color: '#E4E3CC', accent: '#D3B094', accentText: '#2B2118', meta: '1-minute practice', title: k.name,
          excerpt: k.what + ' ' + k.steps.map(function (st, i) { return (i + 1) + '. ' + st; }).join(' '), cta: 'Get more skills like this in the app' }, format);
      },
      alt: 'Branded image with the skill name', file: 'anxious-black-girls-skill.png',
      caption: caption + ' ' + link, link: link, linkHeading: 'Or post a link to download the app',
      sendText: function () {
        if (navigator.share) navigator.share({ title: k.name, text: caption, url: link }).catch(function () { copy(caption + ' ' + link); });
        else copy(caption + ' ' + link);
      }
    });
  }
  // ---------- Practice space on each skill (saved only on this phone) ----------
  // Videos and the practice space are Plus features, on free and paid skills alike.
  function extrasLocked() { return !!(PAID && PAID.enabled) && !hasPlus(); }
  function extrasLockCard(k) {
    return '<section class="extras-lock">' +
      (k.video ? '<div class="extras-thumb"><img src="' + esc(k.video.replace(/\.mp4$/, '.jpg')) + '" alt=""><span class="extras-badge">' + ICON.lock + '</span></div>' : '') +
      '<div class="extras-text"><span class="eyebrow">' + esc(PAID.name) + '</span>' +
      '<h2 class="section-title">' + (k.video ? 'Watch it in action and practice it here' : 'Practice it right here') + '</h2>' +
      '<p>' + (k.video ? 'See this skill play out in a real-life moment, then work through the steps in your own practice space. ' : 'Work through the steps in your own practice space. ') + 'Save your practices on this phone and come back as often as you want.</p>' +
      '<a class="btn dark" href="#plus">See what\'s included</a></div></section>';
  }
  function practicePrompts(k) {
    if (k.practice) return k.practice.map(function (p) { return { label: p.label, hint: p.hint, write: !p.check }; });
    return k.steps.map(function (st) { return { label: st, write: false }; }).concat([{ label: 'How do you feel now?', hint: 'A word or two is enough.', write: true }]);
  }
  function practiceList(k) { return store.get('abg.practice.' + k.id, []); }
  function practiceLocked() { return !!(PAID && PAID.enabled) && !hasPlus(); }
  function practiceBlock(k) {
    if (practiceLocked()) {
      var first = practicePrompts(k).slice(0, 2);
      return '<section class="practice practice-locked"><span class="eyebrow">Practice ' + '<span class="plus-tag">PLUS</span></span>' +
        '<h2 class="practice-title">Your turn. Work through it here.</h2>' +
        '<div class="practice-peek" aria-hidden="true">' + first.map(function (p, i) { return '<div class="practice-label">' + esc(p.label) + '</div><div class="peek-box"></div>'; }).join('') + '</div>' +
        '<p class="practice-note">With ' + esc(PAID.name) + ', you can work through every skill step by step, save your practices on this phone, and come back to them anytime.</p>' +
        '<a class="btn dark" href="#plus">See what\'s included</a></section>';
    }
    var ps = practicePrompts(k), draft = store.get('abg.practiceDraft.' + k.id, {});
    var past = practiceList(k);
    function fmt(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
    return '<section class="practice" id="practice">' +
      '<span class="eyebrow">Practice</span>' +
      '<h2 class="practice-title">Your turn. Work through it here.</h2>' +
      '<p class="practice-note">Saving is up to you. What you save stays on this phone, and you can come back and practice as many times as you want.</p>' +
      '<div id="practice-alert"></div>' +
      '<ol class="practice-steps">' + ps.map(function (p, i) {
        var val = draft['s' + i];
        return p.write
          ? '<li><label class="practice-label" for="pr-' + i + '">' + esc(p.label) + '</label><textarea id="pr-' + i + '" data-pr="' + i + '" rows="3" placeholder="' + esc(p.hint || '') + '">' + esc(val || '') + '</textarea></li>'
          : '<li class="practice-check"><label><input type="checkbox" data-pr="' + i + '"' + (val ? ' checked' : '') + '><span><em>' + esc(p.label) + '</em></span></label></li>';
      }).join('') + '</ol>' +
      '<div class="practice-actions"><button id="practice-save" class="btn dark">Save this practice</button><button id="practice-clear" class="btn">Start over</button></div>' +
      (past.length ? '<details class="practice-past"><summary>Your past practices (' + past.length + ')' + ICON.chev + '</summary>' + past.map(function (e) {
        return '<div class="practice-entry" id="pe-' + esc(e.id) + '"><div class="practice-date">' + esc(fmt(e.date)) + '</div>' +
          e.items.map(function (it) { return '<p><strong>' + esc(it.label) + '</strong><br>' + esc(it.value) + '</p>'; }).join('') +
          '<div class="actions"><button class="btn small" data-pdel="' + esc(e.id) + '">Delete</button>' +
          '<span class="confirm" data-pconfirm="' + esc(e.id) + '" hidden>Delete this practice for good? <button class="btn small dark" data-pdel-yes="' + esc(e.id) + '">Yes, delete</button> <button class="btn small" data-pdel-no="' + esc(e.id) + '">Keep it</button></span></div></div>';
      }).join('') + '</details>' : '') +
      '</section>';
  }
  function wirePractice(k) {
    var box = document.getElementById('practice'); if (!box) return;
    var ps = practicePrompts(k), key = 'abg.practiceDraft.' + k.id;
    var fields = box.querySelectorAll('[data-pr]');
    function read() {
      var d = {};
      Array.prototype.forEach.call(fields, function (f) { var i = f.getAttribute('data-pr'); d['s' + i] = f.type === 'checkbox' ? f.checked : f.value; });
      return d;
    }
    function check(fromTyping) {
      var text = Array.prototype.map.call(box.querySelectorAll('textarea'), function (t) { return t.value; }).join(' ');
      var hit = CRISIS_WORDS.test(text);
      document.getElementById('practice-alert').innerHTML = hit ? crisisBanner() : '';
      if (hit && fromTyping && !pauseShownThisVisit) { document.activeElement && document.activeElement.blur(); showPause(); }
    }
    Array.prototype.forEach.call(fields, function (f) {
      f.addEventListener(f.type === 'checkbox' ? 'change' : 'input', function () { store.set(key, read()); if (f.type !== 'checkbox') check(true); });
    });
    check();
    function rerender(msg) { viewSkill(k.id); var p = document.getElementById('practice'); if (p) p.scrollIntoView({ block: 'start' }); if (msg) toast(msg); }
    document.getElementById('practice-save').addEventListener('click', function () {
      var d = read(), items = [];
      ps.forEach(function (p, i) {
        var v = d['s' + i];
        if (p.write && String(v || '').trim()) items.push({ label: p.label, value: String(v).trim() });
        if (!p.write && v) items.push({ label: p.label, value: 'Done' });
      });
      if (!items.length) { toast('Work through at least one step, then tap Save.'); return; }
      var list = practiceList(k);
      list.unshift({ id: String(Date.now()), date: new Date().toISOString(), items: items });
      store.set('abg.practice.' + k.id, list);
      store.set(key, {});
      rerender('Practice saved on this phone');
    });
    document.getElementById('practice-clear').addEventListener('click', function () { store.set(key, {}); rerender('Cleared. Start fresh whenever you\'re ready.'); });
    Array.prototype.forEach.call(box.querySelectorAll('[data-pdel]'), function (b) {
      b.addEventListener('click', function () { box.querySelector('[data-pconfirm="' + b.getAttribute('data-pdel') + '"]').hidden = false; b.hidden = true; });
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-pdel-no]'), function (b) {
      b.addEventListener('click', function () { var id = b.getAttribute('data-pdel-no'); box.querySelector('[data-pconfirm="' + id + '"]').hidden = true; box.querySelector('[data-pdel="' + id + '"]').hidden = false; });
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-pdel-yes]'), function (b) {
      b.addEventListener('click', function () { var id = b.getAttribute('data-pdel-yes'); store.set('abg.practice.' + k.id, practiceList(k).filter(function (e) { return e.id !== id; })); rerender('Practice deleted'); });
    });
  }

  function viewSkill(id, fromSaved) {
    var backHref = fromSaved ? '#saved' : '#pocketbook', backLabel = fromSaved ? 'Back to Saved' : 'Back to the Pocketbook';
    if (!fromSaved) { var pb = planBack(backHref, backLabel); backHref = pb.href; backLabel = pb.label; }
    var k = skillById(id);
    if (!k) { location.hash = '#pocketbook'; return; }
    if (isLocked(k)) {
      view.innerHTML = navBar(backHref, backLabel) +
        '<section class="skill-hero"><span class="skill-hero-label">' + ICON.bag + 'The Pocketbook · 1-minute skill</span><h1>' + esc(k.name) + '</h1><p>' + esc(k.what) + '</p></section>' +
        plusLockCard('skill');
      return;
    }
    var isSaved = savedSkills().indexOf(id) !== -1;
    function saveLabel(on) { return on ? 'In my pocketbook' : 'Save to my pocketbook'; }
    function saveBtn(idAttr) { return '<button id="' + idAttr + '" class="btn save-btn pocket-btn" aria-pressed="' + isSaved + '">' + ICON.bag + '<span>' + saveLabel(isSaved) + '</span></button>'; }
    var related = k.topics.map(topicById).filter(Boolean);
    view.innerHTML =
      navBar(backHref, backLabel, '<div class="nav-actions"><button id="share-skill-top" class="btn icon-only" aria-label="Share this skill">' + ICON.share + '</button>' + saveBtn('save-skill-top') + '</div>') +
      '<section class="skill-hero"><span class="skill-hero-label">' + ICON.bag + 'The Pocketbook · 1-minute skill</span>' +
        '<h1>' + esc(k.name) + '</h1><p>' + esc(k.what) + '</p><span class="skill-hero-group">' + esc(groupName(k.group)) + '</span></section>' +
      '<article class="prose skill-page">' +
      '<div class="stack" style="gap:14px">' +
      (k.lens ? '<aside class="lens"><span class="eyebrow">Through our lens</span><p>' + esc(k.lens) + '</p></aside>' : '') +
      '<h2>When to use it</h2><p>' + esc(k.when) + '</p>' +
      '<section class="skill"><span class="eyebrow">Try this</span><ol class="steps">' + k.steps.map(function (st) { return '<li>' + esc(st) + '</li>'; }).join('') + '</ol></section>' +
      (extrasLocked() ? extrasLockCard(k) :
        (k.video ? '<section class="skill-video"><span class="eyebrow">See it in action</span><video src="' + esc(k.video) + '" poster="' + esc(k.video.replace(/\.mp4$/, '.jpg')) + '" controls playsinline preload="none"></video></section>' : '') +
        practiceBlock(k)) +
      '<section class="keep-it"><span class="keep-icon" aria-hidden="true">' + ICON.bag + '</span><div><strong>Keep this one close.</strong>' +
        '<p>Put it in your pocketbook so it\'s ready next time, or pass it to a friend who could use it.</p>' +
        '</div><div class="keep-actions">' + saveBtn('save-skill-keep') + '<button id="share-skill-keep" class="btn save-btn">' + ICON.share + 'Share with a friend</button></div></section>' +
      (related.length ? '<h2>Read more</h2><div class="stack">' + related.map(function (t) {
        return '<a class="row-link" href="#topic-' + esc(t.id) + '"><span class="badge" style="background:' + esc(t.color) + '">' + esc(t.name.slice(0, 2).toUpperCase()) + '</span><span class="text"><span class="title">' + esc(t.name) + '</span></span>' + ICON.chev + '</a>';
      }).join('') + '</div>' : '') +
      '<h3>Source</h3><ul class="sources"><li>' + esc(k.source) + '</li></ul></div></article>' +
      '<div class="article-end"><a class="btn" href="#pocketbook">More from the Pocketbook</a></div>' +
      '<p class="disclaimer"><strong>Disclaimer:</strong> This is education, not therapy or medical advice. If you\'re in crisis, call 911 or call/text 988.</p>' +
      (NATIVE && k.group === 'neuro' ? '<a class="row-link reminders-link" href="#reminders-skill-' + esc(k.id) + '"><span class="badge" style="background:var(--gold-soft)">' + ICON.bell + '</span><span class="text"><span class="title">Set a reminder to practice this</span><span class="lede" style="margin:0">Your phone will nudge you at the time you pick</span></span>' + ICON.chev + '</a>' : '') +
      reportIssue('skill', k.name, '#skill-' + k.id) +
      '<p class="copyright">© 2026 Anxious Black Girls, LLC. All rights reserved.</p>';
    wirePractice(k);
    ['share-skill-top', 'share-skill-keep'].forEach(function (sid) { document.getElementById(sid).addEventListener('click', function () { shareSkill(k); }); });
    var btns = [document.getElementById('save-skill-top'), document.getElementById('save-skill-keep')];
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = toggle('abg.savedSkills', id);
        btns.forEach(function (b) { b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = saveLabel(on); });
        toast(on ? 'Added to your pocketbook. Find it anytime in Saved.' : 'Taken out of your pocketbook');
      });
    });
  }

  // ---------- days with us and milestones (stored only on this phone) ----------
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function daysWithUs() { return store.get('abg.days', []).length; }
  var MILESTONES = { 3: 'Three days of showing up for yourself. That counts.', 7: 'One week of making time for you. Proud of you.',
    14: 'Two weeks of showing up for yourself.', 30: 'Thirty days with us. Look at you keeping this promise to yourself.',
    60: 'Sixty days of choosing you.', 100: 'One hundred days. That\'s a whole habit of taking care of you.',
    180: 'Six months of showing up for yourself.', 365: 'One whole year with us. Thank you for letting us walk with you.' };
  function recordDay() {
    var days = store.get('abg.days', []), key = todayKey();
    if (days[days.length - 1] === key) return;
    days.push(key);
    if (days.length > 400) days = days.slice(-400);
    store.set('abg.days', days);
    var n = days.length, last = store.get('abg.milestone', 0);
    if (MILESTONES[n] && n > last) {
      store.set('abg.milestone', n);
      setTimeout(function () { toast(MILESTONES[n], 4500); }, 1800);
      if (n >= 7) setTimeout(function () { maybeAskForRating(); }, 7000);
    }
  }

  // ---------- App Store rating: after a good moment, at most every 4 months, 3 times total ----------
  function maybeAskForRating() {
    if (!NATIVE || daysWithUs() < 5) return;
    var r = store.get('abg.rating', { at: 0, count: 0 });
    if (r.count >= 3 || Date.now() - r.at < 120 * 864e5) return;
    store.set('abg.rating', { at: Date.now(), count: r.count + 1 });
    NATIVE.askForRating();
  }

  // ---------- tell a friend ----------
  function friendCard(id) {
    return '<section class="friend-card" aria-labelledby="' + id + '-title">' +
      '<h2 id="' + id + '-title" class="section-title">Know someone who needs this?</h2>' +
      '<p>Send her the app. It might be the thing that helps her feel less alone today.</p>' +
      '<button class="btn dark" id="' + id + '">' + ICON.share + 'Share the app</button></section>';
  }
  function wireFriend(id) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('click', function () {
      var msg = 'I\'ve been using the Anxious Black Girls® app for daily affirmations, articles, and coping skills. I think you\'d like it too: ' + DOWNLOAD_URL;
      if (NATIVE) { NATIVE.shareText(msg); return; }
      if (navigator.share) navigator.share({ text: msg }).catch(function () {});
      else copy(msg);
    });
  }

  // ---------- Face ID / passcode lock for the journal and saved items (phone app only) ----------
  var unlocked = false, unlocking = 0;
  function lockOn() { return !!(NATIVE && store.get('abg.lock', false)); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && Date.now() - unlocking > 4000) unlocked = false;
  });
  function viewLocked(label) {
    view.innerHTML =
      navBar('#today', 'Home') +
      '<section class="lock-card"><span class="lock-icon" aria-hidden="true">' + ICON.lock + '</span>' +
        '<h1 class="page-title">Your ' + esc(label) + ' is locked</h1>' +
        '<p class="lede">Use Face ID or your passcode to open it.</p>' +
        '<button id="unlock" class="btn dark">Unlock</button></section>';
    var btn = document.getElementById('unlock');
    function go() {
      unlocking = Date.now();
      NATIVE.lock.unlock('Unlock your ' + label).then(function (ok) {
        if (ok) { unlocked = true; route(); }
      });
    }
    btn.addEventListener('click', go);
    go();
  }
  function lockSetting() {
    var on = store.get('abg.lock', false);
    return '<div class="setting-row"><div class="text"><span class="title">Lock journal and saved items</span>' +
      '<span class="lede" style="margin:0">Ask for Face ID or your passcode before opening them.</span></div>' +
      '<button id="lock-toggle" class="btn small' + (on ? '' : ' dark') + '">' + (on ? 'Turn off' : 'Turn on') + '</button></div>';
  }
  function wireLockSetting() {
    var b = document.getElementById('lock-toggle');
    if (!b) return;
    b.addEventListener('click', function () {
      var on = store.get('abg.lock', false);
      unlocking = Date.now();
      NATIVE.lock.available().then(function (ok) {
        if (!ok) { toast('Set up Face ID or a passcode in your iPhone Settings first.', 3500); return; }
        NATIVE.lock.unlock(on ? 'Turn off the lock' : 'Turn on the lock').then(function (passed) {
          if (!passed) return;
          store.set('abg.lock', !on);
          unlocked = true;
          toast(on ? 'Lock turned off' : 'Your journal and saved items are locked');
          viewHelp();
        });
      });
    });
  }

  // ---------- delete everything on this phone ----------
  function deleteSetting() {
    return '<div class="setting-row danger-zone" id="delete-zone"><div class="text"><span class="title">Delete everything on this phone</span>' +
      '<span class="lede" style="margin:0">Erases your journal, saved items, reminder and settings.</span></div>' +
      '<button id="delete-start" class="btn small">Delete</button></div>';
  }
  function wireDeleteSetting() {
    var b = document.getElementById('delete-start');
    if (!b) return;
    b.addEventListener('click', function () {
      var zone = document.getElementById('delete-zone');
      zone.innerHTML = '<div class="text"><span class="title">Delete everything?</span>' +
        '<span class="lede" style="margin:0">Your journal entries, saved affirmations, articles and skills, and your reminder will be erased from this phone. This can\'t be undone. Use "Copy all entries" in your journal first if you want to keep them.</span></div>' +
        '<div class="confirm-actions"><button id="delete-yes" class="btn small danger">Delete everything</button><button id="delete-no" class="btn small">Cancel</button></div>';
      document.getElementById('delete-no').addEventListener('click', viewHelp);
      document.getElementById('delete-yes').addEventListener('click', function () {
        var done = function () { store.set('abg.welcomed', true); unlocked = false; toast('Everything on this phone was deleted.', 3000); location.hash = '#today'; route(); };
        if (NATIVE) { NATIVE.clearAll().then(done, done); return; }
        try {
          var keys = [];
          for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('abg.') === 0) keys.push(k); }
          keys.forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) {}
        done();
      });
    });
  }

  // ---------- Anxious Black Girls Plus (paid tier). Settings live in paid.json. ----------
  function plusIds() { return ((PAID && PAID.products) || []).map(function (p) { return p.id; }); }
  function hasPlus() { return store.get('abg.plus', false); }
  // Free articles: 2 per topic. If a topic has narrated articles, its first narrated one is always one of the 2;
  // the rest are the earliest articles in the topic. Skills use "premium": true in skills.json.
  var freeArticleIds = null;
  function freeArticles() {
    if (freeArticleIds) return freeArticleIds;
    freeArticleIds = {};
    DATA.topics.forEach(function (t) {
      var list = DATA.articles.filter(function (a) { return a.topic === t.id; });
      var pick = list.filter(function (a) { return a.audio; }).slice(0, 1);
      list.forEach(function (a) { if (pick.length < 2 && pick.indexOf(a) === -1) pick.push(a); });
      pick.forEach(function (a) { freeArticleIds[a.id] = true; });
    });
    return freeArticleIds;
  }
  function isLocked(item) {
    if (!(PAID && PAID.enabled && item) || hasPlus()) return false;
    if (item.topic && item.minutes) return !freeArticles()[item.id];
    return !!item.premium;
  }
  function checkPlus() {
    if (!NATIVE || !PAID || !plusIds().length) return;
    NATIVE.purchases.owned(plusIds()).then(function (on) { store.set('abg.plus', on); });
  }
  function plusLockCard(what) {
    return '<section class="plus-lock"><span class="eyebrow">' + esc(PAID.name) + '</span>' +
      '<h2 class="section-title">This ' + esc(what) + ' is part of ' + esc(PAID.name) + '</h2>' +
      '<p>' + esc(PAID.tagline) + '</p>' +
      '<a class="btn dark" href="#plus">See what\'s included</a></section>';
  }
  function viewPlus() {
    var p = PAID || {};
    view.innerHTML =
      navBar('#today', 'Home') +
      '<section class="plus-hero"><span class="eyebrow">' + esc(p.name || '') + '</span>' +
        '<h1 class="page-title">' + esc(p.tagline || '') + '</h1>' +
        '<ul class="plus-benefits">' + (p.benefits || []).map(function (b) { return typeof b === 'string' ? '<li>' + esc(b) + '</li>' : '<li><strong>' + esc(b.title) + '</strong><span>' + esc(b.text) + '</span></li>'; }).join('') + '</ul></section>' +
      (hasPlus()
        ? '<p class="soon-note">You have ' + esc(p.name) + '. Thank you for supporting this work.</p><button id="plus-manage" class="btn">Manage subscription</button>'
        : '<div class="stack" id="plus-options">' + (p.products || []).map(function (pr) {
            return '<button class="plan-btn" data-buy="' + esc(pr.id) + '"><span class="text"><span class="title">' + esc(pr.label) + '</span>' +
              (pr.note ? '<span class="plan-note">' + esc(pr.note) + '</span>' : '') + '</span><span class="plan-price" data-price="' + esc(pr.id) + '">…</span></button>';
          }).join('') + '</div>' +
          '<button id="plus-restore" class="text-link" style="border:0;background:none;padding:0;cursor:pointer">Restore purchases</button>') +
      '<p class="plus-legal">Payment is charged to your Apple Account. Subscriptions renew automatically unless canceled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple Account settings. ' +
        '<a href="https://www.anxiousblackgirls.com/terms-of-use" target="_blank" rel="noopener">Terms of Use</a> · <a href="https://www.anxiousblackgirls.com/privacy-policy" target="_blank" rel="noopener">Privacy Policy</a></p>';
    if (hasPlus()) {
      document.getElementById('plus-manage').addEventListener('click', function () { if (NATIVE) NATIVE.purchases.manage(); });
      return;
    }
    if (!NATIVE) { Array.prototype.forEach.call(view.querySelectorAll('[data-price]'), function (s) { s.textContent = 'In the app'; }); return; }
    NATIVE.purchases.products(plusIds()).then(function (products) {
      Array.prototype.forEach.call(view.querySelectorAll('[data-price]'), function (s) {
        var pr = products.filter(function (x) { return x.identifier === s.getAttribute('data-price') || x.productIdentifier === s.getAttribute('data-price'); })[0];
        s.textContent = pr ? pr.priceString : 'Not available yet';
      });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-buy]'), function (b) {
      b.addEventListener('click', function () {
        NATIVE.purchases.buy(b.getAttribute('data-buy')).then(function () {
          store.set('abg.plus', true); toast('Welcome to ' + p.name + '!', 3000); viewPlus();
        }, function () { toast('The purchase didn\'t go through. You weren\'t charged.', 3500); });
      });
    });
    document.getElementById('plus-restore').addEventListener('click', function () {
      NATIVE.purchases.restore().then(function () { return NATIVE.purchases.owned(plusIds()); }).then(function (on) {
        store.set('abg.plus', on); toast(on ? 'Your subscription is back.' : 'No subscription found for this Apple Account.', 3500); viewPlus();
      }, function () { toast('Couldn\'t reach the App Store. Try again in a moment.', 3500); });
    });
  }

  // ---------- reminders she sets herself (Plus; phone app only) ----------
  var STARTERS = [
    { key: 'meds', title: 'Take your meds, girl', note: 'Future you is already saying thank you.', time: '09:00', repeat: 'daily' },
    { key: 'email', title: 'Did you send that email? Do it now!', note: 'Done beats perfect. Hit send.', time: '10:00', repeat: 'weekdays' },
    { key: 'water', title: 'Water break, girl', note: 'Your brain runs better hydrated. Drink up.', time: '11:00', repeat: 'daily' },
    { key: 'eat', title: 'Did you eat today?', note: 'Coffee is not a meal. Feed yourself something real.', time: '13:00', repeat: 'daily' },
    { key: 'task', title: 'Start the thing you\'ve been avoiding', note: 'Five minutes. Set a timer and go. You got this.', time: '14:00', repeat: 'weekdays' },
    { key: 'move', title: 'Get up and move a little', note: 'Walk, stretch, dance in the kitchen. It all counts.', time: '16:00', repeat: 'daily' },
    { key: 'text', title: 'Respond to the text!', note: 'You read it three days ago. They\'re waiting.', time: '12:00', repeat: 'daily' },
    { key: 'callback', title: 'Remember to call them back', note: 'A quick call now saves the guilt later.', time: '17:00', repeat: 'once' },
    { key: 'call', title: 'Call your mama back', note: 'You know she\'s been waiting.', time: '18:00', repeat: 'once' },
    { key: 'calendar', title: 'Check tomorrow\'s calendar', note: 'No surprises in the morning. Lay it out tonight.', time: '20:00', repeat: 'weekdays' },
    { key: 'wind', title: 'Put your phone down!', note: 'Rest is part of the work. Wind it down.', time: '22:00', repeat: 'daily' }
  ];
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function plusFeatureLocked() { return !!(PAID && PAID.enabled && !hasPlus()); }
  function reminderSummary(r) {
    var t = fmtTime(r.time || '09:00');
    if (r.repeat === 'once') {
      var d = (r.date || '').split('-');
      var when = d.length === 3 ? new Date(+d[0], +d[1] - 1, +d[2]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Just once';
      return when + ' at ' + t;
    }
    if (r.repeat === 'daily') return 'Every day at ' + t;
    if (r.repeat === 'weekdays') return 'Weekdays at ' + t;
    return (r.days || []).slice().sort().map(function (d) { return DAY_NAMES[d - 1]; }).join(', ') + ' at ' + t;
  }
  function remindersCard() {
    var list = NATIVE.custom.get(), on = list.filter(function (r) { return r.on; }).length;
    return '<a class="setting-row" href="#reminders"><div class="text"><span class="title">Your reminders</span><span class="lede" style="margin:0">' +
      (on ? on + ' on · tap to add or change' : 'Meds, water, that task you\'ve been avoiding. Set reminders for anything.') +
      '</span></div>' + ICON.chev + '</a>';
  }
  function viewReminders() {
    view.innerHTML = navBar('#help', 'Back to Help') +
      '<div><h1 class="page-title">Your reminders</h1><p class="lede">They pop up on your screen like any notification. Only this phone knows about them.</p></div>';
    if (!NATIVE) { view.innerHTML += '<p class="empty">Reminders work in the iPhone app.</p>'; return; }
    if (plusFeatureLocked()) { view.innerHTML += plusLockCard('reminder tool'); return; }
    var list = NATIVE.custom.get();
    view.innerHTML +=
      (list.length ? '<div class="stack">' + list.map(function (r, i) {
        return '<div class="setting-row reminder-row"><a class="text" href="#reminders-edit-' + esc(r.id) + '" style="color:inherit;text-decoration:none">' +
          '<span class="title">' + esc(r.title) + '</span><span class="lede" style="margin:0">' + esc(reminderSummary(r)) + '</span></a>' +
          '<button class="btn small' + (r.on ? '' : ' dark') + '" data-flip="' + i + '">' + (r.on ? 'Turn off' : 'Turn on') + '</button></div>';
      }).join('') + '</div>' : '<p class="empty">No reminders yet. Start with one below, or make your own.</p>') +
      '<a class="btn dark" href="#reminders-new">' + ICON.plus + 'Add a reminder</a>' +
      '<h2 class="section-title">Start with one of these</h2>' +
      '<div class="starter-grid">' + STARTERS.map(function (s) {
        return '<a class="starter" href="#reminders-new-' + s.key + '"><span class="title">' + esc(s.title) + '</span><span class="lede" style="margin:0">' + esc(reminderSummary(s)) + '</span></a>';
      }).join('') + '</div>' +
      '<p class="disclaimer">Reminders are a helpful nudge, not a medical alarm. Keep using your pharmacy or doctor\'s system for anything that can\'t be missed.</p>';
    Array.prototype.forEach.call(view.querySelectorAll('[data-flip]'), function (b) {
      b.addEventListener('click', function () {
        var all = NATIVE.custom.get(), r = all[+b.getAttribute('data-flip')];
        r.on = !r.on;
        if (r.on && NATIVE.custom.usedSlots(all) > NATIVE.custom.maxSlots) { toast('That\'s the most reminders this phone can hold. Turn one off first.', 3500); return; }
        NATIVE.custom.save(all).then(function (res) {
          if (res.denied) toast('Notifications are off for this app. Turn them on in your phone\'s Settings.', 3500);
          viewReminders();
        });
      });
    });
  }
  function viewReminderEdit(arg) {
    if (!NATIVE) { location.hash = '#reminders'; return; }
    if (plusFeatureLocked()) { location.hash = '#reminders'; return; }
    var list = NATIVE.custom.get(), editing = null, r;
    if (arg && arg.indexOf('edit-') === 0) {
      var id = arg.slice(5);
      editing = list.filter(function (x) { return x.id === id; })[0];
      if (!editing) { location.hash = '#reminders'; return; }
      r = editing;
    } else if (arg && arg.indexOf('new-') === 0) {
      var s = STARTERS.filter(function (x) { return x.key === arg.slice(4); })[0];
      r = s ? { title: s.title, note: s.note, time: s.time, repeat: s.repeat } : null;
    } else if (arg && arg.indexOf('skill-') === 0) {
      var k = skillById(arg.slice(6));
      r = k ? { title: 'Practice: ' + k.name, note: k.when, time: '09:00', repeat: 'daily' } : null;
    }
    r = r || { title: '', note: '', time: '09:00', repeat: 'daily' };
    var d = new Date(); var today = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    view.innerHTML = navBar('#reminders', 'Your reminders') +
      '<h1 class="page-title">' + (editing ? 'Edit reminder' : 'New reminder') + '</h1>' +
      '<form class="reminder-form" id="rem-form" novalidate>' +
        '<label for="rf-title">What\'s it for?</label><input id="rf-title" type="text" maxlength="60" placeholder="Take my meds" value="' + esc(r.title) + '">' +
        '<p class="field-error" id="rf-title-err" hidden>Give your reminder a name.</p>' +
        '<label for="rf-note">A kind line underneath (optional)</label><input id="rf-note" type="text" maxlength="120" placeholder="Future you says thank you." value="' + esc(r.note || '') + '">' +
        '<label for="rf-time">Time</label><input id="rf-time" type="time" value="' + esc(r.time || '09:00') + '">' +
        '<label for="rf-repeat">Repeat</label><div class="select-wrap"><select id="rf-repeat">' +
          [['daily', 'Every day'], ['weekdays', 'Weekdays'], ['days', 'Pick days'], ['once', 'Just once']].map(function (o) {
            return '<option value="' + o[0] + '"' + (r.repeat === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
        '</select>' + ICON.chev + '</div>' +
        '<div id="rf-days" class="day-picks" role="group" aria-label="Days"' + (r.repeat === 'days' ? '' : ' hidden') + '>' +
          DAY_NAMES.map(function (n, i) { var on = (r.days || []).indexOf(i + 1) !== -1;
            return '<button type="button" class="btn small" data-day="' + (i + 1) + '" aria-pressed="' + on + '">' + n + '</button>'; }).join('') + '</div>' +
        '<p class="field-error" id="rf-days-err" hidden>Pick at least one day.</p>' +
        '<div id="rf-date-wrap"' + (r.repeat === 'once' ? '' : ' hidden') + '><label for="rf-date">Date</label><input id="rf-date" type="date" min="' + today + '" value="' + esc(r.date || today) + '"></div>' +
        '<p class="field-error" id="rf-date-err" hidden>Pick a date and time that hasn\'t passed yet.</p>' +
        '<p class="field-error" id="rf-slots-err" hidden>That\'s the most reminders this phone can hold. Turn one off or delete one first.</p>' +
        '<button type="submit" class="btn dark">' + (editing ? 'Save changes' : 'Save reminder') + '</button>' +
        (editing ? '<button type="button" class="btn" id="rf-delete">Delete reminder</button>' : '') +
      '</form>';
    var rep = document.getElementById('rf-repeat');
    rep.addEventListener('change', function () {
      document.getElementById('rf-days').hidden = rep.value !== 'days';
      document.getElementById('rf-date-wrap').hidden = rep.value !== 'once';
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-day]'), function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true'); document.getElementById('rf-days-err').hidden = true; });
    });
    ['rf-title', 'rf-date', 'rf-time'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', function () {
        document.getElementById('rf-title-err').hidden = true; document.getElementById('rf-date-err').hidden = true;
      });
    });
    document.getElementById('rem-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var item = {
        id: editing ? editing.id : 'r' + Date.now().toString(36),
        title: document.getElementById('rf-title').value.trim(),
        note: document.getElementById('rf-note').value.trim(),
        time: document.getElementById('rf-time').value || '09:00',
        repeat: rep.value, on: true
      };
      if (!item.title) { document.getElementById('rf-title-err').hidden = false; return; }
      if (item.repeat === 'days') {
        item.days = Array.prototype.filter.call(view.querySelectorAll('[data-day]'), function (b) { return b.getAttribute('aria-pressed') === 'true'; })
          .map(function (b) { return +b.getAttribute('data-day'); });
        if (!item.days.length) { document.getElementById('rf-days-err').hidden = false; return; }
      }
      if (item.repeat === 'once') {
        item.date = document.getElementById('rf-date').value;
        var p = (item.date || '').split('-'), hm = item.time.split(':');
        if (p.length !== 3 || new Date(+p[0], +p[1] - 1, +p[2], +hm[0], +hm[1]) <= new Date()) { document.getElementById('rf-date-err').hidden = false; return; }
      }
      var all = NATIVE.custom.get();
      if (editing) all = all.map(function (x) { return x.id === editing.id ? item : x; }); else all.push(item);
      if (NATIVE.custom.usedSlots(all) > NATIVE.custom.maxSlots) { document.getElementById('rf-slots-err').hidden = false; return; }
      NATIVE.custom.save(all).then(function (res) {
        toast(res.denied ? 'Saved, but notifications are off for this app. Turn them on in your phone\'s Settings.' : 'Reminder set: ' + reminderSummary(item), 3500);
        location.hash = '#reminders';
      });
    });
    var del = document.getElementById('rf-delete');
    if (del) del.addEventListener('click', function () {
      NATIVE.custom.save(NATIVE.custom.get().filter(function (x) { return x.id !== editing.id; })).then(function () {
        toast('Reminder deleted'); location.hash = '#reminders';
      });
    });
  }

  // ---------- Plans and challenges (progress stays on this phone) ----------
  function allPaths() { return (PATHS.plans || []).concat(PATHS.challenges || []); }
  function notFinished(p) { var pr = planProgress(p.id); return !(pr && planNextDay(p, pr) === -1); }
  function pathById(id) { return allPaths().filter(function (p) { return p.id === id; })[0]; }
  function needById(id) { return (PATHS.needs || []).filter(function (n) { return n.id === id; })[0]; }
  function planState() { var s = store.get('abg.plans', {}); return s && typeof s === 'object' ? s : {}; }
  function planProgress(id) { return planState()[id] || null; }
  function savePlanProgress(id, p) { var s = planState(); if (p) s[id] = p; else delete s[id]; store.set('abg.plans', s); }
  function planLocked(p) { return !!(PAID && PAID.enabled) && !p.free && !hasPlus(); }
  function planNextDay(p, prog) {
    prog = prog || planProgress(p.id); if (!prog) return 0;
    for (var i = 0; i < p.days.length; i++) if ((prog.done || []).indexOf(i) === -1) return i;
    return -1;
  }
  function activePlans() {
    var s = planState();
    return allPaths().filter(function (p) { return s[p.id] && planNextDay(p, s[p.id]) !== -1; })
      .sort(function (a, b) { return (s[b.id].last || '') < (s[a.id].last || '') ? -1 : 1; });
  }
  function kindLabel(p) { return p.kind === 'challenge' ? 'Challenge' : 'Plan'; }
  function pathItem(ref) {
    if (!ref) return null;
    var parts = ref.split(':');
    return parts[0] === 'article' ? { kind: 'article', a: articleById(parts[1]) } : { kind: 'skill', k: skillById(parts[1]) };
  }
  function progressBar(done, total) {
    return '<span class="plan-bar" role="img" aria-label="' + done + ' of ' + total + ' days done"><span style="width:' + Math.round(done / total * 100) + '%"></span></span>';
  }
  function planCard(p) {
    var prog = planProgress(p.id), done = prog ? (prog.done || []).length : 0, next = planNextDay(p, prog);
    var status = !prog ? p.days.length + ' days' : next === -1 ? 'Finished' : 'Day ' + (next + 1) + ' of ' + p.days.length;
    return '<a class="plan-card' + (p.kind === 'challenge' ? ' is-challenge' : '') + '" href="#plan-' + esc(p.id) + '">' +
      '<span class="plan-meta">' + kindLabel(p) + ' · ' + esc(status) + (planLocked(p) ? ' <span class="plus-tag">Plus</span>' : '') + '</span>' +
      '<span class="plan-bottom"><span class="plan-title">' + esc(p.title) + '</span>' +
      (prog ? progressBar(done, p.days.length) : '<span class="plan-tagline">' + esc(p.tagline) + '</span>') + '</span></a>';
  }
  function continueCard(p) {
    var prog = planProgress(p.id), next = planNextDay(p, prog), d = p.days[next];
    return '<div class="continue-item"><div class="continue-card"><a class="continue-link" href="#plan-' + esc(p.id) + '--' + (next + 1) + '">' +
      '<span class="text"><span class="plan-meta">' + esc(p.title) + '</span>' +
      '<span class="title">Day ' + (next + 1) + ': ' + esc(d.title) + '</span>' +
      progressBar((prog.done || []).length, p.days.length) + '</span>' + ICON.chev + '</a>' +
      '<button class="plan-x" data-premove="' + esc(p.id) + '" aria-label="Remove ' + esc(p.title) + '">' + ICON.close + '</button></div>' +
      '<div class="plan-remove-confirm" data-pconfirm="' + esc(p.id) + '" hidden><p>Remove this ' + kindLabel(p).toLowerCase() + '? Your progress and notes will be cleared.</p>' +
      '<div class="actions"><button class="btn small dark" data-premove-yes="' + esc(p.id) + '">Remove</button><button class="btn small" data-premove-no="' + esc(p.id) + '">Keep it</button></div></div></div>';
  }
  function completedSection(fin) {
    return fin.length ? '<details class="completed"><summary><span class="section-title">Completed</span><span class="completed-count">' + fin.length + '</span>' + ICON.chev + '</summary><div class="stack">' + fin.map(completedRow).join('') + '</div></details>' : '';
  }
  // Practices she started on a skill page but hasn't saved yet.
  function practiceDrafts() {
    if (extrasLocked()) return [];
    return SKILLS.skills.map(function (k) {
      var d = store.get('abg.practiceDraft.' + k.id, {}), ps = practicePrompts(k);
      var filled = ps.filter(function (p, i) { var v = d['s' + i]; return p.write ? String(v || '').trim() : !!v; }).length;
      return filled ? { k: k, filled: filled, total: ps.length } : null;
    }).filter(Boolean);
  }
  function homeWorkSection() {
    var act = activePlans(), drafts = practiceDrafts(), n = act.length + drafts.length;
    if (!n) return '';
    return '<details class="completed in-progress home-work"><summary><span class="section-title">Your work, in progress</span><span class="completed-count">' + n + '</span>' + ICON.chev + '</summary>' +
      (act.length ? '<div class="stack"><span class="work-label">Plans and challenges</span>' + act.map(continueCard).join('') + '</div>' : '') +
      (drafts.length ? '<div class="stack"><span class="work-label">Practices you started</span>' + drafts.map(function (x) {
        return '<a class="row-link done-row" href="#practice-' + esc(x.k.id) + '--draft"><span class="badge skill-badge">' + ICON.pencil.replace('<svg ', '<svg class="icon" ') + '</span><span class="text">' +
          '<span class="meta skill-meta">Practice · ' + x.filled + ' of ' + x.total + ' steps</span><span class="title">' + esc(x.k.name) + '</span></span>' + ICON.chev + '</a>'; }).join('') + '</div>' : '') +
      '</details>';
  }
  function inProgressSection(act) {
    if (!act.length) return '';
    return '<details class="completed in-progress"><summary><span class="section-title">Your work, in progress</span><span class="completed-count">' + act.length + '</span>' + ICON.chev + '</summary><div class="stack">' + act.map(continueCard).join('') + '</div></details>';
  }
  function wirePlanRemove(after) {
    function q(attr, id) { return view.querySelector('[' + attr + '="' + id + '"]'); }
    Array.prototype.forEach.call(view.querySelectorAll('[data-premove]'), function (b) {
      b.addEventListener('click', function () { q('data-pconfirm', b.getAttribute('data-premove')).hidden = false; });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-premove-no]'), function (b) {
      b.addEventListener('click', function () { q('data-pconfirm', b.getAttribute('data-premove-no')).hidden = true; });
    });
    Array.prototype.forEach.call(view.querySelectorAll('[data-premove-yes]'), function (b) {
      b.addEventListener('click', function () { savePlanProgress(b.getAttribute('data-premove-yes'), null); toast('Removed'); after(); });
    });
  }
  function finishedPlans() {
    var s = planState();
    return allPaths().filter(function (p) { return s[p.id] && planNextDay(p, s[p.id]) === -1; })
      .sort(function (a, b) { return (s[b.id].finished || '') < (s[a.id].finished || '') ? -1 : 1; });
  }
  function completedRow(p) {
    var f = planProgress(p.id).finished;
    return '<a class="row-link done-row" href="#plan-' + esc(p.id) + '"><span class="badge done-badge" aria-hidden="true">✓</span><span class="text">' +
      '<span class="meta">' + kindLabel(p) + (f ? ' · Finished ' + esc(new Date(f).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : '') + '</span>' +
      '<span class="title">' + esc(p.title) + '</span></span>' + ICON.chev + '</a>';
  }
  function needSuggestions(needId) {
    if (needId === 'other') {
      return '<p class="need-reply">We may not have the exact thing yet, and that\'s okay. Here are a few places to start, or tell us what you\'d like to see.</p>' +
        '<div class="stack">' +
          '<a class="row-link" href="#journal"><span class="badge" style="background:var(--gold-soft)">' + ICON.pen + '</span><span class="text"><span class="meta">Journal</span><span class="title">Write it out</span></span>' + ICON.chev + '</a>' +
          '<a class="row-link" href="#plans"><span class="badge" style="background:var(--gold-soft)">' + ICON.spark + '</span><span class="text"><span class="meta">Plans</span><span class="title">Look through all the plans</span></span>' + ICON.chev + '</a>' +
          '<a class="row-link" href="#learn"><span class="badge" style="background:var(--sage)">' + ICON.bag + '</span><span class="text"><span class="meta">Learn</span><span class="title">Browse by subject</span></span>' + ICON.chev + '</a>' +
          '<a class="row-link" href="#idea-today"><span class="badge" style="background:var(--sage)">+</span><span class="text"><span class="meta">Share an idea</span><span class="title">Tell us what you need</span></span>' + ICON.chev + '</a>' +
        '</div>';
    }
    var n = needById(needId); if (!n) return '';
    var matching = function (list) { return (list || []).filter(function (p) { return p.needs.indexOf(needId) !== -1 && notFinished(p); }); };
    var plans = matching(PATHS.plans), ch = matching(PATHS.challenges)[0], plan = plans[0];
    var art = null, skill = null;
    plans.concat(matching(PATHS.challenges)).forEach(function (p) {
      p.days.forEach(function (d) {
        var refs = [d.item, d.article ? 'article:' + d.article : '', d.video ? 'skill:' + d.video : ''];
        refs.forEach(function (r) {
          if (!r) return; var it = pathItem(r);
          if (it.kind === 'article' && it.a && !art && (!plan || p !== plan || d !== plan.days[0])) art = it.a;
          if (it.kind === 'skill' && it.k && !skill) skill = it.k;
        });
      });
    });
    return '<p class="need-reply">' + esc(n.reply) + '</p>' +
      '<p class="need-howto">These may help. Choose one to start, and go from there.</p>' +
      '<div class="plan-grid">' + (plan ? planCard(plan) : '') + (ch ? planCard(ch) : '') + '</div>' +
      '<div class="stack">' + (art ? articleRow(art) : '') + (skill ? skillRow(skill) : '') + '</div>';
  }
  function needsCard() {
    if (!(PATHS.needs || []).length) return '';
    return '<section class="needs-card" aria-labelledby="needs-title">' +
      '<span class="eyebrow">Check in</span>' +
      '<h2 id="needs-title" class="needs-title">How are you feeling today?</h2>' +
      '<p class="needs-lede">Tell us what\'s going through your mind, and we\'ll meet you where you are.</p>' +
      '<label class="sr" for="need-pick">How are you feeling today?</label>' +
      '<div class="select-wrap need-select"><select id="need-pick"><option value="">Choose what fits best</option>' + PATHS.needs.map(function (n) {
        return '<option value="' + esc(n.id) + '">' + esc(n.label) + '</option>'; }).join('') + '<option value="other">Something else</option></select>' + ICON.chev + '</div>' +
      '<div id="need-results" class="need-results" hidden></div>' +
      '<div class="needs-actions"><a class="btn dark" href="#plans">Choose a plan</a><a class="btn" href="#challenges">Take a challenge</a></div>' +
      '<a class="text-link" href="#learn">Or browse everything in Learn</a>' +
    '</section>';
  }
  function wireNeeds() {
    var box = document.getElementById('need-results'), pick = document.getElementById('need-pick'); if (!box || !pick) return;
    function show(v) {
      box.hidden = !v; box.innerHTML = v ? needSuggestions(v) : '';
      // Remember where she was, so Back from a suggestion returns to this exact spot.
      Array.prototype.forEach.call(box.querySelectorAll('a'), function (a) {
        a.addEventListener('click', function () {
          try {
            sessionStorage.setItem('abg.todayScroll', String(window.scrollY));
            if (/^#(article|skill)-/.test(a.getAttribute('href'))) sessionStorage.setItem('abg.planReturn', JSON.stringify({ hash: '#today', label: 'Back to Today' }));
          } catch (e) {}
        });
      });
    }
    var saved = ''; try { saved = sessionStorage.getItem('abg.todayNeed') || ''; } catch (e) {}
    if (saved && pick.querySelector('option[value="' + saved + '"]')) { pick.value = saved; show(saved); }
    pick.addEventListener('change', function () {
      try { sessionStorage.setItem('abg.todayNeed', this.value); } catch (e) {}
      show(this.value);
    });
  }



  // Dropdown + 6 tiles per page. Used on the Plans page and on Learn when browsing plans.
  function planBrowserHtml(sel, kind) {
    function opt(v, label) { return '<option value="' + esc(v) + '"' + (sel === v ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    if (kind) {
      var pool = (kind === 'challenge' ? PATHS.challenges || [] : PATHS.plans || []).filter(notFinished);
      if (pool.length <= 6) return '<div id="plan-results" class="plan-results"></div>';
      return '<section class="learn-card"><label class="filter-label" for="plan-pick">Narrow it down by topic (optional)</label>' +
        '<div class="select-wrap"><select id="plan-pick">' + opt('all-' + kind + 's', 'All ' + kind + 's (' + pool.length + ')') +
          DATA.topics.filter(function (t) { return pool.some(function (p) { return p.topics.indexOf(t.id) !== -1; }); }).map(function (t) { return opt('topic-' + t.id, t.name); }).join('') +
        '</select>' + ICON.chev + '</div></section><div id="plan-results" class="plan-results"></div>';
    }
    return '<section class="learn-card"><label class="filter-label" for="plan-pick">What do you need right now?</label>' +
      '<div class="select-wrap"><select id="plan-pick"><option value="">Choose one</option>' +
        '<optgroup label="What you need">' + (PATHS.needs || []).map(function (n) { return opt(n.id, n.label); }).join('') + '</optgroup>' +
        '<optgroup label="By topic">' + DATA.topics.filter(function (t) { return allPaths().some(function (p) { return p.topics.indexOf(t.id) !== -1; }); })
          .map(function (t) { return opt('topic-' + t.id, t.name); }).join('') + '</optgroup>' +
        '<optgroup label="Everything">' + opt('all-plans', 'All plans (' + (PATHS.plans || []).length + ')') + opt('all-challenges', 'All challenges (' + (PATHS.challenges || []).length + ')') + '</optgroup>' +
      '</select>' + ICON.chev + '</div></section>' +
      '<div id="plan-results" class="plan-results" hidden></div>';
  }
  function wirePlanBrowser(sel, kind) {
    var page = 0, PER = 6, box = document.getElementById('plan-results'), pick = document.getElementById('plan-pick');
    if (!box) return;
    function matches() { return rawMatches().filter(notFinished); }
    function rawMatches() {
      if (sel === 'all-plans') return PATHS.plans || [];
      if (sel === 'all-challenges') return PATHS.challenges || [];
      var base = kind ? allPaths().filter(function (p) { return p.kind === kind; }) : allPaths();
      if (sel.indexOf('topic-') === 0) { var t = sel.slice(6); return base.filter(function (p) { return p.topics.indexOf(t) !== -1; }); }
      return base.filter(function (p) { return p.needs.indexOf(sel) !== -1; });
    }
    function paint() {
      if (!sel) { box.innerHTML = ''; box.hidden = true; return; }
      box.hidden = false;
      var list = matches(), pages = Math.max(1, Math.ceil(list.length / PER));
      page = Math.min(page, pages - 1);
      var n = !kind && needById(sel);
      box.innerHTML = (n ? '<p class="need-reply">' + esc(n.reply) + '</p>' : '') +
        '<div class="plan-grid">' + list.slice(page * PER, page * PER + PER).map(planCard).join('') + '</div>' +
        (pages > 1 ? '<div class="pager"><button class="btn small" id="pg-prev"' + (page === 0 ? ' disabled' : '') + '>Previous</button>' +
          '<span class="pager-count">' + (page + 1) + ' of ' + pages + '</span>' +
          '<button class="btn small" id="pg-next"' + (page === pages - 1 ? ' disabled' : '') + '>Next</button></div>' : '');
      var pv = document.getElementById('pg-prev'), nx = document.getElementById('pg-next');
      if (pv) pv.addEventListener('click', function () { page--; paint(); box.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); });
      if (nx) nx.addEventListener('click', function () { page++; paint(); box.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); });
    }
    if (pick) pick.addEventListener('change', function () { sel = this.value; page = 0; paint(); });
    paint();
  }

  function viewPlans(filter) {
    var kind = filter === 'challenges' ? 'challenge' : 'plan', mode = kind + 's';
    function mine(p) { return p.kind === kind; }
    view.innerHTML = navBar('#today', 'Home') +
      (kind === 'plan'
        ? '<div><h1 class="page-title">Plans</h1><p class="lede">Each plan walks you through a few articles and skills, one day at a time. Start as many as you like and go at your own pace.</p></div>'
        : '<div><h1 class="page-title">Challenges</h1><p class="lede">Each challenge gives you one small thing to do a day. Pick one that fits your week.</p></div>') +
      planBrowserHtml('all-' + mode, kind) +
      '<div class="stack">' + inProgressSection(activePlans().filter(mine)) + completedSection(finishedPlans().filter(mine)) + '</div>' +
      '<a class="row-link" href="' + (kind === 'plan' ? '#challenges' : '#plans') + '"><span class="text"><span class="title">' + (kind === 'plan' ? 'Looking for something smaller? Try a challenge' : 'Want to go deeper? Try a plan') + '</span></span>' + ICON.chev + '</a>' +
      ideaLink('learn', kind === 'plan' ? 'Want a plan we don\'t have yet?' : 'Want a challenge we don\'t have yet?');
    wirePlanRemove(function () { viewPlans(filter); });
    wirePlanBrowser('all-' + mode, kind);
  }

  function viewPlan(id) {
    var p = pathById(id); if (!p) { location.hash = '#plans'; return; }
    var prog = planProgress(id), next = planNextDay(p, prog), locked = planLocked(p);
    var done = prog ? prog.done || [] : [];
    var origin = '#today'; try { origin = sessionStorage.getItem('abg.planOrigin') || '#today'; } catch (e) {}
    var listHref = p.kind === 'challenge' ? '#challenges' : '#plans';
    view.innerHTML = '<div class="page-nav"><a class="back-link" href="' + esc(origin) + '">' + ICON.back + '<span>Back</span></a>' +
        (origin !== listHref ? '<a class="btn small" href="' + listHref + '">Choose a different ' + kindLabel(p).toLowerCase() + '</a>' : '') + '</div>' +
      '<section class="plan-hero' + (p.kind === 'challenge' ? ' is-challenge' : '') + '">' +
        '<span class="plan-meta">' + kindLabel(p) + ' · ' + p.days.length + ' days' + (locked ? ' <span class="plus-tag">Plus</span>' : '') + '</span>' +
        '<h1>' + esc(p.title) + '</h1><p>' + esc(p.tagline) + '</p>' +
        '<p class="plan-for"><strong>This is for you if:</strong> ' + esc(p.forYou) + '</p>' +
        (prog ? progressBar(done.length, p.days.length) : '') +
        (locked ? '' : !prog ? '<button class="btn dark" id="plan-start">Start ' + (p.kind === 'challenge' ? 'the challenge' : 'this plan') + '</button>'
          : next === -1 ? '<p class="plan-done-note">' + ICON.spark + 'You finished this. Look at you.</p>'
          : '<a class="btn dark" href="#plan-' + esc(id) + '--' + (next + 1) + '">Continue with Day ' + (next + 1) + '</a>') +
      '</section>' +
      (locked ? plusLockCard(p.kind === 'challenge' ? 'challenge' : 'plan') : '') +
      '<section class="stack"><h2 class="section-title">The days</h2><ol class="day-list">' + p.days.map(function (d, i) {
        var it = pathItem(d.item), isDone = done.indexOf(i) !== -1;
        var sub = p.kind === 'challenge' ? d.task : it ? (it.kind === 'article' ? 'Read · ' + (it.a ? it.a.minutes + ' min' : '') : 'Skill · 1 min') : '';
        if (d.video || d.article) sub = [d.video ? 'Video' : '', d.article && articleById(d.article) ? 'Read · ' + articleById(d.article).minutes + ' min' : '', d.video ? 'Skill' : ''].filter(Boolean).join(' · ');
        var inner = '<span class="day-dot' + (isDone ? ' is-done' : '') + '" aria-hidden="true">' + (isDone ? '✓' : (i + 1)) + '</span>' +
          '<span class="text"><span class="title">' + esc(d.title) + '</span><span class="day-sub">' + esc(sub) + '</span></span>';
        return '<li>' + (locked ? '<div class="day-row">' + inner + '</div>' : '<a class="day-row" href="#plan-' + esc(id) + '--' + (i + 1) + '">' + inner + ICON.chev + '</a>') + '</li>';
      }).join('') + '</ol></section>' +
      (prog ? '<button class="text-link plan-leave" id="plan-leave">' + (next === -1 ? 'Remove from my completed list' : 'Remove this ' + kindLabel(p).toLowerCase()) + '</button>' +
        '<div class="plan-leave-confirm" id="plan-leave-confirm" hidden><p>This clears your progress and notes for this ' + kindLabel(p).toLowerCase() + '.</p>' +
        '<div class="actions"><button class="btn dark" id="plan-leave-yes">Clear it</button><button class="btn" id="plan-leave-no">Keep it</button></div></div>' : '');
    var st = document.getElementById('plan-start');
    if (st) st.addEventListener('click', function () {
      savePlanProgress(id, { started: new Date().toISOString(), last: new Date().toISOString(), done: [], notes: {} });
      location.hash = '#plan-' + id + '--1';
    });
    var lv = document.getElementById('plan-leave');
    if (lv) {
      lv.addEventListener('click', function () { lv.hidden = true; document.getElementById('plan-leave-confirm').hidden = false; });
      document.getElementById('plan-leave-no').addEventListener('click', function () { lv.hidden = false; document.getElementById('plan-leave-confirm').hidden = true; });
      document.getElementById('plan-leave-yes').addEventListener('click', function () { savePlanProgress(id, null); toast('Cleared'); viewPlan(id); });
    }
  }

  // A plan day can show a skill video and an article preview right on the page.
  function dayVideo(d) {
    var k = d.video && skillById(d.video); if (!k || !k.video) return '';
    if (extrasLocked()) return extrasLockCard(k);
    return '<section class="skill-video"><span class="eyebrow">See it in action · ' + esc(k.name) + '</span><video src="' + esc(k.video) + '" poster="' + esc(k.video.replace(/\.mp4$/, '.jpg')) + '" controls playsinline preload="none"></video></section>';
  }
  function dayArticle(d) {
    var a = d.article && articleById(d.article); if (!a) return '';
    var t = topicById(a.topic) || { name: '', color: '#F0DFB8' };
    return '<article class="prose day-article"><div class="tags"><span class="tag" style="background:' + esc(t.color) + '">' + esc(t.name) + '</span><span class="tag" style="background:var(--bg)">' + a.minutes + ' min read</span></div>' +
      '<h2 class="day-article-title">' + esc(a.title) + '</h2><div id="day-art-body" class="day-art-body is-short"><p class="empty">Loading…</p></div>' +
      '<button class="btn day-read-more" id="day-read-more" hidden>Read more</button></article>';
  }
  function loadDayArticle(aid) {
    var a = articleById(aid), body = document.getElementById('day-art-body'), more = document.getElementById('day-read-more');
    if (!a || !body) return;
    function fill(md) {
      if (!document.getElementById('day-art-body')) return;
      if (isLocked(a)) {
        var tmp = document.createElement('div'); tmp.innerHTML = renderMarkdown(md);
        var ps = Array.prototype.filter.call(tmp.children, function (el) { return el.tagName === 'P'; }).slice(0, 2);
        body.innerHTML = ps.map(function (p) { return p.outerHTML; }).join('');
        body.insertAdjacentHTML('afterend', plusLockCard('article'));
        return;
      }
      body.innerHTML = renderMarkdown(md);
      more.hidden = false;
      more.addEventListener('click', function () {
        var open = body.classList.toggle('is-short');
        more.textContent = open ? 'Read more' : 'Show less';
        if (open) body.parentNode.scrollIntoView({ block: 'start' });
      });
    }
    if (articleCache[aid]) { fill(articleCache[aid]); return; }
    fetch(encodeURIComponent(aid) + '.md').then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
      .then(function (md) { articleCache[aid] = md; fill(md); })
      .catch(function () { body.innerHTML = '<p>This article didn\'t load. Check your connection and try again.</p>'; });
  }
  function viewPlanDay(id, n) {
    var p = pathById(id); if (!p) { location.hash = '#plans'; return; }
    var i = n - 1, d = p.days[i];
    if (!d || planLocked(p)) { location.hash = '#plan-' + id; return; }
    var prog = planProgress(id);
    if (!prog) { prog = { started: new Date().toISOString(), done: [], notes: {} }; }
    prog.last = new Date().toISOString(); savePlanProgress(id, prog);
    var isDone = (prog.done || []).indexOf(i) !== -1, it = pathItem(d.item);
    try { sessionStorage.setItem('abg.planReturn', JSON.stringify({ hash: '#plan-' + id + '--' + n, label: 'Back to Day ' + n })); } catch (e) {}
    view.innerHTML = navBar('#plan-' + esc(id), 'Back to ' + p.title) +
      '<section class="plan-hero' + (p.kind === 'challenge' ? ' is-challenge' : '') + '">' +
        '<span class="plan-meta">Day ' + n + ' of ' + p.days.length + ' · ' + esc(p.title) + '</span>' +
        '<h1>' + esc(d.title) + '</h1><p>' + esc(d.intro) + '</p>' +
        progressBar((prog.done || []).length, p.days.length) +
      '</section>' +
      (d.task ? '<section class="task-card"><span class="eyebrow">Today\'s challenge</span><p class="task-text">' + esc(d.task) + '</p></section>' : '') +
      dayVideo(d) + dayArticle(d) +
      (it && (it.a || it.k) ? '<section class="stack"><h2 class="section-title">' + (d.task ? 'This can help' : it.kind === 'article' ? 'Today\'s read' : 'Today\'s skill') + '</h2>' +
        (it.kind === 'article' ? articleRow(it.a) : skillRow(it.k)) + '</section>' : '') +
      (d.video && skillById(d.video) ? '<section class="stack"><h2 class="section-title">Try the skill</h2>' + skillRow(skillById(d.video)) + '</section>' : '') +
      '<section class="practice reflect-card"><span class="eyebrow">Think about it</span>' +
        '<label class="reflect-q" for="reflect">' + esc(d.reflect) + '</label>' +
        '<textarea id="reflect" placeholder="Write as much or as little as you want">' + esc((prog.notes || {})[i] || '') + '</textarea>' +
        '<p class="mind-note">Only you can see this. It stays on your phone.</p></section>' +
      (isDone ? '<p class="plan-done-note">' + ICON.spark + 'Day ' + n + ' is done.</p>'
        : '<button class="btn dark day-done" id="day-done">' + (d.task ? 'I did it' : 'Mark Day ' + n + ' done') + '</button>') +
      '<div class="day-nav">' + (n > 1 ? '<a class="btn small" href="#plan-' + esc(id) + '--' + (n - 1) + '">Day ' + (n - 1) + '</a>' : '<span></span>') +
        (n < p.days.length ? '<a class="btn small" href="#plan-' + esc(id) + '--' + (n + 1) + '">Day ' + (n + 1) + '</a>' : '') + '</div>';
    if (d.article) loadDayArticle(d.article);
    var ta = document.getElementById('reflect');
    ta.addEventListener('input', function () { var pr = planProgress(id) || prog; pr.notes = pr.notes || {}; pr.notes[i] = ta.value; savePlanProgress(id, pr); });
    var btn = document.getElementById('day-done');
    if (btn) btn.addEventListener('click', function () {
      var pr = planProgress(id) || prog; pr.done = pr.done || [];
      if (pr.done.indexOf(i) === -1) pr.done.push(i);
      savePlanProgress(id, pr);
      var next = planNextDay(p, pr);
      if (next === -1) { pr.finished = new Date().toISOString(); savePlanProgress(id, pr); toast('You finished ' + p.title + '. Proud of you. It\'s in your completed list.', 3400); location.hash = '#plan-' + id; }
      else { toast('Day ' + n + ' done. See you tomorrow, or keep going.', 2600); location.hash = '#today'; }
    });
  }
  // When she opens an article or skill from a plan day, its back button returns to that day.
  function planBack(href, label) {
    try {
      var r = JSON.parse(sessionStorage.getItem('abg.planReturn') || 'null');
      if (r && r.hash) return { href: r.hash, label: r.label };
    } catch (e) {}
    return { href: href, label: label };
  }

  // ---------- Learn: browse by subject, plans, skills or articles ----------
  function learnBody(mode) {
    if (mode === 'plans' || mode === 'challenges') {
      var kind = mode === 'plans' ? 'plan' : 'challenge';
      function mine(p) { return p.kind === kind; }
      return planBrowserHtml('all-' + mode, kind) + '<div class="stack">' + inProgressSection(activePlans().filter(mine)) + completedSection(finishedPlans().filter(mine)) + '</div>';
    }
    if (mode === 'skills') return '<section class="learn-card"><label class="filter-label" for="sub-pick">Choose a kind of skill</label><div class="select-wrap"><select id="sub-pick"><option value="">Choose one</option>' +
        SKILLS.groups.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + ' (' + SKILLS.skills.filter(function (k) { return k.group === g.id; }).length + ')</option>'; }).join('') +
        '</select>' + ICON.chev + '</div></section><div id="sub-list" class="stack"></div>' +
        '<a class="toolkit-card" href="#pocketbook"><span class="toolkit-icon" aria-hidden="true">' + ICON.bag + '</span><span class="text"><span class="title">Open the Pocketbook</span><span class="lede" style="margin:0">Save your favorite skills to your own pocketbook</span></span>' + ICON.chev + '</a>';
    if (mode === 'articles') return '<section class="learn-card"><label class="filter-label" for="sub-pick">Choose a topic</label><div class="select-wrap"><select id="sub-pick"><option value="">Choose one</option>' +
        DATA.topics.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + ' (' + DATA.articles.filter(function (a) { return a.topic === t.id; }).length + ')</option>'; }).join('') +
        '</select>' + ICON.chev + '</div></section><div id="sub-list" class="stack"></div>';
    return '<div class="topics">' + DATA.topics.map(function (t) {
      var count = DATA.articles.filter(function (a) { return a.topic === t.id; }).length;
      var sk = SKILLS.skills.filter(function (k) { return k.topics.indexOf(t.id) !== -1; }).length;
      var pl = allPaths().filter(function (p) { return p.topics.indexOf(t.id) !== -1; }).length;
      return '<a class="topic" href="#topic-' + esc(t.id) + '" style="background:' + esc(t.color) + '">' +
        '<span class="count">' + [count + ' reads', sk ? sk + (sk === 1 ? ' skill' : ' skills') : '', pl ? pl + (pl === 1 ? ' plan' : ' plans') : ''].filter(Boolean).join(' · ') + '</span>' +
        '<span><span class="name">' + esc(t.name) + '</span><span class="blurb" style="display:block">' + esc(t.blurb) + '</span></span></a>';
    }).join('') + '</div>';
  }
  function wireLearnSub(mode) {
    if (mode === 'plans' || mode === 'challenges') { wirePlanBrowser('all-' + mode, mode === 'plans' ? 'plan' : 'challenge'); wirePlanRemove(function () { viewLearn(mode); }); return; }
    var pick = document.getElementById('sub-pick'), list = document.getElementById('sub-list');
    if (!pick) return;
    pick.addEventListener('change', function () {
      var v = this.value;
      list.innerHTML = !v ? '' : mode === 'articles'
        ? DATA.articles.filter(function (a) { return a.topic === v; }).map(articleRow).join('') + '<a class="text-link" href="#topic-' + esc(v) + '">See plans and skills for this topic too</a>'
        : SKILLS.skills.filter(function (k) { return k.group === v; }).map(skillRow).join('');
    });
  }


  // ---------- router ----------
  function route() {
    var h = (location.hash || '#today').slice(1);
    var prev = route.last || 'today'; route.last = h;
    if (h.indexOf('plan-') === 0 && h.indexOf('--') === -1 && prev.indexOf('plan-') !== 0) { try { sessionStorage.setItem('abg.planOrigin', '#' + prev); } catch (e) {} }
    var tab = 'today';
    if (!/^(article-|skill-|plan-)/.test(h)) { try { sessionStorage.removeItem('abg.planReturn'); } catch (e) {} }
    else if (h.indexOf('plan-') === 0 && h.indexOf('--') === -1) { try { sessionStorage.removeItem('abg.planReturn'); } catch (e) {} }
    if (h === 'learn' || h.indexOf('learn-') === 0) { tab = 'learn'; viewLearn(h.slice(6)); }
    else if (h === 'challenges' || h === 'plans-challenges') { tab = 'today'; viewPlans('challenges'); }
    else if (h === 'plans' || h.indexOf('plans-') === 0) { tab = 'today'; viewPlans(''); }
    else if (h.indexOf('plan-') === 0) { tab = 'today'; var pd = h.slice(5).split('--'); if (pd[1]) viewPlanDay(pd[0], +pd[1]); else viewPlan(pd[0]); }
    else if (h.indexOf('topic-') === 0) { tab = 'learn'; viewTopic(h.slice(6)); }
    else if (h.indexOf('article-') === 0) { tab = 'learn'; viewArticle(h.slice(8)); }
    else if (h === 'toolkit' || h === 'pocketbook') { tab = 'learn'; viewToolkit(); }
    else if (h.indexOf('skill-') === 0) { tab = 'learn'; viewSkill(h.slice(6)); }
    else if (h === 'journal') { tab = 'journal'; if (lockOn() && !unlocked) viewLocked('journal'); else { pauseShownThisVisit = false; viewJournal(); } }
    else if (h === 'saved') { tab = 'saved'; if (lockOn() && !unlocked) viewLocked('saved items'); else viewSaved(); }
    else if (h === 'plus' && PAID) { viewPlus(); }
    else if (h === 'reminders') { tab = 'help'; viewReminders(); }
    else if (h.indexOf('reminders-') === 0) { viewReminderEdit(h.slice(10)); }
    else if (h === 'help') { tab = 'help'; viewHelp(); }
    else if (h === 'about') { tab = 'about'; viewAbout(); }
    else if (h === 'faq') { tab = 'help'; viewFaq(); }
    else if (h.indexOf('practice-') === 0) {
      var pp = h.slice(9).split('--'); tab = 'saved';
      if (!skillById(pp[0])) { location.hash = '#saved'; return; }
      if (pp[1] === 'draft') {
        tab = 'today';
        try { sessionStorage.setItem('abg.planReturn', JSON.stringify({ hash: '#today', label: 'Back to Today' })); } catch (e) {}
        viewSkill(pp[0]);
        setTimeout(function () { var t = document.getElementById('practice'); if (t) { t.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); } }, 60);
      } else {
      viewSkill(pp[0], true);
      setTimeout(function () {
        var past = view.querySelector('.practice-past'), el = document.getElementById('pe-' + pp[1]);
        if (past) past.open = true;
        var target = el || document.getElementById('practice');
        if (target) { target.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); }
        if (el) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1800); }
      }, 60);
    }
    }
    else if (h === 'greeting') { tab = 'today'; viewGreeting(); }
    else if (h.indexOf('idea') === 0) { var ictx = h.slice(5) || 'help'; tab = ictx === 'help' ? 'help' : 'learn'; viewIdea(ictx); }
    else { viewToday(); }
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    if (h === 'today' || h === '') {
      var ys = null; try { ys = sessionStorage.getItem('abg.todayScroll'); sessionStorage.removeItem('abg.todayScroll'); } catch (e) {}
      if (ys) setTimeout(function () { window.scrollTo(0, +ys); }, 30);
    }
    recordDay();
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
    fetch('affirmations.json').then(function (r) { return r.json(); }),
    fetch('articles.json').then(function (r) { return r.json(); }),
    fetch('journal-prompts.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch('about.json').then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch('faq.json').then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch('skills.json').then(function (r) { return r.json(); }).catch(function () { return { groups: [], skills: [] }; }),
    fetch('paid.json').then(function (r) { return r.json(); }).catch(function () { return null; }),
    fetch('paths.json').then(function (r) { return r.json(); }).catch(function () { return { needs: [], plans: [], challenges: [] }; })
  ]).then(function (res) {
    freeArticleIds = null;
    AFFIRMATIONS = res[0]; DATA = res[1]; PROMPTS = res[2]; ABOUT = res[3]; FAQ = res[4]; SKILLS = res[5]; PAID = res[6]; PATHS = res[7];
    checkPlus();
    window.addEventListener('hashchange', route);
    route();
    if (NATIVE) { NATIVE.reminder.schedule(AFFIRMATIONS); NATIVE.custom.schedule(); }
  }).catch(function () {
    view.innerHTML = '<p class="empty">Something didn\'t load. Check your connection and refresh. If you need help right now, call 911 or call/text 988.</p>';
  });

  if (!NATIVE && 'serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }
})();
