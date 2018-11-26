const rq = require('request')
const sql = require('../services/sql')
const config = require('./../config')
const endpoints = require('../wirecard/endpoints')
const moment = require('moment')
const DB_ENTITY = 'webhooks'
const logger = require('console-files')
class WebHooks {
  constructor () {
    this.token
    this.my_app_id
  }

  async register (storeId) {
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
      logger.log(options)
      rq.post(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(new Error('Failed Wirecard API Request.'))
        } else {
          logger.log(body)
          resolve(body)
        }
      })
    })
  }

  async notification (paymentOrder, xstoreid) {
    if (typeof paymentOrder === 'undefined') {
      return false
    }
    // Verifica se existe notificação salva no banco
    let notification = await sql.select({ transaction_id: paymentOrder.resource.payment.id }, DB_ENTITY)
    // Insere caso não exista
    if (!notification) {
      let data = {
        transaction_id: paymentOrder.resource.payment.id,
        current_status: paymentOrder.resource.payment.status
      }
      await sql.insert(data, DB_ENTITY).catch(e => { logger.log(e) })
    } else {
      // Se existir busco a transação no wirecard e confiro
      // se o status é o mesmo que tenho no banco
      let wirecardPayment = await this.getPaymentWirecard(paymentOrder.resource.payment.id).catch(e => { logger.log(e) })
      wirecardPayment = JSON.parse(wirecardPayment)
      // se for o mesmo status não faço nada
      if (wirecardPayment.status !== paymentOrder.resource.payment.status) {
      // se for diferente atualizo no banco de dados
      // e atualizo na API da ecomplus
        let data = { current_status: wirecardPayment.status }
        let where = { transaction_id: wirecardPayment.id }
        let update = await sql.update(data, where, DB_ENTITY).catch(e => logger.log(e))
        if (update) {
          let order = await this.getOrderWirecard(wirecardPayment._links.order.title).catch(e => logger.log(e))
          order = JSON.parse(order)
          let orderNumber = order.ownId
          await this.setAppAuthentication(xstoreid)
          return this.patchEcomplus(xstoreid, orderNumber, wirecardPayment).catch(e => logger.log(e))
        }
      }
    }
  }

  async getOrderWirecard (orderId) {
    return new Promise((resolve, reject) => {
      let options = {
        method: 'GET',
        url: endpoints.orders + '/' + orderId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        }
      }
      rq.get(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(resp.body)
        }
        resolve(body)
      })
    })
  }

  async getPaymentWirecard (paymentId) {
    return new Promise((resolve, reject) => {
      let options = {
        uri: endpoints.payment + '/' + paymentId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        }
      }
      rq.get(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(new Error('Failed Wirecard API Request.'))
        } else {
          resolve(body)
        }
      })
    })
  }

  async patchEcomplus (xstoreid, number, payment) {
    return new Promise(async (resolve, reject) => {
      let orders = await this.getOrdersEcom(xstoreid, payment.id).catch(e => logger.log(e))
      if (orders) {
        let orderId
        let transactionId
        orders = JSON.parse(orders)
        orders.result.forEach(element => {
          if (element.transactions) {
            orderId = element._id
            element.transactions.forEach(trans => {
              logger.log(trans.intermediator.transaction_code)
              logger.log(payment.id)
              if (trans.intermediator.transaction_code === payment.id) {
                transactionId = trans._id
              }
            })
          }
        })
        let options = {
          uri: 'https://api.e-com.plus/v1/orders/' + orderId + '/payments_history.json',
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Id': xstoreid,
            'X-Access-Token': this.token,
            'X-My-ID': this.my_app_id
          },
          body: {
            transaction_id: transactionId,
            date_time: new Date().toISOString(), // payment.updatedAt,
            status: this.paymentStatus(payment.status)
          },
          json: true
        }
        rq.post(options, (erro, resp, body) => {
          if (resp.statusCode >= 400) {
            logger.log(resp.body)
            reject(new Error('Failed E-com.plus API Request.'))
          } else {
            logger.log(resp.body)
            resolve(resp.body)
          }
        })
      }
    })
  }

  async getOrdersEcom (xstoreid, transactionCode) {
    return new Promise((resolve, reject) => {
      let options = {
        uri: 'https://api.e-com.plus/v1/orders.json?transactions.intermediator.transaction_code=' + transactionCode + 
        '&fields=_id,transactions._id,transactions.intermediator.transaction_code',
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Id': xstoreid,
          'X-Access-Token': this.token,
          'X-My-ID': this.my_app_id
        }
      }
      rq.get(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(new Error('Failed E-com.plus API Request.:' + resp.body))
        } else {
          resolve(body)
        }
      })
    })
  }

  async setAppAuthentication (xstoreid) {
    await sql.select({ x_store_id: xstoreid }, 'auth').then(result => {
      this.token = result.app_token
      this.my_app_id = result.authentication_id
    }).catch(e => logger.log(e))
  }

  paymentStatus (status) {
    switch (status) {
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
}

module.exports = WebHooks
