'use strict'

const logger = require('console-files')
const wirecardOrder = require('./../../../lib/wirecard-order-request')
const wirecardPaymentRequest = require('./../../../lib/wirecard-payments-request')
const wirecardPaymentResponse = require('./../../../lib/wirecard-payments-response')

module.exports = () => {
  return (req, res) => {
    const payload = req.body
    const storeId = req.storeId
    // paser order to wirecard model
    wirecardOrder(payload, storeId)
      // request payment to order
      .then(wirecardPaymentRequest)
      // parse reponse
      .then(wirecardPaymentResponse)
      // response
      .then(payment => {
        return res.send(payment)
      })
      // throw
      .catch(e => {
        logger.log('CREATE_TRANSACTION', e)
        return res.status(400).send('CREATE_TRANSACTION ' + e)
      })
  }
}
