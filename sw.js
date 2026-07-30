// Service Worker - 排班提醒应用
const CACHE_NAME = 'shift-reminder-v12';
const ASSETS = [
  'shift-reminder.html',
  'manifest.json'
];

// 安装：缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.log('缓存部分资源失败，不影响使用:', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 离线优先策略
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 有缓存就返回缓存，同时后台更新
      if (cached) {
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
        }).catch(() => {});
        return cached;
      }
      // 没缓存就请求网络
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // 离线且无缓存，返回首页
        if (event.request.mode === 'navigate') {
          return caches.match('shift-reminder.html');
        }
      });
    })
  );
});

// 通知点击
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // 如果已有打开的窗口，聚焦它
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // 否则打开新窗口
      if (clients.openWindow) return clients.openWindow('shift-reminder.html');
    })
  );
});
