'use strict'
require('dotenv').config()
const env = process.env

module.exports = {
  WC_TOKEN: env.WC_TOKEN,
  WC_CHAVE: env.WC_CHAVE,
  WC_SANDBOX: (env.WC_SANDBOX === 'true'),
  WC_ID: env.WC_ID,
  WC_ACCESS_TOKEN: env.WC_ACCESS_TOKEN,
  WC_APP_NAME: env.WC_APP_NAME,
  WC_APP_SECRET: env.WC_APP_SECRET,
  WC_REDIRECT_URI: env.WC_REDIRECT_URI
}
