/* Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. Unauthorized copying or reuse is prohibited. See LICENSE. */
/* Runs only inside the iPhone and Android apps (the website never loads this file).
   1. Keeps saved items and journal entries in the phone's app storage, which survives
      when the phone clears website data. Nothing leaves the phone.
   2. Uses the phone's share sheet for images and text.
   3. Schedules the optional daily affirmation reminder (local only, no server, no tracking).
   Then it loads app.js. */
(function () {
  'use strict';
  var C = window.Capacitor;
  var native = !!(C && C.isNativePlatform && C.isNativePlatform());
  var P = (C && C.Plugins) || {};
  var REMINDER_KEY = 'abg.reminder';
  var FIRST_ID = 1000, DAYS = 30;

  function loadApp() {
    if (loadApp.done) return; loadApp.done = true;
    var s = document.createElement('script'); s.src = 'app.js'; document.body.appendChild(s);
  }

  // ---------- storage ----------
  function save(key, json) {
    if (native && P.Preferences) P.Preferences.set({ key: key, value: json }).catch(function () {});
  }
  function restore() {
    if (!native || !P.Preferences) return Promise.resolve();
    return P.Preferences.keys().then(function (r) {
      var keys = (r && r.keys) || [];
      return Promise.all(keys.map(function (k) {
        return P.Preferences.get({ key: k }).then(function (v) {
          if (v && v.value != null) { try { localStorage.setItem(k, v.value); } catch (e) {} }
        });
      }));
    }).then(function () {
      // Copy anything that exists only in web storage into app storage.
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('abg.') === 0) save(k, localStorage.getItem(k));
        }
      } catch (e) {}
    });
  }

  // ---------- sharing ----------
  function blobToBase64(blob) {
    return new Promise(function (ok, fail) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(',')[1]); };
      r.onerror = fail;
      r.readAsDataURL(blob);
    });
  }
  function shareImage(blob, caption) {
    return blobToBase64(blob).then(function (b64) {
      return P.Filesystem.writeFile({ path: 'anxious-black-girls-affirmation.png', data: b64, directory: 'CACHE' });
    }).then(function (res) {
      return P.Share.share({ text: caption, files: [res.uri], dialogTitle: 'Share your affirmation' });
    }).catch(function () {});
  }
  function shareText(msg) {
    return P.Share.share({ text: msg, dialogTitle: 'Share your affirmation' }).catch(function () {});
  }

  // ---------- daily affirmation reminder ----------
  function getReminder() {
    try { var v = JSON.parse(localStorage.getItem(REMINDER_KEY)); if (v && v.time) return v; } catch (e) {}
    return { on: false, time: '08:00' };
  }
  function setReminder(v) {
    var json = JSON.stringify(v);
    try { localStorage.setItem(REMINDER_KEY, json); } catch (e) {}
    save(REMINDER_KEY, json);
  }
  function dayNumberOf(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function cancelAll() {
    var ids = [];
    for (var i = 0; i < DAYS + 5; i++) ids.push({ id: FIRST_ID + i });
    return P.LocalNotifications.cancel({ notifications: ids }).catch(function () {});
  }
  // Schedules the next 30 days, each with that day's affirmation. Runs every time the app opens.
  function schedule(affirmations) {
    if (!native || !P.LocalNotifications) return Promise.resolve();
    var r = getReminder();
    return cancelAll().then(function () {
      if (!r.on || !affirmations || !affirmations.length) return;
      return P.LocalNotifications.checkPermissions().then(function (p) {
        if (p.display !== 'granted') return;
        var hm = r.time.split(':'), now = new Date(), list = [];
        for (var d = 0; list.length < DAYS && d < DAYS + 1; d++) {
          var at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, +hm[0], +hm[1], 0, 0);
          if (at <= now) continue;
          var aff = window.ABGAffirmationFor ? window.ABGAffirmationFor(at, affirmations) : affirmations[dayNumberOf(at) % affirmations.length];
          list.push({ id: FIRST_ID + list.length, title: 'Today\'s affirmation', body: aff.text, schedule: { at: at, allowWhileIdle: true }, extra: { route: 'today' } });
        }
        return P.LocalNotifications.schedule({ notifications: list });
      });
    }).catch(function () {});
  }
  // Turning it on asks the phone for permission. Resolves with the saved setting.
  function turnOn(time, affirmations) {
    return P.LocalNotifications.requestPermissions().then(function (p) {
      if (p.display !== 'granted') return { on: false, time: time, denied: true };
      setReminder({ on: true, time: time });
      return schedule(affirmations).then(function () { return getReminder(); });
    });
  }
  function turnOff(affirmations) {
    var r = getReminder(); r.on = false; setReminder(r);
    return schedule(affirmations).then(function () { return r; });
  }
  function changeTime(time, affirmations) {
    var r = getReminder(); r.time = time; setReminder(r);
    return schedule(affirmations).then(function () { return r; });
  }

  // ---------- custom reminders (Plus): her own reminders, local only ----------
  // Each reminder: { id, title, note, time "HH:MM", repeat "once"|"daily"|"weekdays"|"days", days [1-7, 1 = Sunday], date "YYYY-MM-DD" (once), on }
  var CUSTOM_KEY = 'abg.reminders', CUSTOM_FIRST = 2000, SNOOZE_FIRST = 2900, SLOTS = 30;
  function getCustom() {
    try { var v = JSON.parse(localStorage.getItem(CUSTOM_KEY)); if (Array.isArray(v)) return v; } catch (e) {}
    return [];
  }
  function setCustom(list) {
    var json = JSON.stringify(list);
    try { localStorage.setItem(CUSTOM_KEY, json); } catch (e) {}
    save(CUSTOM_KEY, json);
  }
  // How many notification slots a reminder uses (iPhones allow 64 per app; the affirmation uses 30).
  function slotsFor(r) {
    if (r.repeat === 'weekdays') return 5;
    if (r.repeat === 'days') return Math.max(1, (r.days || []).length);
    return 1;
  }
  function usedSlots(list) {
    return list.filter(function (r) { return r.on; }).reduce(function (n, r) { return n + slotsFor(r); }, 0);
  }
  function cancelCustom() {
    var ids = [];
    for (var i = CUSTOM_FIRST; i < CUSTOM_FIRST + 600; i++) ids.push({ id: i });
    return P.LocalNotifications.cancel({ notifications: ids }).catch(function () {});
  }
  function scheduleCustom() {
    if (!native || !P.LocalNotifications) return Promise.resolve();
    var list = getCustom();
    return cancelCustom().then(function () {
      return P.LocalNotifications.checkPermissions();
    }).then(function (p) {
      if (!p || p.display !== 'granted') return;
      var out = [], now = new Date();
      list.forEach(function (r, i) {
        if (!r.on) return;
        var hm = (r.time || '09:00').split(':'), h = +hm[0], m = +hm[1];
        var base = { title: r.title, body: r.note || 'A reminder from you, to you.', actionTypeId: 'ABG_REMINDER', extra: { route: 'today', reminder: r.id } };
        var id = CUSTOM_FIRST + i * 10;
        function add(sch, k) { var n = Object.assign({}, base); n.id = id + k; n.schedule = sch; out.push(n); }
        if (r.repeat === 'once') {
          var d = (r.date || '').split('-');
          var at = d.length === 3 ? new Date(+d[0], +d[1] - 1, +d[2], h, m) : null;
          if (at && at > now) add({ at: at, allowWhileIdle: true }, 0);
        } else if (r.repeat === 'daily') {
          add({ on: { hour: h, minute: m }, allowWhileIdle: true }, 0);
        } else {
          var days = r.repeat === 'weekdays' ? [2, 3, 4, 5, 6] : (r.days || []);
          days.forEach(function (wd, k) { add({ on: { weekday: wd, hour: h, minute: m }, allowWhileIdle: true }, k); });
        }
      });
      if (out.length) return P.LocalNotifications.schedule({ notifications: out });
    }).catch(function () {});
  }
  function saveCustom(list) {
    setCustom(list);
    return P.LocalNotifications.requestPermissions().then(function (p) {
      if (!p || p.display !== 'granted') return { denied: true };
      return scheduleCustom().then(function () { return {}; });
    }, function () { return { denied: true }; });
  }
  function snooze(notification, minutes) {
    var id = SNOOZE_FIRST + Math.floor(Math.random() * 90);
    return P.LocalNotifications.schedule({ notifications: [{
      id: id, title: notification.title, body: notification.body, actionTypeId: 'ABG_REMINDER',
      schedule: { at: new Date(Date.now() + minutes * 60000), allowWhileIdle: true }, extra: notification.extra || {}
    }] }).catch(function () {});
  }
  if (native && P.LocalNotifications && P.LocalNotifications.registerActionTypes) {
    P.LocalNotifications.registerActionTypes({ types: [{ id: 'ABG_REMINDER', actions: [
      { id: 'snooze10', title: 'Snooze 10 minutes' },
      { id: 'snooze60', title: 'Snooze 1 hour' }
    ] }] }).catch(function () {});
  }

  // ---------- delete everything on this phone ----------
  function clearAll() {
    try {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('abg.') === 0) keys.push(k); }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    return Promise.all([
      cancelAll(),
      cancelCustom(),
      P.Preferences ? P.Preferences.clear().catch(function () {}) : null
    ]);
  }

  // ---------- Face ID / passcode lock ----------
  function lockAvailable() {
    if (!P.NativeBiometric) return Promise.resolve(false);
    return P.NativeBiometric.isAvailable({ useFallback: true })
      .then(function (r) { return !!(r && r.isAvailable); })
      .catch(function () { return false; });
  }
  function unlock(reason) {
    if (!P.NativeBiometric) return Promise.resolve(false);
    return P.NativeBiometric.verifyIdentity({ reason: reason, title: 'Unlock', useFallback: true })
      .then(function () { return true; }, function () { return false; });
  }

  // ---------- App Store rating prompt (Apple decides whether to show it) ----------
  function askForRating() {
    if (P.InAppReview) P.InAppReview.requestReview().catch(function () {});
  }

  // ---------- purchases (StoreKit through the App Store; no server, no account) ----------
  function getProducts(ids) {
    if (!P.NativePurchases) return Promise.resolve([]);
    return P.NativePurchases.getProducts({ productIdentifiers: ids, productType: 'subs' })
      .then(function (r) { return (r && r.products) || []; }, function () { return []; });
  }
  function buy(id) {
    return P.NativePurchases.purchaseProduct({ productIdentifier: id, productType: 'subs' });
  }
  function owned(ids) {
    if (!P.NativePurchases) return Promise.resolve(false);
    return P.NativePurchases.getPurchases({ productType: 'subs', onlyCurrentEntitlements: true }).then(function (r) {
      return ((r && r.purchases) || []).some(function (t) {
        return ids.indexOf(t.productIdentifier) !== -1 && t.isActive !== false;
      });
    }, function () { return false; });
  }
  function restorePurchases() {
    return P.NativePurchases.restorePurchases();
  }
  function manageSubscription() {
    if (P.NativePurchases) P.NativePurchases.manageSubscriptions().catch(function () {});
  }

  window.ABGNative = {
    native: native,
    save: save,
    shareImage: shareImage,
    shareText: shareText,
    clearAll: clearAll,
    lock: { available: lockAvailable, unlock: unlock },
    askForRating: askForRating,
    purchases: { products: getProducts, buy: buy, owned: owned, restore: restorePurchases, manage: manageSubscription },
    reminder: { get: getReminder, schedule: schedule, turnOn: turnOn, turnOff: turnOff, changeTime: changeTime },
    custom: { get: getCustom, save: saveCustom, schedule: scheduleCustom, slotsFor: slotsFor, usedSlots: usedSlots, maxSlots: SLOTS }
  };

  if (native && P.LocalNotifications) {
    P.LocalNotifications.addListener('localNotificationActionPerformed', function (e) {
      var a = e && e.actionId;
      if (a === 'snooze10' || a === 'snooze60') { snooze(e.notification || {}, a === 'snooze10' ? 10 : 60); return; }
      location.hash = '#today';
    });
  }

  // Load the app after saved data is restored (or after 2 seconds at most).
  setTimeout(loadApp, 2000);
  restore().then(loadApp, loadApp);
})();
