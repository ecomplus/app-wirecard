// wirecard sdk
const initClient = require('./init-client')

module.exports = (orderBody, options) => {
  const wirecard = initClient({ options })
  return wirecard.order.create(orderBody)
}
