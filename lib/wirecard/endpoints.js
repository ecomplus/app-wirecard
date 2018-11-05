let url,
  authorizePaymentSimulationUrl,
  generateTokenUrl,
  authorizeUrl,
  keys,
  accounts,
  customers,
  orders,
  webhooks,
  payment

if (require('../config').WC_SANDBOX === true) {
  url = 'https://sandbox.moip.com.br/v2'
  authorizePaymentSimulationUrl = 'https://sandbox.moip.com.br/simulador/authorize'
  generateTokenUrl = 'https://connect-sandbox.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect-sandbox.moip.com.br/oauth/authorize'
  keys = 'https://sandbox.moip.com.br/v2/keys'
  accounts = 'https://sandbox.moip.com.br/v2/accounts'
  customers = 'https://sandbox.moip.com.br/v2/customers'
  orders = 'https://sandbox.moip.com.br/v2/orders'
  webhooks = 'https://sandbox.moip.com.br/v2/preferences/'
  payment = 'https://sandbox.moip.com.br/v2/payments/'
} else {
  url = 'https://api.moip.com.br/v2'
  generateTokenUrl = 'https://connect.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect.moip.com.br/oauth/authorize'
  keys = 'https://api.moip.com.br/v2/keys'
  accounts = 'https://api.moip.com.br/v2/accounts'
  customers = 'https://moip.com.br/v2/customers'
  orders = 'https://sandbox.moip.com.br/v2/orders'
  webhooks = 'https://moip.com.br/v2/preferences/'
  payment = 'https://moip.com.br/v2/payments/'
}

module.exports = {
  url: url,
  authorizePaymentSimulationUrl: authorizePaymentSimulationUrl, // only sandbox
  generateTokenUrl: generateTokenUrl,
  authorizeUrl: authorizeUrl,
  keys: keys,
  accounts: accounts,
  customers: customers,
  orders: orders,
  webhooks: webhooks,
  payment: payment
}
