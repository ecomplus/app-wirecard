'use strict'
const logger = require('console-files')
const sql = require('./sql')
const config = require('../config')
const { ecomAuth } = require('ecomplus-app-sdk')
const { api } = require('./api-request')
const { paymentStatus } = require('./schemas/payment-response')

module.exports.register = (storeId) => {
  setTimeout(() => {
    let resource = 'preferences/' + config.WC_ID + '/notifications'
    let body = {
      events: ['PAYMENT.WAITING', 'PAYMENT.IN_ANALYSIS', 'PAYMENT.AUTHORIZED', 'PAYMENT.CANCELLED', 'PAYMENT.REFUNDED', 'PAYMENT.SETTLED'],
      target: 'https://wirecard.ecomplus.biz/notifications/' + storeId,
      media: 'WEBHOOK'
    }
    return api.post(resource, body, null, true)
  }, 1000)
}

module.exports.handle = async (request, response) => {
  let storeId = request.params.storeid
  const { resource } = request.body
  // verifica se a notificação já existe
  let notification = await sql.select({ transaction_id: resource.payment.id }, 'wirecard_webhooks')

  if (!notification) {
    let data = {
      transaction_id: resource.payment.id,
      current_status: resource.payment.status
    }
    // salva a notificação caso não exista
    sql.insert(data, 'wirecard_webhooks')
      .then(() => {
        response.status(204)
        return response.end()
      }).catch(e => {
        // tenta novamente..
        let erro = {
          status: 412,
          code: 'wirecard_webhooks',
          erro: e
        }
        logger.log(new Error(JSON.stringify(erro)))
        response.status(400)
        return response.end()
      })
  } else {
    // se existir notificação salva
    // busco o payment na wirecard
    let url = 'payments/' + resource.payment.id
    let payment = await api.get(url, null, true)
    payment = JSON.parse(payment)

    // compara status do payment
    // com a notificação recebida
    // da wirecard
    if (payment.status !== resource.payment.status) {
      // se for diferente
      let data = { current_status: payment.status }
      let where = { transaction_id: payment.id }

      // atualizo status no app
      // e faco um post atualizando
      // a order na ecp
      sql.update(data, where, 'wirecard_webhooks')
        .then(async () => {
          const sdk = await ecomAuth.then()
          const app = await sdk.getAuth(storeId)
          // busco a orders na ecp
          // com transaction_code igual
          // ao payment.id enviado pela wirecard
          let url = 'orders.json?transactions.intermediator.transaction_code=' + payment.id + '&fields=_id,transactions._id,transactions.intermediator.transaction_code'
          let orders = await sdk.apiRequest(storeId, url, 'GET', null, app)
            .catch(e => {
              let erro = {
                status: 400,
                code: 'ecomplus_api_request',
                resource: url,
                erro: e
              }
              logger.log(new Error(JSON.stringify(erro)))
              response.status(204)
              return response.end()
            })
          // result obj
          let { result } = orders.response.data

          // busco por orders que contenham
          // o atributo transactions
          let order = result.find(order => order.transactions)

          // busco a transação
          // igual ao payment.id
          let transaction = order.transactions.find(transaction => transaction.intermediator.transaction_code === payment.id)

          // atualizo o payment_history
          // da order na ecp
          let pathOrder = 'orders/' + order._id + '/payments_history.json'
          let bodyPost = {
            transaction_id: transaction._id,
            date_time: new Date().toISOString(), // payment.updatedAt,
            status: paymentStatus(payment.status)
          }

          sdk.apiRequest(storeId, pathOrder, 'POST', bodyPost, app)
            .then(resp => {
              response.status(204)
              return response.end()
            })
            .catch(e => {
              let erro = {
                status: 400,
                code: 'ecomplus_api_request',
                resource: pathOrder,
                erro: e
              }
              logger.log(new Error(JSON.stringify(erro)))
              response.status(204)
              return response.end()
            })
        })
        .catch(e => {
          let erro = {
            status: 412,
            code: 'wirecard_webhooks',
            erro: e
          }
          logger.log(new Error(JSON.stringify(erro)))
          response.status(400)
          return response.end()
        })
    } else {
      // se os status forem iguais
      // encerra a requisição com um 204
      response.status(204)
      return response.end()
    }
  }
}
