/* Chiang Mai Trip — service worker.
   Стратегия network-first с фолбэком в кэш: онлайн всегда показывается свежая версия,
   офлайн — последняя сохранённая. Cache-first здесь не годился: он отдавал старую
   оболочку до второй перезагрузки после каждого деплоя. */

const CACHE_NAME = "ec-trip-v8";

/* Сколько ждём сеть, прежде чем уйти в кэш. На плохой связи приложение
   не должно висеть на белом экране — лучше показать сохранённую копию. */
const NETWORK_TIMEOUT = 4000;

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./east-china-trip-data.i18n.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(
        /* cache: "reload" обязателен: GitHub Pages отдаёт max-age=600, и без этого
           в новый кэш попали бы файлы десятиминутной давности, то есть до деплоя. */
        APP_SHELL.map((url) => new Request(url, { cache: "reload" }))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("network timeout")), NETWORK_TIMEOUT);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

function fromCache(request) {
  return caches.match(request, { ignoreSearch: true }).then((cached) => {
    if (cached) return cached;
    /* Навигация на ещё не виденный URL внутри приложения — отдаём оболочку */
    if (request.mode === "navigate") return caches.match("./index.html");
    return null;
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ссылки на Google Maps не перехватываем

  event.respondWith(
    fromNetwork(request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }
        /* 404/5xx — сохранённая копия полезнее ошибки */
        return fromCache(request).then((cached) => cached || response);
      })
      .catch(() => fromCache(request).then((cached) => cached || Response.error()))
  );
});
