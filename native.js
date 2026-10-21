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
          var aff = affirmations[dayNumberOf(at) % affirmations.length];
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

  window.ABGNative = {
    native: native,
    save: save,
    shareImage: shareImage,
    shareText: shareText,
    reminder: { get: getReminder, schedule: schedule, turnOn: turnOn, turnOff: turnOff, changeTime: changeTime }
  };

  if (native && P.LocalNotifications) {
    P.LocalNotifications.addListener('localNotificationActionPerformed', function () { location.hash = '#today'; });
  }

  // Load the app after saved data is restored (or after 2 seconds at most).
  setTimeout(loadApp, 2000);
  restore().then(loadApp, loadApp);
})();
