'use strict'
const logger = require('console-files')
const { authentications } = require('./../../lib/database')
const initClient = require('./../../lib/wirecard-api/init-client')

module.exports = () => (req, res) => {
  const { code, storeId } = req.query
  const options = {
    token: process.env.WC_TOKEN,
    key: process.env.WC_CHAVE,
    production: (!process.env.WC_SANDBOX)
  }

  const wirecard = initClient({ options })
  wirecard.connect.generateToken({
    clientId: process.env.WC_ID,
    redirectUri: process.env.WC_REDIRECT_URI,
    clientSecret: process.env.WC_APP_SECRET,
    grantType: 'authorization_code',
    code
  })

    .then(resp => JSON.parse(resp.body))

    .then(resp => {
      return authentications
        .save(storeId, resp.access_token, resp.refresh_token, resp.expires_in, resp.scope, resp.moipAccount.id)
        .then(() => {
          res.status(200)
          res.write('<script>window.close()</script>')
          return res.end()
        })
    })

    .catch(error => {
      logger.error('WIRECARD_AUTH_ERR', error)
      res.status(400)
      return res.send({
        error: 'WIRECARD_AUTH_ERR',
        message: 'Unexpected Error Try Later'
      })
    })
}
