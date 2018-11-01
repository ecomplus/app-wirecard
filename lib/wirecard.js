let auth = require('./wirecard/authentication')
let customers = require('./wirecard/customers')
let payments = require('./wirecard/payment')

module.exports = {
  auth,
  customers,
  payments
}
