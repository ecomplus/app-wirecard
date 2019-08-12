'use strict'
const logger = require('console-files')
const { getWirecardAuth, getNotification, addNotification, updateNotification } = require('./../../lib/Api/Api')
const rq = require('request')

module.exports = (appSdk) => {
  return (req, res) => {
    const { storeId } = req.params
    const { payment } = req.body.resource
    logger.log(JSON.stringify(req.body))

    getWirecardAuth(storeId)

      .then(async auth => {
        let notification = await getNotification(payment.id)

        if (!notification) {
          addNotification(payment.id, payment.status)

            .then(() => {
              return res.status(204).end()
            })
        } else {
          let token = auth.w_access_token
          let paymentInWirecard = await getPayment(payment.id, token)
          paymentInWirecard = JSON.parse(paymentInWirecard)

          if (paymentInWirecard.status === notification.current_status) {
            return res.status(204).end()
          } else {
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
                return updateNotification(payment.id, payment.status)
              })
          }
        }
      })

      .then(() => {
        return res.status(204).end()
      })

      .catch(error => {
        logger.error('WIRECARD_NOTIFICATION_ERR', error)
        return res.status(204).end()
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
    logger.log(options)
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