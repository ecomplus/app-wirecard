const moment = require('moment')
const auth = require('./authentication')
const orders = require('./orders')
const sql = require('./../services/sql')
const config = require('./../config')
const rq = require('request')

module.exports = {
  list: (request, response) => {
    console.log(request.body)
    if (!request.body || typeof request.body === 'undefined') {
      response.status(400)
      return response.send('Body empty')
    }
    sql.select({ x_store_id: request.headers['x-store-id'] }, 'access').then(retorno => {
      if (typeof retorno === 'undefined') {
        response.status(400)
        return response.send('Token not found for x-store-id.')
      }
      parseToSchemaList(request.body, retorno.w_access_token).then(parse => {
        response.send(parse)
      }).catch(e => {
        response.status(400)
        response.send(e)
      })
    }).catch(e => console.log(e))
  },
  create: (request, response) => {
    if (!request.body || typeof request.body === 'undefined') {
      response.status(400)
      return response.send('Empty body')
    }
    let body = request.body
    orders.order.new(body, request.headers['x-store-id']).then(retorno => {
      paymentRequest(body, retorno).then(retorno => {
        response.status(200)
        return response.send(ecomPayResponse(retorno))
      }).catch(e => {
        response.status(400)
        return response.send(e)
      })
    }).catch(e => {
      response.status(400)
      return response.send(e)
    })
  }
}

let parseToSchemaList = (data, token) => {
  return new Promise(resolve => {
    let result = []
    result = data.application.hidden_data.payment_options.map(async method => {
      let item = {}
      if (!(item.discount = listSchema.item.discount(method, data))) {
        delete item.discount
      }
      if (!(item.icon = listSchema.item.icon(method))) {
        delete item.icon
      }
      if (!(item.installment_options = listSchema.item.installment_options(method, data))) {
        delete item.installment_options
      }
      if (!(item.intermediator = listSchema.item.intermediator(method))) {
        delete item.intermediator
      }
      if (method.type === 'credit_card') {
        if (!(item.js_client = await listSchema.item.js_client(token))) {
          delete item.js_client
        }
      }
      if (!(item.label = listSchema.item.label(method))) {
        delete item.label
      }
      if (!(item.payment_method = listSchema.item.payment_method(method))) {
        delete item.payment_method
      }
      if (!(item.payment_url = listSchema.item.payment_url(method))) {
        delete item.payment_url
      }
      if (!(item.type = listSchema.item.type(method))) {
        delete item.type
      }
      return item
    })
    Promise.all(result).then((gateways) => {
      let options = optionsPaymentSchema(data)
      let promise = {
        payment_gateways: gateways,
        discount_options: options.discount_options,
        interest_free_installments: options.interest_free_installments
      }
      resolve(promise)
    })
  })
}

let paymentRequest = (requestPayment, orderResponse) => {
  let paymentSchema
  let orderId = orderResponse.id
  switch (requestPayment.params.payment_method.code) {
    case 'credit_card':
      paymentSchema = paymentOptions.card(requestPayment)
      break
    case 'banking_billet':
      paymentSchema = paymentOptions.boleto(requestPayment)
      break
    case 'online_debit':
      paymentSchema = paymentOptions.online_bank_debit(requestPayment)
      break
    default: break
  }
  return new Promise((resolve, reject) => {
    let options = {
      url: 'https://sandbox.moip.com.br/v2/orders/' + orderId + '/payments',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
      },
      body: paymentSchema,
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      if (resp.statusCode >= 400) {
        reject(resp.body)
      }
      resolve(body)
    })
  })
}

let ecomPayResponse = (payment) => {
  switch (payment.fundingInstrument.method) {
    case 'BOLETO': return ecomPayResponseSchemas.boleto(payment)
    case 'CREDIT_CARD': return ecomPayResponseSchemas.card(payment)
    case 'ONLINE_BANK_DEBIT': return ecomPayResponseSchemas.debit(payment)
    default: break
  }
}

let paymentStatus = (status) => {
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

let optionsPaymentSchema = (params) => {
  let freeInstallments
  params.application.hidden_data.payment_options.forEach(data => {
    if (typeof data.installments !== 'undefined') {
      data.installments.filter(option => {
        if (option.tax === false) {
          freeInstallments = option.number
        }
      })
    }
  })

  let boleto = params.application.hidden_data.payment_options.find(hidden => {
    if (hidden.type === 'banking_billet') {
      return hidden
    }
  })
  return {
    discount_options: {
      label: boleto.name,
      type: boleto.discount.type,
      value: boleto.discount.value
    },
    interest_free_installments: freeInstallments
  }
}

let listSchema = {
  item: {
    discount: (payment, data) => {
      if (payment.discount) {
        let discount = data.application.hidden_data.payment_options.filter(el => {
          if (!el.discount) {
            return false
          }
          return true
        }).reduce(service => {
          if (payment.type === service.type) {
            return {
              type: service.discount.type,
              value: service.discount.value
            }
          }
        })
        return discount
      }
      return false
    },
    icon: (payment) => {
      if (payment.icon) {
        return payment.icon
      }
      return false
    },
    installment_options: (payment, data) => {
      if (payment.installments) {
        let parcelasSemJuros
        let parcelasComJuros
        let valorJuros
        payment.installments.map(installment => {
          if (installment.tax === true) {
            parcelasComJuros = installment.number
            valorJuros = installment.tax_value
          } else {
            parcelasSemJuros = installment.number
          }
        })

        let items = []
        for (let i = 1; i <= parcelasSemJuros; i++) {
          if (i > 1) {
            let item = {
              number: i,
              tax: false,
              value: (data.params.amount.total / i)
            }
            items.push(item)
          }
        }
        for (let j = parcelasSemJuros + 1; j <= parcelasComJuros; j++) {
          let finalValue = data.params.amount.total / j
          let item = {
            number: j,
            tax: true,
            value: (finalValue * valorJuros) + finalValue
          }
          items.push(item)
        }
        return items
      }
      return false
    },
    intermediator: (payment) => {
      if (payment.intermediator) {
        return {
          code: payment.intermediator.code,
          link: payment.intermediator.link,
          name: payment.intermediator.name
        }
      }
    },
    js_client: async (token) => {
      let pubk = await auth.getPublicKey(token).catch(e => console.log(e))
      pubk = JSON.parse(pubk)
      pubk = pubk.keys.encryption
      return new Promise(resolve => {
        let onloadFunction = "(function(){var pubKey=JSON.parse('" + JSON.stringify(pubk) + "'); window.wirecardHash=function(obj){if(!MoipValidator.isValidNumber(obj.number)){return new Promise(function(resolve,reject){reject(new Error('Card number invalid.'))})} if(!MoipValidator.isSecurityCodeValid(obj.number,obj.cvc)){return new Promise(function(resolve,reject){reject(new Error('Card cvc invalid.'))})} if(!MoipValidator.isExpiryDateValid(obj.expirationMonth,obj.expirationYear)){return new Promise(function(resolve,reject){reject(new Erro('Card expiration invalid.'))})} return MoipSdkJs.MoipCreditCard.setPubKey(pubKey).setCreditCard({number:obj.number,cvc:obj.cvc,expirationMonth:obj.expirationYear,expirationYear:obj.expirationYear}).hash().then(function(hash){console.log('hash',hash)})} window.wirecardBrand=function(obj){return MoipValidator.cardType(obj.number)}}())"
        let schema = {
          cc_brand: {
            function: 'window.wirecardBrand',
            is_promisse: false
          },
          cc_hash: {
            function: 'window.wirecardHash',
            is_promisse: true
          },
          fallback_script_uri: 'https://wirecard.ecomplus.biz/assets/moip-sdk-js.js',
          onload_expression: onloadFunction,
          script_uri: 'https://raw.githubusercontent.com/wirecardBrasil/moip-sdk-js/master/dist/moip-sdk-js.js'
        }
        return resolve(schema)
      })
    },
    label: (payment) => {
      if (payment.name) {
        return payment.name
      }
      return false
    },
    payment_method: (payment) => {
      if (payment.type) {
        return {
          code: payment.type,
          name: payment.name
        }
      }
    },
    payment_url: (payment) => {
      if (payment.url) {
        return payment.url
      }
      return false
    },
    type: (payment) => {
      return payment.payment_type || 'payment'
    }
  }
}

let paymentOptions = {
  boleto: (order) => {
    let expiration = order.application.hidden_data.payment_options.find(option => {
      if (option.type === 'banking_billet') {
        return option.expiration_date
      }
    })
    return {
      statementDescriptor: order.application.hidden_data.statement_descriptor,
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
      statementDescriptor: order.application.hidden_data.statement_descriptor,
      fundingInstrument: {
        method: 'CREDIT_CARD',
        creditCard: {
          hash: order.params.credit_card.hash,
          store: true,
          holder: {
            fullname: order.params.buyer.fullname,
            birthdate: order.params.buyer.birth_date.year + '-' + order.params.buyer.birth_date.month + '-' + order.params.buyer.birth_date.day,
            taxDocument: {
              type: 'CPF',
              number: order.params.buyer.doc_number
            },
            phone: {
              countryCode: order.params.buyer.phone.country_code,
              areaCode: order.params.buyer.phone.number.substr(0, 2),
              number: order.params.buyer.phone.number
            },
            billingAddress: {
              city: order.params.billing_address.city,
              complement: order.params.billing_address.complement,
              district: order.params.billing_address.province,
              street: order.params.billing_address.street,
              streetNumber: order.params.billing_address.number,
              zipCode: order.params.billing_address.zip,
              state: order.params.billing_address.province_code,
              country: order.params.billing_address.country_code
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

let ecomPayResponseSchemas = {
  boleto: (payment) => {
    return {
      redirect_to_payment: false,
      transaction: {
        amount: payment.amount.total,
        banking_billet: {
          code: payment.fundingInstrument.boleto.lineCode,
          link: payment._links.payBoleto.printHref,
          text_lines: [
            payment.fundingInstrument.boleto.instructionLines.first || '',
            payment.fundingInstrument.boleto.instructionLines.second || '',
            payment.fundingInstrument.boleto.instructionLines.third || ''
          ],
          valid_thru: new Date(payment.fundingInstrument.boleto.expirationDate).toISOString()
        },
        creditor_fees: {
          installment: payment.installmentCount,
          intermediation: payment.fees[0].amount
        },
        currency_id: payment.amount.currency,
        installments: {
          number: payment.installmentCount
        },
        intermediator: {
          payment_method: {
            code: 'banking_billet',
            name: 'Boleto'
          },
          transaction_id: payment.id,
          transaction_code: payment.id,
          transaction_reference: payment._links.order.title
        },
        payment_link: payment._links.self.href,
        status: {
          current: paymentStatus(payment.status)
        }
      }
    }
  },
  card: (payment) => {
    return {
      redirect_to_payment: false,
      transaction: {
        amount: payment.amount.total,
        credit_card: {
          avs_result_code: null,
          company: payment.fundingInstrument.creditCard.brand,
          cvv_result_code: null,
          holder_name: payment.fundingInstrument.creditCard.holder.fullname,
          last_digits: payment.fundingInstrument.creditCard.last4,
          token: payment.fundingInstrument.creditCard.id
        },
        creditor_fees: {
          installment: payment.installmentCount,
          intermediation: payment.fees.amount
        },
        currency_id: payment.amount.currency,
        installments: {
          number: payment.installmentCount,
          tax: payment.amount.fees,
          total: payment.amount.total,
          value: payment.amount.gross
        },
        intermediator: {
          payment_method: {
            code: 'credit_card',
            name: 'Cartão de Crédito'
          },
          transaction_id: payment.id,
          transaction_code: payment.id,
          transaction_reference: payment._links.order.title
        },
        payment_link: payment._links.self.href,
        status: {
          current: paymentStatus(payment.status)
        }
      }
    }
  },
  debit: (payment) => {
    return {
      redirect_to_payment: true,
      transaction: {
        amount: payment.amount.total,
        payment_link: payment._links.payOnlineBankDebitItau.redirectHref
      }
    }
  }
}
