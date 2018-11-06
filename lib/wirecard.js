const auth = require('./wirecard/authentication')
const customers = require('./wirecard/customers')
const payments = require('./wirecard/payment')
const webhooks = require('./wirecard/webhooks')

module.exports = {
  auth,
  customers,
  payments,
  webhooks
}
