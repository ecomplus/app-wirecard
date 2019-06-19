'use strict'
const qs = require('querystring')
require('dotenv').config() // debug
module.exports = () => {
  return (req, res) => {
    const { x_store_id } = req.query

    if (!x_store_id) {
      return res.status(400).send('X-Store-Id not found at request.')
    }

    let appEnv = (process.env.WC_SANDBOX === 'true') ? 'https://connect-sandbox.' : 'https://connect.'
    let wirecardUri = appEnv + 'moip.com.br/oauth/authorize'

    let wirecardParams = qs.stringify({
      response_type: 'code',
      client_id: process.env.WC_ID,
      redirect_uri: process.env.WC_REDIRECT_URI + '?storeId=' + x_store_id,
      scope: process.env.WC_SCOPE
    })

    let url = wirecardUri + '?' + wirecardParams

    return res.redirect(301, url)
  }
}
