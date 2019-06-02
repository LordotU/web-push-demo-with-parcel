import firebase from 'firebase';


firebase.initializeApp({
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
})

const doesNotificationsExist = !! window.Notification
const doesServiceWorkerExist = !! navigator.serviceWorker

const messaging = firebase.messaging()

const errorParagraph = document.getElementById('error')
const showCheckbox = document.getElementById('showCheckbox')
const yourToken = document.getElementById('yourToken')

const clearUi = () => {
  errorParagraph.innerHTML = ''
  showCheckbox.removeAttribute('disabled')
  showCheckbox.checked = false
  yourToken.innerHTML = '&mdash;'
}

const blockUi = (errorText = '') => {
  clearUi()
  errorParagraph.innerHTML = `<strong>${errorText}</strong>`
  showCheckbox.setAttribute('disabled', true)
  yourToken.innerHTML = '&mdash;'
}

const unBlockUi = (token = '') => {
  clearUi()
  showCheckbox.checked = true
  yourToken.innerHTML = token
}

const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission()

    switch (true) {
      case permission === 'denied':
        blockUi('You should allow Notifications permission for this page!')
        return false
      case permission === 'granted':
        return true
      default:
        throw new Error('Notification request was ignored by user!')
    }
  } catch (error) {
    console.error('requestPermission', error)
  }

  return false
}

const registerServiceWorker = async () => {
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')

    reg.update()
    messaging.useServiceWorker(reg)

    console.debug('serviceWorker is registered!', reg)
  } catch (error) {
    console.error('registerServiceWorker', error)
  }
}

const getToken = async () => {
  try {
    const token = await messaging.getToken()

    if (! token) {
      throw new Error('No Instance ID token available. Request permission to generate one')
    }

    unBlockUi(token)
    saveToken(token)
  } catch (error) {
    blockUi(error.message)
    console.error('getToken', error)
  }
}

const saveToken = (token) => {
  window.localStorage.setItem('webPushDemoToken', token)
}

const hasToken = () => {
  return window.localStorage.getItem('webPushDemoToken')
}

const deleteToken = async () => {
  const token = hasToken()
  if (!! token) {
    await messaging.deleteToken(token)
    window.localStorage.removeItem('webPushDemoToken')
  }
}

let isServiceWorkerRegistered = false

export default (async () => {
  if (! doesNotificationsExist) {
    blockUi('Notification doesn\'t exist!')
    return
  }

  if (! doesServiceWorkerExist) {
    blockUi('serviceWorker doesn\'t exist!')
    return
  }

  if (Notification.permission === 'denied') {
    blockUi('You should allow Notifications permission for this page!')
    return
  }

  try {
    const token = hasToken()
    if (!! token) {
      unBlockUi(token)
    }

    showCheckbox.addEventListener('change', async () => {
      if (! showCheckbox.checked) {
        await deleteToken()
        clearUi()
        return
      }

      if (! await requestPermission()) {
        showCheckbox.checked = false
        return
      }

      if (! isServiceWorkerRegistered) {
        await registerServiceWorker()
        isServiceWorkerRegistered = true
      }

      await getToken()
      messaging.onTokenRefresh(async () => {
        await getToken()
      })
    })

  } catch (error) {
    console.error('Notification error!', error)
  }
})()
