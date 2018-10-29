const config = require('../config')
let url,
  authorizePaymentSimulationUrl,
  generateTokenUrl,
  authorizeUrl,
  keys,
  accounts,
  customers

if (config.WC_SANDBOX === true) {
  url = 'https://sandbox.moip.com.br/v2'
  authorizePaymentSimulationUrl = 'https://sandbox.moip.com.br/simulador/authorize'
  generateTokenUrl = 'https://connect-sandbox.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect-sandbox.moip.com.br/oauth/authorize'
  keys = 'https://sandbox.moip.com.br/v2/keys'
  accounts = 'https://sandbox.moip.com.br/v2/accounts'
  customers = 'https://sandbox.moip.com.br/v2/customers'
} else {
  url = 'https://api.moip.com.br/v2'
  generateTokenUrl = 'https://connect.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect.moip.com.br/oauth/authorize'
  keys = 'https://api.moip.com.br/v2/keys'
  accounts = 'https://api.moip.com.br/v2/accounts'
  customers = 'https://moip.com.br/v2/customers'
}

let ends = {
  url: url,
  authorizePaymentSimulationUrl: authorizePaymentSimulationUrl, // only sandbox
  generateTokenUrl: generateTokenUrl,
  authorizeUrl: authorizeUrl,
  keys: keys,
  accounts: accounts,
  customers: customers
}

module.exports = ends
