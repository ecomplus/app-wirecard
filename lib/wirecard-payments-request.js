'use strict'
const rq = require('request')
const wirecardPaymentOptions = require('./wirecard-payments-options')

module.exports = ({ body, payload, auth }) => {
  return new Promise((resolve, reject) => {
    const { application } = payload
    const orderId = body.id
    const resource = (application.hidden_data.hasOwnProperty('sandbox') && application.hidden_data.sandbox === true) ? 'https://sandbox.moip.com.br/v2/orders' : 'https://moip.com.br/v2/orders'
    try {
      // parse model
      const schema = wirecardPaymentOptions(payload)

      // request payment
      let options = {
        method: 'POST',
        url: resource + `/${orderId}/payments`,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + auth.w_access_token
        },
        body: schema,
        json: true
      }
      rq(options, (erro, resp, result) => {
        if (erro || resp.statusCode >= 400) {
          reject(new Error(erro))
        }
        resolve(result)
      })
    } catch (error) {
      reject(error)
    }
  })
}
