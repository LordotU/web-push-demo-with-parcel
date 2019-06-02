var serviceWorkerRegistration = self.registration
var serviceWorkerClients = self.clients

self.addEventListener('install', function (event) {
  console.debug('firebase-messaging-sw:install', event)

  event.waitUntil(
    console.debug('serviceWorker is installed!')
  )
})

self.addEventListener('activate', function (event) {
  console.debug('firebase-messaging-sw:activate', event)

  event.waitUntil(
    console.debug('serviceWorker is activated!')
  )
})

self.addEventListener('push', function (event) {
  console.debug('firebase-messaging-sw:push', event)

  if (! event.data) {
    console.error(new Error('Push event without data field can not be handled!'))
    return
  }

  var eventData = event.data.json()
  console.debug('firebase-messaging-sw:eventData', eventData)

  var notification = Object.assign(
    {},
    {
      data: Object.assign(
        {},
        eventData.data,
        {
          onPushEventStatUrl: '/pushSentStatisticsHandlingUrl/' + eventData.data.uuid,
          onNotificationClickStatUrl: '/pushClickStatisticsHandlingUrl/' + eventData.data.uuid
        }
      )
    },
    eventData.notification,
  )
  console.debug('firebase-messaging-sw:notification', notification)

  handleNotificationStatistics('notificationPushed', notification)

  event.waitUntil(
    serviceWorkerRegistration.showNotification(eventData.notification.title, notification)
  )
})

self.addEventListener('notificationclick', function (event) {
  console.debug('firebase-messaging-sw:notificationclick', event)

  handleNotificationStatistics('notificationClicked', event.notification)

  event.preventDefault()
  event.notification.close()

  event.waitUntil(
    clickActionUrlHandler(event.notification.data.action_url)
  )
})

self.addEventListener('notificationclose', function (event) {
  console.debug('firebase-messaging-sw:notificationclose', event)
})

function clickActionUrlHandler(url) {
  console.debug('clickActionUrlHandler', url)

  return serviceWorkerClients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  }).then(function (clients) {
    console.debug('firebase-messaging-sw:clickActionUrlHandler clients', clients)

    for (i = 0; i < clients.length; i++) {
      if (clients[i].url === url) {

        console.debug('firebase-messaging-sw:clickActionUrlHandler client found', clients[i])

        clients[i].focus()
        return
      }
    }

    console.debug('firebase-messaging-sw:clickActionUrlHandler open window', url)
    serviceWorkerClients.openWindow(url)
  })
}

function handleNotificationStatistics(eventName, notification) {
  console.debug('firebase-messaging-sw:handleNotificationStatistics', eventName, notification)

  switch (true) {
    case eventName === 'notificationPushed' && !! notification.data.onPushEventStatUrl:
      makeRequest(notification.data.onPushEventStatUrl)
      return
    case eventName === 'notificationClicked' && !! notification.data.onNotificationClickStatUrl:
      makeRequest(notification.data.onNotificationClickStatUrl)
      return
  }
}

function makeRequest (url) {
  fetch(new Request(url, { mode: 'cors' }))
    .then(function (response) {
      if (! response.ok) {
        return Promise.reject(new Error(response.statusText))
      }

      console.debug('firebase-messaging-sw:makeRequest success', url);
    }).catch(function (error) {
      console.error('firebase-messaging-sw:makeRequest error', url, error);
    })
}
