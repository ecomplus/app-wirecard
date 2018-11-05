const rq = require('request')
const sql = require('../services/sql')
const config = require('./../config')
const endpoints = require('../wirecard/endpoints')
const DB_ENTITY = 'webhooks'

class WebHooks {
  constructor () {
    this.token
    this.my_app_id
  }

  async register () {
    return new Promise((resolve, reject) => {
      let options = {
        uri: endpoints.webhooks + '/' + config.WC_ID + '/notifications',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        },
        body: {
          events: ['PAYMENT.WAITING', 'PAYMENT.IN_ANALYSIS', 'PAYMENT.AUTHORIZED', 'PAYMENT.CANCELLED', 'PAYMENT.REFUNDED', 'PAYMENT.SETTLED'],
          target: 'http://wirecard.ecomplus.biz/wh/',
          media: 'WEBHOOK'
        },
        json: true
      }
      rq.post(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(new Error('Failed Wirecard API Request.'))
        } else {
          resolve(body)
        }
      })
    })
  }

  async notification (paymentOrder) {
    if (typeof paymentOrder === 'undefined') {
      return false
    }
    // Verifica se existe notificação salva no banco
    let notification = await sql.select({ transaction_id: paymentOrder.id }, DB_ENTITY)
    // Insere caso não exista
    if (!notification) {
      let data = {
        transaction_id: paymentOrder.resource.order.id,
        current_status: paymentOrder.resource.order.status
      }
      await sql.insert(data, DB_ENTITY).catch(e => { console.log(e) })
    } else {
      // Se existir busco a transação no wirecard e confiro
      // se o status é o mesmo que tenho no banco
      let wirecardPayment = await this.getPaymentWirecard(paymentOrder.resource.order.id).catch(e => {})
      // se for o mesmo status não faço nada
      if (wirecardPayment.status !== paymentOrder.resource.order.status) {
      // se for diferente atualizo no banco de dados
      // e atualizo na API da ecomplus
        let data = { current_status: wirecardPayment.status }
        let where = { transaction_id: wirecardPayment.id }
        let update = await sql.update(data, where, DB_ENTITY).catch(e => console.log(e))
        if (update) {
          let order = await this.getOrderWirecard(wirecardPayment._links.order.title).catch(e => console.log(e))
          let orderNumber = order.ownid.split('_')[0]
          let xstoreid = order.ownid.split('_')[1]
          await this.setAppAuthentication(xstoreid)
          return this.patchEcomplus(xstoreid, orderNumber, this.parseStatus(wirecardPayment.status))
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

  async patchEcomplus (xstoreid, number, status) {
    return new Promise(async (resolve, reject)  => {
      let orders = await this.getOrdersEcom(xstoreid).catch(e => console.log(e))
      let orderId 
      orders.forEach(element => {
        if (element.number === number) {
          orderId = element._id
        }
      })
      let options = {
        uri: 'https://api.e-com.plus/v1/orders/' + orderId,
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Id': xstoreid,
          'X-Access-Token': this.token,
          'X-My-ID': this.my_app_id
        },
        body: {financial_status: { current: status}},
        json: true
      }
      rq.patch(options, (erro, resp, body) => {
        if (resp.statusCode !== 204) {
          reject(new Error('Failed E-com.plus API Request.'))
        } else {
          resolve(204)
        }
      })
    })
  }

  async getOrdersEcom (xstoreid) {
    return new Promise((resolve, reject) => {
      let options = {
        uri: 'https://api.e-com.plus/v1/orders.json',
        headers: {
          'Content-Type': 'application/json',
          'X-Store-Id': xstoreid,
          'X-Access-Token': this.token,
          'X-My-ID': this.my_app_id
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

  async setAppAuthentication (xstoreid) {
    sql.select({ x_store_id: xstoreid }, 'auth').then(result => {
      this.token = result.app_token
      this.my_app_id = result.application_id
    }).catch(e => console.log(e))
  }
}

let wh = new WebHooks()

module.exports = WebHooks