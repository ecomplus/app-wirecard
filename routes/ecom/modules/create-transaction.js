'use strict'

const logger = require('console-files')
const { getWirecardAuth } = require('./../../../lib/Api/Api')
const wirecardOrder = require('./../../../lib/wirecard-order-request')
const wirecardPaymentRequest = require('./../../../lib/wirecard-payments-request')
const wirecardPaymentResponse = require('./../../../lib/wirecard-payments-response')

module.exports = () => {
  return (req, res) => {
    const payload = req.body
    const storeId = req.storeId

    getWirecardAuth(storeId)
      .then(auth => {
        // paser order to wirecard model
        return wirecardOrder(payload, storeId, auth)
          // request payment to order
          .then(wirecardPaymentRequest)
          // parse reponse
          .then(wirecardPaymentResponse)
          // response
          .then(payment => {
            return res.send(payment)
          })
      })
      // throw
      .catch(error => {
        logger.error('CREATE_TRANSACTION', error)
        res.status(400)
        return res.send({
          error: 'CREATE_TRANSACTION',
          message: 'Unexpected Error Try Later'
        })
      })
  }
}
