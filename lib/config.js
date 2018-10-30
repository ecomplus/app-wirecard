'use strict'
require('dotenv').config()
module.exports = {
  WC_TOKEN: process.env.WC_TOKEN,
  WC_CHAVE: process.env.WC_CHAVE,
  WC_SANDBOX: (process.env.WC_SANDBOX === 'true'),
  WC_ID: process.env.WC_ID,
  WC_ACCESS_TOKEN: process.env.WC_ACCESS_TOKEN,
  WC_APP_NAME: process.env.WC_APP_NAME,
  WC_APP_SECRET: process.env.WC_APP_SECRET,
  WC_REDIRECT_URI: process.env.WC_REDIRECT_URI,
  WC_SCOPE: process.env.WC_SCOPE.split(','),
  TABLE_NAME: process.env.TABLE_NAME,
  BD_PATH: process.env.BD_PATH
}
