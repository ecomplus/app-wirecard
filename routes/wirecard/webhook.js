'use strict'
const logger = require('console-files')
const { transactions, authentications } = require('./../../lib/database')
// convert payment status to store-api valid status
const parsePaymentStatus = require('./../../lib/parse-payment-status')

module.exports = appSdk => {
  return (req, res) => {
    const { storeId } = req.params
    const { payment } = req.body.resource

    logger.log(`[!] Wirecard webhook ${payment.id} | #${storeId}`)

    transactions.get(payment.id)

      .then(transaction => {
        // get wirecard app auth
        return authentications.get(storeId).then(auth => ({ transaction, auth }))
      })

      .then(({ transaction, auth }) => {
        return new Promise((resolve, reject) => {
          // try to search for the order with the specified trasaction_code
          // four times before moving on to the next
          let retry = 0
          const request = async () => {
            let resource = `orders.json?transactions.intermediator.transaction_code=${transaction.transaction_id}&fields=_id,transactions._id,transactions.intermediator.transaction_code`
            const orders = await appSdk.apiRequest(storeId, resource).then(resp => resp.response.data.result)

            if (Array.isArray(orders) && orders.length) {
              const transaction = orders[0].transactions.find(transaction => transaction.intermediator.transaction_code === payment.id)
              const body = {
                transaction_id: transaction._id,
                date_time: new Date().toISOString(),
                status: parsePaymentStatus(payment.status),
                notification_code: payment.id,
                flags: [
                  'wirecard',
                  req.body.event
                ]
              }

              // store-api request
              resource = `orders/${orders[0]._id}/payments_history.json`
              return appSdk.apiRequest(storeId, resource, 'POST', body).then(() => resolve())
            } else if (retry <= 4) {
              setTimeout(() => {
                request()
              }, retry * 1000 + 4000)
              //
              retry++
            } else {
              // transaction not found?
              const err = new Error(`order not found for transaction_code=${payment.id}`)
              err.name = 'OrderNotFoundForTransactionCode'
              reject(err)
            }
          }
          // start
          request()
        })
      })

      .then(() => {
        logger.log(`Wirecard event type ${req.body.event}`)
        // update transaction in database
        return transactions.update(payment.id, payment.status)
      })

      .catch(err => {
        const { name, message } = err
        switch (err.name) {
          case 'TransactionCodeNotFound':
          case 'OrderNotFoundForTransactionCode':
          case 'WirecardAuthNotFound':
            logger.log(`[!] Skip webhook ${payment.id} | ${message}`)
            // return response with client error code
            res.status(400)
            res.send({ name, message })
            break
          default:
            logger.error('--> WIRECARD_WEBHOOK_ERROR', err)
            break
        }
      })
  }
}
