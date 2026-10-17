/* 채움 — 인터넷이 끊겨도 편집기가 열리도록 한 번 받아 둔 것을 쓴다.
 *
 *  · 이 사이트의 파일   : 늘 새로 받아 보고, 받지 못하면 받아 둔 것을 쓴다 (고친 내용이 바로 반영된다)
 *  · cdn.jsdelivr.net  : 판 번호가 박힌 라이브러리·글꼴이라 받아 둔 것을 먼저 쓴다
 */
const CACHE = "chaeum-v1";

const CORE = [
  "./editor.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./favicon.ico"
];

/* 편집기가 쓰는 라이브러리 — 처음 설치할 때 미리 받아 둔다 */
const LIBS = [
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
  "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf"
];

const WAIT = 4000;   // 이만큼 기다려도 답이 없으면 받아 둔 것을 쓴다

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    await Promise.all(LIBS.map(u => c.add(u).catch(() => {})));   // 하나 못 받아도 설치는 마친다
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(fresh(req, e));
  else if (url.hostname === "cdn.jsdelivr.net") e.respondWith(kept(req));
});

/* 새로 받아 보고, 늦거나 못 받으면 받아 둔 것 */
async function fresh(req, e) {
  const c = await caches.open(CACHE);
  const net = fetch(req).then(res => {
    if (res.ok) c.put(req, res.clone());
    return res;
  });
  e.waitUntil(net.catch(() => {}));                 // 늦게라도 받으면 다음을 위해 담아 둔다
  const late = new Promise(ok => setTimeout(ok, WAIT));
  try {
    const res = await Promise.race([net, late]);
    if (res) return res;
  } catch (err) { /* 끊겼다 */ }
  const old = await c.match(req, { ignoreSearch: true });
  return old || net;
}

/* 받아 둔 것이 있으면 그것을, 없으면 받아서 담아 둔다 */
async function kept(req) {
  const c = await caches.open(CACHE);
  const old = await c.match(req);
  if (old) return old;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") c.put(req, res.clone());
  return res;
}
