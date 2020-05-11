'use strict'
const logger = require('console-files')
const { transactions, authentications } = require('./../../lib/database')
// convert payment status to store-api valid status
const parsePaymentStatus = require('./../../lib/parse-payment-status')

module.exports = appSdk => {
  return (req, res) => {
    let storeId
    const { payment } = req.body.resource

    transactions
      .get(payment.id)
      .then(transaction => {
        // get wirecard app auth
        storeId = transaction.store_id
        return authentications.get(storeId).then(auth => ({ transaction, auth }))
      })

      .then(({ transaction, auth }) => {
        const request = async (isRetry) => {
          let resource = `orders.json?transactions.intermediator.transaction_code=${transaction.transaction_id}` +
            `&fields=_id,transactions._id,transactions.intermediator.transaction_code`

          const orders = await appSdk.apiRequest(storeId, resource).then(({ response }) => response.data.result)
          const order = orders[0]

          if (order && order.transactions) {
            const transaction = order.transactions.find(({ intermediator }) => {
              return intermediator && intermediator.transaction_code === payment.id
            })

            if (transaction) {
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

              resource = `orders/${orders[0]._id}/payments_history.json`
              return appSdk.apiRequest(storeId, resource, 'POST', body)
            }
          }

          if (!isRetry) {
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                request(true).then(resolve).catch(reject)
              }, 5000)
            })
          }

          const err = new Error(`Order not found for transaction_code=${payment.id}`)
          err.name = 'OrderNotFoundForTransactionCode'
          throw err
        }

        return request()
      })

      .then(() => {
        // update transaction in database
        logger.log(`> Notification:  #${payment.id} | #${storeId} | ${req.body.event}`)
        return transactions.update(payment.id, payment.status)
      })

      .catch(err => {
        const { name, message } = err
        switch (name) {
          case 'TransactionCodeNotFound':
          case 'OrderNotFoundForTransactionCode':
          case 'WirecardAuthNotFound':
            // return response with client error code
            logger.error(`> NotificationError # ${payment.id} | ${message}`)
            break
          default:
            const { response } = err
            if (response && response.data) {
              logger.error('> NotificationError #', JSON.stringify(response.data))
              break
            }
        }

        res.status(500)
        return res.end()
      })
  }
}
