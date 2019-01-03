'use strict'
//
import { listPayments } from './schemas/list-payment'
import { requestOrder } from './schemas/request-order'
import { payWith } from './schemas/pay-with'
import { paymentResponse } from './schemas/payment-response'

import { api as apiWirecard } from './api-request'
import { respond, err } from './app-response'

export const payment = (request, response) => {
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

  switch (body.module) {
    case 'list_payments':
      listPayments(body)
        .then(resp => respond(resp, response))
        .catch(erro => err(erro, response))
      break
    case 'create_transaction':
      order.create(body) // cria a order
        .then(wirecardOrder => pay(wirecardOrder, body)) // realiza o pagamento da order
        .then(paymentOrder => paymentResponse(paymentOrder)) // faz parse para responder com schema ecp
        .then(paymentSucess => respond(paymentSucess, response)) // response o schema
        .catch(erro => err(erro, response)) // deu erro em algum ponto da cadeia
      break
    default:
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
    return apiWirecard.post('orders', orderSchema, true)
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
  return apiWirecard.post(url, paymentSchema, true)
}
