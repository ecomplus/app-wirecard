'use strict'
//
const { listPayments } = require('./schemas/list-payment')
const { requestOrder } = require('./schemas/request-order')
const { payWith } = require('./schemas/pay-with')
const { paymentResponse } = require('./schemas/payment-response')
const { api } = require('./api-request')
const { respond, err } = require('./app-response')

module.exports.payment = (request, response) => {
  let body = request.body

  if (!body.hasOwnProperty('module')) {
    response.status(400)
    let erro = {
      erros: {
        status: 400,
        code: 'payment_module',
        message: 'module not sent'
      }
    }
    return response.send(erro)
  }

  if (body.module === 'list_payments') {
    listPayments(body)
      .then(list => respond(list, response))
      .catch(erro => err(erro, response))
  } else if (body.module === 'create_transaction') {
    order.create(body) // cria a order
      .then(wirecardOrder => pay(wirecardOrder, body)) // realiza o pagamento da order
      .then(paymentOrder => paymentResponse(paymentOrder)) // faz parse para responder com schema ecp
      .then(paymentSucess => respond(paymentSucess, response)) // response o schema
      .catch(erro => err(erro, response)) // deu erro em algum ponto da cadeia
  } else {
    response.status(400)
    let erro = {
      erros: {
        status: 400,
        code: 'payment_module',
        message: 'module not match. what you want?'
      }
    }
    return response.send(erro)
  }
}

// order interface
const order = {
  create: async (bodyRequest) => {
    let orderSchema = requestOrder(bodyRequest)
    //
    return api.post('orders', orderSchema, true)
  }
}

// payment request
const pay = async (wirecardOrder, requestModule) => {
  let { id } = wirecardOrder
  //
  let paymentSchema = payWith(requestModule)
  //
  let url = 'orders/' + id + '/payments'
  //
  return api.post(url, paymentSchema, true)
}
