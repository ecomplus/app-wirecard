// wirecard sdk
const initClient = require('./init-client')

module.exports = (paymentId, options) => {
  const wirecard = initClient({ options })
  return wirecard.payment.getOne(paymentId)
}
