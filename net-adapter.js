/* Realtime adapter.
   The game talks to a tiny "room" interface: join(name) -> { emit, on, presence, peers, onPeers, connected, onConnection, leave }.
   This file implements it on top of Supabase Realtime (Broadcast + Presence). No database tables are used.
   To use another provider (Ably, PartyKit, Pusher, your own WebSocket server...) re-implement join() below and keep the same shape. */
(function () {
  'use strict';
  if (window.claude) return;
  var cfg = window.CPB_CONFIG || {};
  var client = null;
  var ME = (function () {
    var a = new Uint8Array(8);
    (window.crypto || { getRandomValues: function (x) { for (var i = 0; i < x.length; i++) x[i] = Math.random() * 256; return x; } }).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  })();

  function getClient() {
    if (client) return client;
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) return null;
    client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { realtime: { params: { eventsPerSecond: 40 } } });
    return client;
  }
  function clean(o) { var r = {}; for (var k in o) if (k !== 'presence_ref') r[k] = o[k]; return r; }
  function peerObj(peer, presence, isMe) {
    return Object.freeze({ peer: peer, presence: Object.freeze(presence), isMe: isMe, sameTab: isMe, kind: 'viewer', guest: false, by: null, updatedAt: 0 });
  }

  async function join(name) {
    var c = getClient();
    if (!c) throw { code: 'not_permitted', message: 'realtime not configured' };
    if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(name)) throw { code: 'invalid_argument', message: 'bad room name' };
    var ch = c.channel(name, { config: { broadcast: { self: false, ack: false }, presence: { key: ME } } });
    var handlers = {}, peerCbs = [], connCbs = [], connected = false, left = false, mine = {}, settled = false;

    function snapshot() {
      var st = ch.presenceState(), out = [peerObj(ME, Object.assign({}, mine), true)];
      for (var key in st) {
        if (key === ME) continue;
        var a = st[key];
        out.push(peerObj(key, a && a.length ? clean(a[a.length - 1]) : {}, false));
      }
      return out;
    }
    function notify() {
      if (left) return;
      var ps = snapshot();
      peerCbs.slice().forEach(function (f) { try { f({ peers: ps, joined: [], left: [], updated: [] }); } catch (e) { console.error(e); } });
    }
    function setConn(v) {
      if (connected === v) return;
      connected = v;
      connCbs.slice().forEach(function (f) { try { f(v); } catch (e) {} });
    }

    ch.on('broadcast', { event: 'm' }, function (ev) {
      var p = ev && ev.payload;
      if (!p || typeof p.t !== 'string' || p.p === ME) return;
      var hs = handlers[p.t];
      if (!hs) return;
      var msg = { topic: p.t, data: p.d, peer: p.p, isMe: false, sameTab: false, kind: 'viewer', guest: false, by: null };
      hs.slice().forEach(function (f) { try { f(msg); } catch (e) { console.error(e); } });
    });
    ch.on('presence', { event: 'sync' }, notify);

    await new Promise(function (resolve, reject) {
      var to = setTimeout(function () { if (!settled) { settled = true; reject({ code: 'upstream_error', message: 'timeout' }); } }, 10000);
      ch.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {            // also fires again after an automatic reconnect: presence is re-asserted
          setConn(true);
          Promise.resolve(ch.track(mine)).catch(function () {});
          if (!settled) { settled = true; clearTimeout(to); resolve(); }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConn(false);
          if (!settled) { settled = true; clearTimeout(to); reject({ code: 'upstream_error', message: status }); }
        }
      });
    });

    return {
      name: name,
      async emit(topic, data) {
        if (left || !connected) return;
        if (JSON.stringify(data === undefined ? null : data).length > 4096) throw { code: 'invalid_argument', message: 'payload too large' };
        try { await ch.send({ type: 'broadcast', event: 'm', payload: { t: topic, d: data, p: ME } }); } catch (e) {}
      },
      on: function (topic, fn) {
        (handlers[topic] = handlers[topic] || []).push(fn);
        return function () { handlers[topic] = (handlers[topic] || []).filter(function (x) { return x !== fn; }); };
      },
      async presence(patch) {
        var n = Object.assign({}, mine);
        for (var k in patch) { if (patch[k] === null) delete n[k]; else n[k] = patch[k]; }
        mine = n;
        notify();
        if (connected) { try { await ch.track(mine); } catch (e) {} }
      },
      peers: snapshot,
      onPeers: function (fn) {
        peerCbs.push(fn);
        Promise.resolve().then(function () { if (!left) fn({ peers: snapshot(), joined: [], left: [], updated: [] }); });
        return function () { peerCbs = peerCbs.filter(function (x) { return x !== fn; }); };
      },
      connected: function () { return connected && !left; },
      onConnection: function (fn) {
        connCbs.push(fn);
        Promise.resolve().then(function () { fn(connected); });
        return function () { connCbs = connCbs.filter(function (x) { return x !== fn; }); };
      },
      async leave() {
        left = true; connCbs.length = 0; peerCbs.length = 0;
        try { await c.removeChannel(ch); } catch (e) {}
      }
    };
  }

  window.claude = {
    use: async function (name) { return name === 'room' && getClient() ? { join: join } : null; }
  };
})();
