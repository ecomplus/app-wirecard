'use strict'
const logger = require('console-files')
const { internalApi } = require('./../../lib/Api/Api')
const rq = require('request')
module.exports = (appSdk) => {
  return (req, res) => {
    const { storeId } = req.params
    const { payment } = req.body.resource
    internalApi
      .then(api => {
        return api.getWirecardAuth(storeId)
          .then(wirecardAuth => ({ wirecardAuth, api }))
      })
      .then(async ({ wirecardAuth, api }) => {

        try {
          // notification exist?
          let notification = await api.getNotification(payment.id)

          // if not insert at database
          // and await for new notification
          // to update status
          if (!notification) {
            api.addNotification(payment.id, payment.status)
              .then(() => {
                return res.status(204).end()
              })
          } else {
            // if notification exist,  get payment at wirecard to confirm if status
            // is different that status we have at database
            let token = wirecardAuth.w_access_token
            let wirecardPayment = await getPayment(payment.id, token)

            // parse json to obj
            wirecardPayment = JSON.parse(wirecardPayment)

            // if status is the same
            if (wirecardPayment.status === notification.current_status) {
              // glow
              return res.status(204).end()
            } else {
              // if not search at ecomplus api for orders with paymentId
              let resource = `orders.json?transactions.intermediator.transaction_code=${payment.id}&fields=_id,transactions._id,transactions.intermediator.transaction_code`
              let method = 'GET'
              let orders = await appSdk.apiRequest(storeId, resource, method)
              let { result } = orders.response.data

              // find for order with property transations
              let order = result.find(order => order.transactions)

              // find for transactions with the same paymentId of notifications
              let transaction = order.transactions.find(transaction => transaction.intermediator.transaction_code === payment.id)

              // post new payments_history at order
              resource = `orders/${order._id}/payments_history.json`
              method = 'POST'
              let body = {
                transaction_id: transaction._id,
                date_time: new Date().toISOString(),
                status: paymentStatus(payment.status)
              }

              return appSdk.apiRequest(storeId, resource, method, body)

                // finaly update database status
                .then(() => {
                  return api.updateNotification(payment.id, payment.status)
                })

                // then end
                .then(() => {
                  return res.status(204).end()
                })
            }
          }
        } catch (error) {
          console.log(error)
          logger.error('[WIRECARD WEBHOOKS]', error)
          return res.status(400).end()
        }
      })
      .catch(e => {
        logger.error(e)
        return res.status(400).end()
      })
  }
}

const getPayment = (paymentId, token) => {
  return new Promise((resolve, reject) => {
    let path = (process.env.WC_SANDBOX) ? 'https://sandbox.moip.com.br' : 'https://api.moip.com.br'
    let resource = `${path}/v2/payments/${paymentId}`
    let options = {
      method: 'GET',
      url: resource,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + process.env.WC_ACCESS_TOKEN
      }
    }
    rq(options, (erro, resp, body) => {
      if (erro || resp.statusCode >= 400) {
        reject(new Error(body))
      }

      resolve(body)
    })
  })
}

const paymentStatus = wirecardStatus => {
  switch (wirecardStatus) {
    case 'WAITING': return 'pending'
    case 'IN_ANALYSIS': return 'under_analysis'
    case 'PRE_AUTHORIZED': return 'under_analysis'
    case 'AUTHORIZED': return 'authorized'
    case 'CANCELLED': return 'voided'
    case 'REFUNDED': return 'refunded'
    case 'REVERSED': return 'refunded'
    case 'SETTLED': return 'paid'
    default: return 'unknown'
  }
}