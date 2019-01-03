'use strict'

const isSandbox = require('../config').WC_SANDBOX || false

let authorizePaymentSimulationUrl = 'https://sandbox.moip.com.br/simulador/authorize'
let generateTokenUrl, authorizeUrl

if (isSandbox) {
  generateTokenUrl = 'https://connect-sandbox.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect-sandbox.moip.com.br/oauth/authorize'
} else {
  generateTokenUrl = 'https://connect.moip.com.br/oauth/token'
  authorizeUrl = 'https://connect.moip.com.br/oauth/authorize'
}

module.exports = {
  generateTokenUrl,
  authorizeUrl,
  authorizePaymentSimulationUrl
}
