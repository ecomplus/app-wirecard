// wirecard sdk
const initClient = require('./init-client')

module.exports = (orderId, orderBody, options) => {
  const wirecard = initClient({ options })
  return wirecard.payment.create(orderId, orderBody)
}
