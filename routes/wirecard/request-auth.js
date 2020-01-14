'use strict'
const initClient = require('./../../lib/wirecard-api/init-client')

module.exports = () => {
  return (req, res) => {
    const { query } = req
    const storeId = query.x_store_id || query.storeId || parseInt(req.get('x-store-id'), 10)

    if (!storeId) {
      return res.status(400).send('X-Store-Id not found at request.')
    }

    const options = {
      token: process.env.WC_TOKEN,
      key: process.env.WC_CHAVE,
      production: (!process.env.WC_SANDBOX)
    }

    const wirecard = initClient({ options })

    wirecard.connect.getAuthorizeUrl({
      clientId: process.env.WC_ID,
      redirectUri: `${process.env.WC_REDIRECT_URI}?storeId=${storeId}`,
      scopes: ['RECEIVE_FUNDS,REFUND,MANAGE_ACCOUNT_INFO']
    }).then((url) => {
      console.log(url)
      res.redirect(301, url)
    }).catch((err) => {
      res.status(400)
      return res.send({
        error: 'CREATE_TRANSACTION_ERR',
        message: 'Unexpected Error Try Later',
        err
      })
    })
  }
}
