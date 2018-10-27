const config = require('../config')
let url,
  authorizePaymentSimulationUrl,
  generateTokenUrl,
  authorizeUrl,
  keys

if (config.WC_SANDBOX === true) {
  url = 'https://sandbox.moip.com.br/v2'
  authorizePaymentSimulationUrl = 'https://sandbox.moip.com.br/simulador/authorize'
  generateTokenUrl = 'https://connect-sandbox.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect-sandbox.moip.com.br/oauth/authorize'
  keys = 'https://sandbox.moip.com.br/v2/keys'
} else {
  url = 'https://api.moip.com.br/v2'
  generateTokenUrl = 'https://connect.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect.moip.com.br/oauth/authorize'
  keys = 'https://api.moip.com.br/v2/keys'
}

let ends = {
  url: url,
  authorizePaymentSimulationUrl: authorizePaymentSimulationUrl, // only sandbox
  generateTokenUrl: generateTokenUrl,
  authorizeUrl: authorizeUrl,
  keys: keys
}

module.exports = ends
