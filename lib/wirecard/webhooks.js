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
    let notification = await sql.select({ transaction_id: paymentOrder.resource.payment.id }, DB_ENTITY)
    // Insere caso não exista
    if (!notification) {
      let data = {
        transaction_id: paymentOrder.resource.payment.id,
        current_status: paymentOrder.resource.payment.status
      }
      await sql.insert(data, DB_ENTITY).catch(e => { console.log(e) })
    } else {
      // Se existir busco a transação no wirecard e confiro
      // se o status é o mesmo que tenho no banco
      let wirecardPayment = await this.getPaymentWirecard(paymentOrder.resource.payment.id).catch(e => { console.log(e) })
      wirecardPayment = JSON.parse(wirecardPayment)
      // se for o mesmo status não faço nada
      if (wirecardPayment.status !== paymentOrder.resource.payment.status) {
      // se for diferente atualizo no banco de dados
      // e atualizo na API da ecomplus
        let data = { current_status: wirecardPayment.status }
        let where = { transaction_id: wirecardPayment.id }
        let update = await sql.update(data, where, DB_ENTITY).catch(e => console.log(e))
        if (update) {
          let order = await this.getOrderWirecard(wirecardPayment._links.order.title).catch(e => console.log(e))
          order = JSON.parse(order)
          let orderNumber = order.ownId.split('_')[0]
          let xstoreid = order.ownId.split('_')[1]
          await this.setAppAuthentication(xstoreid)
          return this.patchEcomplus(xstoreid, orderNumber, this.paymentStatus(wirecardPayment.status)).catch(e => console.log(e))
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
    return new Promise(async (resolve, reject) => {
      let orders = await this.getOrdersEcom(xstoreid).catch(e => console.log(e))
      if (orders) {
        orders = JSON.parse(orders)
        let orderId
        orders.result.forEach(element => {
          if (Number(element.number) === Number(number)) {
            orderId = element._id
          }
        })
        let options = {
          uri: 'https://api.e-com.plus/v1/orders/' + orderId + '.json',
          headers: {
            'Content-Type': 'application/json',
            'X-Store-Id': xstoreid,
            'X-Access-Token': this.token,
            'X-My-ID': this.my_app_id
          },
          body: { financial_status: { current: status} },
          json: true
        }
        rq.post(options, (erro, resp, body) => {
          console.log(resp.body)
          if (resp.statusCode !== 204) {
            reject(new Error('Failed E-com.plus API Request.'))
          } else {
            resolve(204)
          }
        })
      }
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
          console.log(resp)
          reject(new Error('Failed E-com.plus API Request.'))
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
    }).catch(e => console.log(e))
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
