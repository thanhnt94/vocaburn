self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body || "It's time to review your cards!",
        icon: '/static/dist/favicon.png',
        badge: '/static/dist/favicon.png',
        data: {
          url: payload.url || '/'
        }
      };
      event.waitUntil(
        self.registration.showNotification(payload.title || "Vocaburn Reminder", options)
      );
    } catch (e) {
      const options = {
        body: event.data.text()
      };
      event.waitUntil(
        self.registration.showNotification("Vocaburn Reminder", options)
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
