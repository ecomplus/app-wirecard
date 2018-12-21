'use strict'
const logger = require('console-files')
const rq = require('request')
const sql = require('./sql')
const wirecard = require('./wirecard')
const ecomplus = require('./ecomplus')
const endpoints = require('./endpoints')
const config = require('./../config')

const register = (storeId) => {
  return new Promise((resolve, reject) => {
    let options = {
      uri: endpoints.webhooks + '/' + config.WC_ID + '/notifications',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
      },
      body: {
        events: ['PAYMENT.WAITING', 'PAYMENT.IN_ANALYSIS', 'PAYMENT.AUTHORIZED', 'PAYMENT.CANCELLED', 'PAYMENT.REFUNDED', 'PAYMENT.SETTLED'],
        target: 'http://wirecard.ecomplus.biz/notifications/' + storeId,
        media: 'WEBHOOK'
      },
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      if (resp.statusCode >= 400) {
        logger.error('[Register Procedure] Failed Wirecard API Request.' + resp.body)
        reject(new Error('Failed Wirecard API Request.'))
      } else {
        resolve(body)
      }
    })
  })
}

const notification = async (request, response) => {
  // body requisição
  let body = request.body
  logger.log(body)
  // x_store_id
  let storeId = request.params.storeid
  // Verifica se existe notificação salva no banco
  let notification = await sql.select({ transaction_id: body.resource.payment.id }, 'wirecard_webhooks')
  // Insere caso não exista
  if (!notification) {
    let data = {
      transaction_id: body.resource.payment.id,
      current_status: body.resource.payment.status
    }
    await sql.insert(data, 'wirecard_webhooks').catch(e => { logger.log(e) })
  } else {
    // Se existir busco a transação no wirecard e confiro
    // se o status é o mesmo que tenho no banco
    let wirecardPayment = await wirecard.getPaymentWirecard(body.resource.payment.id).catch(e => { logger.log(e) })
    wirecardPayment = JSON.parse(wirecardPayment)
    // se for o mesmo status não faço nada
    if (wirecardPayment.status !== body.resource.payment.status) {
    // se for diferente atualizo no banco de dados
    // e atualizo na API da ecomplus
      let data = { current_status: wirecardPayment.status }
      let where = { transaction_id: wirecardPayment.id }
      let update = await sql.update(data, where, 'wirecard_webhooks').catch(e => logger.log(e))
      if (update) {
        let orderWirecard = await wirecard.getOrderWirecard(wirecardPayment._links.order.title).catch(e => logger.log(e))
        orderWirecard = JSON.parse(orderWirecard)

        let app = await wirecard.getWirecardData(storeId)
        //
        let resource = 'orders.json?transactions.intermediator.transaction_code=' + wirecardPayment.id + '&fields=_id,transactions._id,transactions.intermediator.transaction_code'
        let orderEcom = await ecomplus.api.get(app, resource).catch(e => console.log(e))
        //
        let orderId
        let transactionId
        //
        orderEcom = JSON.parse(orderEcom)
        orderEcom.result.find(order => {
          if (order.transactions) {
            orderId = order._id
            order.transactions.find(transaction => {
              if (transaction.intermediator.transaction_code === wirecardPayment.id) {
                transactionId = transaction._id
              }
            })
          }
        })
        //
        let bodyRequest = {
          transaction_id: transactionId,
          date_time: new Date().toISOString(), // payment.updatedAt,
          status: wirecard.paymentStatus(wirecardPayment.status)
        }
        //
        ecomplus.api.post(app, bodyRequest, 'orders/' + orderId, '/payments_history.json')
          .then(() => {
            response.status(200)
            return response.end()
          })
          .catch(e => {
            logger.error('[Update Order] Falha ao atualizar payment_history da order' + e)
            response.status(400)
            return response.end()
          })
      }
    }
  }
}

module.exports = {
  register,
  notification
}
