'use strict'
const rq = require('request')
const moment = require('moment')
const logger = require('console-files')
const schemas = require('./schemas')
const sql = require('./sql')
const config = require('./../config')
const endpoints = require('./endpoints')

const listPayments = async (request, response) => {
  let body = request.body
  //
  schemas.listPayments(body)
    .then(schema => {
      response.status(200)
      return response.send(schema)
    })
    .catch(e => {
      response.status(400)
      console.log(e)
      return response.send(e)
    })
}

const requestPayment = async (request, response) => {
  // let storeId = request.headers['x-store-id']
  let requestBody = request.body
  // let wirecard = await getWirecardData(storeId).catch(e => console.log(e))
  //
  let order = await createOrder(requestBody).catch(e => console.log(e))
  //
  if (order) {
    pay(order, requestBody)
      .then(payment => {
        response.status(200)
        return response.send(schemas.paymentResponse(payment))
      })
      .catch(e => console.log(e))
  }
}

const pay = async (wirecardOrder, requestBody) => {
  let method
  let orderId = wirecardOrder.id
  switch (requestBody.params.payment_method.code) {
    case 'credit_card':
      method = payWith.card(requestBody)
      break
    case 'banking_billet':
      method = payWith.boleto(requestBody)
      break
    case 'online_debit':
      method = payWith.online_bank_debit(requestBody)
      break
    default: break
  }
  return new Promise((resolve, reject) => {
    let options = {
      url: endpoints.orders + '/' + orderId + '/payments',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
      },
      body: method,
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      if (resp.statusCode >= 400) {
        console.log('Erro com a requisição ao wirecard - ' + resp.body)
        reject(new Error('Erro com a requisição ao wirecard - ' + resp.body))
      }
      resolve(body)
    })
  })
}

const createOrder = (order) => {
  return new Promise((resolve, reject) => {
    let options = {
      url: endpoints.orders,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
      },
      body: schemas.requestOrder(order),
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      if (resp.statusCode >= 400) {
        console.log('Erro com a requisição ao wirecard - ' + resp.body)
        reject(new Error('Erro com a requisição ao wirecard - ' + resp.body))
      }
      resolve(body)
    })
  })
}

const getWirecardData = (storeId) => {
  return sql.select({ store_id: storeId }, 'ecomplus_app_auth')
}

const getPaymentWirecard = (paymentId) => {
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
        logger.log('Erro com a requisição ao wirecard - ' + resp.body)
        reject(new Error('Erro com a requisição ao wirecard - ' + resp.body))
      }
      resolve(body)
    })
  })
}

const getOrderWirecard = (orderId) => {
  return new Promise((resolve, reject) => {
    let options = {
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

const paymentStatus = (status) => {
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

let payWith = {
  boleto: (order) => {
    let expiration = order.application.hidden_data.payment_options.find(option => {
      if (option.type === 'banking_billet') {
        return option.expiration_date
      }
    })
    return {
      statementDescriptor: order.application.hidden_data.statement_descriptor.substr(0, 12) || 'Wirecard',
      fundingInstrument: {
        method: 'BOLETO',
        boleto: {
          expirationDate: moment(new Date()).add(expiration.expiration_date, 'days').toISOString().slice(0, 10),
          instructionLines: {
            first: 'Atenção',
            second: 'fique atento à data de vencimento do boleto.',
            third: 'Pague em qualquer casa lotérica.'
          },
          logoUri: 'http://www.lojaexemplo.com.br/logo.jpg'
        }
      }
    }
  },
  card: (order) => {
    return {
      installmentCount: order.params.installment_number,
      statementDescriptor: order.application.hidden_data.statement_descriptor.substr(0, 12) || 'Wirecard',
      fundingInstrument: {
        method: 'CREDIT_CARD',
        creditCard: {
          hash: order.params.credit_card.hash,
          store: true,
          holder: {
            fullname: (typeof order.params.payer !== 'undefined') ? order.params.payer.fullname : order.params.buyer.fullname,
            birthdate: typeof order.params.birth_date !== 'undefined' ? order.params.payer.birth_date.year + '-' + order.params.payer.birth_date.month + '-' + order.params.payer.birth_date.day : order.params.buyer.birth_date.year + '-' + order.params.buyer.birth_date.month + '-' + order.params.buyer.birth_date.day,
            taxDocument: {
              type: (typeof order.params.payer !== 'undefined' && order.params.payer.doc_number.length === 11) || (typeof order.params.buyer !== 'undefined' && order.params.buyer.doc_number.length === 11) ? 'CPF' : 'CNPJ',
              number: (typeof order.params.payer !== 'undefined') ? order.params.payer.doc_number : order.params.buyer.doc_number
            },
            phone: {
              countryCode: order.params.buyer.phone.country_code,
              areaCode: order.params.buyer.phone.number.substr(0, 2),
              number: order.params.buyer.phone.number
            },
            billingAddress: {
              city: order.params.billing_address.city,
              // complement: order.params.billing_address.complement,
              district: order.params.billing_address.borough,
              street: order.params.billing_address.street,
              streetNumber: order.params.billing_address.number,
              zipCode: order.params.billing_address.zip,
              state: (typeof order.params.billing_address !== 'undefined') && (typeof order.params.billing_address.province_code !== 'undefined') ? order.params.billing_address.province_code : order.params.billing_address.province,
              country: order.params.billing_address.country_code || 'BRA'
            }
          }
        }
      }
    }
  },
  online_bank_debit: (order) => {
    return {
      fundingInstrument: {
        method: 'ONLINE_BANK_DEBIT',
        onlineBankDebit: {
          bankNumber: 341,
          expirationDate: new Date().toISOString().slice(0, 10)
        }
      }
    }
  }
}

module.exports = {
  listPayments,
  requestPayment,
  getPaymentWirecard,
  getOrderWirecard,
  getWirecardData,
  paymentStatus
}
