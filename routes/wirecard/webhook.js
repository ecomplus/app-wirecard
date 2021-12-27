'use strict'
const logger = require('console-files')
const { transactions, authentications } = require('./../../lib/database')
// convert payment status to store-api valid status
const parsePaymentStatus = require('./../../lib/parse-payment-status')
// fetch payment body from wirecard api
const fetchPayment = require('./../../lib/wirecard-api/fetch-payment')
// read configured E-Com Plus app data
const getConfig = require('./../../lib/store-api/get-config')

const notificationsQueue = []

const getLastEntry = (records, transactionId) => {
  // select last status record by date
  let statusRecord
  records.forEach(record => {
    if (
      record &&
      (!record.transaction_id || record.transaction_id === transactionId) &&
      (!statusRecord || !record.date_time || record.date_time >= statusRecord.date_time)
    ) {
      statusRecord = record
    }
  })
  return statusRecord
}

module.exports = appSdk => {
  return (req, res) => {
    let storeId
    const { payment } = req.body.resource
    if (notificationsQueue.indexOf(payment.id) === -1) {
      notificationsQueue.push(payment.id)

      setTimeout(() => {
        transactions.get(payment.id).then(transaction => {
          // get wirecard app auth
          storeId = transaction.store_id
          return authentications.get(storeId).then(auth => ({ transaction, auth }))
        }).then(({ transaction, auth }) => {
          const request = async (isRetry) => {
            const appConfig = await getConfig({ appSdk, storeId }, true)
            const wirecardConfig = {
              accessToken: auth.w_access_token,
              production: true
            }

            if (appConfig.sandbox && appConfig.sandbox === true) {
              wirecardConfig.production = false
            }

            return fetchPayment(payment.id, wirecardConfig)
              .then(async ({ body }) => {
                let resource = `orders.json?transactions.intermediator.transaction_code=${transaction.transaction_id}` +
                  '&fields=_id,transactions,financial_status,payments_history'

                const orders = await appSdk.apiRequest(storeId, resource).then(({ response }) => response.data.result)
                const order = orders[0]
                if (order && order.transactions) {
                  const transaction = order.transactions.find(({ intermediator }) => {
                    return intermediator && intermediator.transaction_code === payment.id
                  })
                  if (transaction) {
                    const lastPaymentHistoryEntry = getLastEntry(order.payments_history, transaction._id)
                    if (
                      lastPaymentHistoryEntry.status !== parsePaymentStatus(body.status) &&
                      (!transaction.status ||
                      transaction.status.current !== 'paid' ||
                      transaction.status.current !== parsePaymentStatus(body.status))
                    ) {
                      const paymentsHistory = {
                        transaction_id: transaction._id,
                        date_time: new Date().toISOString(),
                        status: parsePaymentStatus(body.status),
                        notification_code: payment.id,
                        flags: [
                          'wirecard',
                          'webhook'
                        ]
                      }

                      resource = `orders/${orders[0]._id}/payments_history.json`
                      return appSdk.apiRequest(storeId, resource, 'POST', paymentsHistory)
                    } else {
                      // Entrada duplicada
                      return Promise.resolve()
                    }
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
              })
          }

          return request()
        }).then(() => {
          // update transaction in database
          logger.log(`> Notification:  #${payment.id} | #${storeId} | ${req.body.event}`)
          notificationsQueue.splice(notificationsQueue.indexOf(payment.id))
          return transactions.update(payment.id, payment.status)
        }).then(() => res.status(204).end())
          .catch(err => {
            notificationsQueue.splice(notificationsQueue.indexOf(payment.id))
            const { name, message } = err
            switch (name) {
              case 'TransactionCodeNotFound':
              case 'OrderNotFoundForTransactionCode':
              case 'AuthNotFound':
                // ignore
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
      }, 5000)
    } else {
      return res.status(204).end()
    }
  }
}
