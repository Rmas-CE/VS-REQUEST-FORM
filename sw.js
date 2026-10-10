/* VaultSync Request & Proof — offline helper.
   Keeps the app shell on the phone so the installed app opens fast and still opens with a
   weak signal. Pages are always fetched fresh first (so updates show right away); the saved
   copy is used only when there is no connection. Data from Google Sheets is never cached here. */
const CACHE = 'vs-request-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;            // Google Sheets, fonts, etc. go straight to the network
  if(req.mode === 'navigate'){
    e.respondWith(fetch(req).then(res=>{
      const copy = res.clone(); caches.open(CACHE).then(c=>c.put('./index.html', copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch:true}).then(hit=>{
    const net = fetch(req).then(res=>{ if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{}); } return res; });
    return hit || net;
  }));
});
