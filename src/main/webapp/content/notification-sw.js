self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('push', event => {
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Baara Boloda', {
      body: data.body || 'Nouvelle notification',
      icon: '/content/images/figma-logo-cra.png',
      tag: 'notification-' + data.id,
      data: { url: /^\/projects\/\d+\/tasks\/\d+$/.test(data.url) ? data.url : '/dashboard' },
    }),
  );
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
      for (const client of clients)
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(url);
          return client.focus();
        }
      return self.clients.openWindow(url);
    }),
  );
});
