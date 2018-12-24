'use strict'

const listPayments = (data) => {
  return new Promise(resolve => {
    let result = []
    result = data.application.hidden_data.payment_options.map(async method => {
      let item = {}
      if (!(item.discount = listSchema.item.discount(method, data))) {
        delete item.discount
      }
      if (!(item.installment_options = listSchema.item.installment_options(method, data))) {
        delete item.installment_options
      }
      if (!(item.intermediator = listSchema.item.intermediator(method))) {
        delete item.intermediator
      }
      if (!(item.icon = listSchema.item.icon(method))) {
        delete item.icon
      }
      if (method.type === 'credit_card') {
        if (!(item.js_client = await listSchema.item.js_client())) {
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
      let options = listPaymentsOptions(data)
      let promise = {
        payment_gateways: gateways,
        discount_options: options.discount_options,
        interest_free_installments: options.interest_free_installments
      }
      resolve(promise)
    })
  })
}

const requestOrder = (payload) => {
  return {
    ownId: payload.params.order_number,
    amount: {
      currency: payload.params.currency_id,
      subtotals: {
        shipping: Math.abs(payload.params.amount.freight * 100).toFixed(),
        addition: paymentAddition(payload),
        discount: Math.abs(payload.params.amount.discount * 100).toFixed() || 0
      }
    },
    items: orderItems(payload.params.items),
    customer: {
      // id: payload.params.intermediator_buyer_id,
      ownId: payload.params.buyer.customer_id,
      fullname: payload.params.buyer.fullname,
      email: payload.params.buyer.email,
      birthDate: birthDateConvert(payload.params.buyer.birth_date),
      taxDocument: {
        type: payload.params.buyer.registry_type === 'p' ? 'CPF' : 'CNPJ',
        number: payload.params.buyer.doc_number
      },
      phone: {
        countryCode: payload.params.buyer.phone.country_code || '55',
        areaCode: payload.params.buyer.phone.number.substr(0, 2),
        number: payload.params.buyer.phone.number
      },
      shippingAddress: {
        city: payload.params.to.city,
        // complement: payload.params.to.complement,
        district: payload.params.to.borough,
        street: payload.params.to.street,
        streetNumber: payload.params.to.number,
        zipCode: payload.params.to.zip,
        state: (typeof payload.params.to !== 'undefined') && (typeof payload.params.to.province_code !== 'undefined') ? payload.params.to.province_code : payload.params.to.province,
        country: payload.params.to.country_code || 'BRA'
      }
    }
  }
}

const paymentAddition = payload => {
  if (payload.params.payment_method.code === 'credit_card') {
    if (payload.application.hasOwnProperty('hidden_data') && payload.application.hidden_data.hasOwnProperty('payment_options')) {
      let paymentCredit = payload.application.hidden_data.payment_options.find(payment => payment.type === 'credit_card')
      if (paymentCredit) {
        let installmentTax = paymentCredit.installments.find(installment => installment.tax === true)
        let installmentNoTax = paymentCredit.installments.find(installment => installment.tax === false)
        if (installmentTax && installmentNoTax) {
          if (payload.params.installments_number > installmentNoTax.number) {
            let tax = installmentTax.tax_value / 100
            return Math.abs((payload.params.amount.total * tax) * 100).toFixed()
          }
        }
      }
    }
  }
  return 0
}

// depreciada
const paymentDiscount = payload => {
  if (payload.params.payment_method.code === 'banking_billet' || payload.params.payment_method.code === 'online_debit') {
    if (payload.application.hasOwnProperty('hidden_data') && payload.application.hidden_data.hasOwnProperty('payment_options')) {
      let paymentOption = payload.application.hidden_data.payment_options.find(payment => payment.type === payload.params.payment_method.code)
      if (paymentOption) {
        if (paymentOption.hasOwnProperty('discount')) {
          switch (paymentOption.discount.type) {
            case 'percentage':
              let percent = paymentOption.discount.value / 100
              return Math.round((payload.params.amount.total * percent) * 100)
            case 'fixed':
              return (payload.params.amount.total - paymentOption.discount.value) * 100
            default: break
          }
        }
      }
    }
  }
  return 0
}

let paymentResponse = (payment) => {
  switch (payment.fundingInstrument.method) {
    case 'BOLETO': return methodSchemas.boleto(payment)
    case 'CREDIT_CARD': return methodSchemas.card(payment)
    case 'ONLINE_BANK_DEBIT': return methodSchemas.debit(payment)
    default: break
  }
}

let listSchema = {
  item: {
    discount: (payment, data) => {
      if (payment.discount) {
        let discount = data.application.hidden_data.payment_options.filter(el => {
          if (el.hasOwnProperty('discount')) {
            return true
          }
          return false
        }).reduce(service => {
          return {
            type: service.discount.type,
            value: service.discount.value
          }
        })
        return discount
      }
      return false
    },
    icon: (payment) => {
      if (payment.hasOwnProperty('icon') && payment.icon.hasOwnProperty('show') && payment.icon.show === true) {
        return payment.icon.url
      } else if (!payment.hasOwnProperty('icon') && payment.type === 'credit_card') {
        return 'https://ecom.nyc3.digitaloceanspaces.com/plus/assets/img/stamps/wirecard.png'
      } else if (payment.hasOwnProperty('icon') && payment.icon.hasOwnProperty('show') && payment.icon.show === false) {
        return false
      }
    },
    installment_options: (payment, data) => {
      if (payment.installments) {
        let parcelasSemJuros
        let parcelasComJuros
        let valorJuros
        payment.installments.map(installment => {
          if (installment.tax === true) {
            parcelasComJuros = installment.number
            valorJuros = installment.tax_value / 100
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
              value: Math.abs((data.params.amount.total / i).toFixed(2))
            }
            items.push(item)
          }
        }
        for (let j = parcelasSemJuros + 1; j <= parcelasComJuros; j++) {
          let finalValue = data.params.amount.total / j
          let item = {
            number: j,
            tax: true,
            value: Math.abs(((finalValue * valorJuros) + finalValue).toFixed(2))
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
    js_client: async () => {
      let pubk = `
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAi1LS9ugi2ei1oRwauUH4
      2WcIMZv71maQQ3zZ5DmCjxMgF1ZrgWr8yDyHSBXT1Jhf3DzVTU/Ww7gSQxsyElV9
      75SV+TmUPVCht/eR7cMd13PR0Vcjd8Mf+krfXq+qD3oza5Mcj4x7b48Y/hzG0/se
      eUeCm/Iayz5mfPsetPnBzozFhnjoozOQD/cSMn2FfNAABCVxlML7TQObt7IGG1Lb
      y8PQo4m8lCSfypDVtPgR4sLcjcGwXVzflxGAvEx9x2sRDf/rFdunkRR1N9dqud6A
      DVjxErgxws836ukitvrnBZaX/Cu7EpM3G9AgtgQGAySnvyEnV8l3g2Z/57unDJj+
      /QIDAQAB
      -----END PUBLIC KEY-----
      `
      return new Promise(resolve => {
        let onloadFunction = 'window.wirecardHash=function(n){return MoipSdkJs.MoipCreditCard.setPubKey(' + JSON.stringify(pubk) + ').setCreditCard({number:n.number,cvc:n.cvc,expirationMonth:n.month,expirationYear:n.year}).hash()},window.wirecardBrand=function(n){return MoipValidator.cardType(n.number)};'
        let schema = {
          cc_brand: {
            function: 'wirecardBrand',
            is_promise: false
          },
          cc_hash: {
            function: 'wirecardHash',
            is_promise: true
          },
          fallback_script_uri: 'https://ecom.nyc3.digitaloceanspaces.com/plus/assets/js/apps/moip-sdk-js.js',
          onload_expression: onloadFunction,
          script_uri: 'https://cdn.jsdelivr.net/gh/wirecardBrasil/moip-sdk-js@2/dist/moip-sdk-js.js'
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

let listPaymentsOptions = (params) => {
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
  //
  let boleto = params.application.hidden_data.payment_options.find(hidden => hidden.type === 'banking_billet')
  //
  return {
    discount_options: {
      label: boleto.name,
      type: boleto.discount.type,
      value: boleto.discount.value
    },
    interest_free_installments: freeInstallments
  }
}

let orderItems = (items) => {
  let products = []
  products = items.map(item => {
    return {
      product: item.name,
      quantity: item.quantity,
      price: Math.abs(item.price * 100).toFixed() // wirecard só aceita inteiro
    }
  })
  return products
}

let birthDateConvert = (birthdate) => {
  return birthdate.year + '-' + birthdate.month + '-' + birthdate.day
}

let methodSchemas = {
  boleto: (payment) => {
    return {
      redirect_to_payment: false,
      transaction: {
        amount: payment.amount.total / 100,
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
        amount: payment.amount.total / 100,
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
          tax: (payment.amount.fees > 0),
          total: payment.amount.total / 100,
          value: Math.abs((payment.amount.total / payment.installmentCount) / 100)
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
        status: {
          current: paymentStatus(payment.status)
        }
      }
    }
  },
  debit: (payment) => {
    return {
      redirect_to_payment: false,
      transaction: {
        amount: (payment.amount.total / 100),
        payment_link: payment._links.payOnlineBankDebitItau.redirectHref
      }
    }
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

module.exports = {
  listPayments,
  requestOrder,
  paymentResponse
}
