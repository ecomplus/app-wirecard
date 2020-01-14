// wirecard sdk
const initClient = require('./init-client')

module.exports = (webhook, options) => {
  const wirecard = initClient({ options })
  return wirecard.notification.create(webhook)
}
