'use strict'
const logger = require('console-files')
const rq = require('request')
const { internalApi } = require('./Api/Api')
module.exports = (payload, storeId) => {
  const { params, application } = payload
  const resource = (application.hidden_data.hasOwnProperty('sandbox') && application.hidden_data.sandbox === true) ? 'https://sandbox.moip.com.br/v2/orders' : 'https://moip.com.br/v2/orders'

  return new Promise((resolve, reject) => {
    internalApi

      .then(api => {
        return api.getWirecardAuth(storeId)
      })

      .then(auth => {

        try {
          let options = {
            method: 'POST',
            url: resource,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'bearer ' + auth.w_access_token
            },
            body: parseToSchema(params, application),
            json: true
          }
          rq(options, (erro, resp, body) => {
            if (erro || resp.statusCode >= 400) {
              reject(new Error(JSON.stringify(body)))
            }

            resolve({ body, payload, auth })
          })
        } catch (error) {
          logger.error('WIRECARD_ORDER_PARSER', error)
          throw error
        }
      })

      .catch(e => {
        reject(new Error(e))
      })
  })
}

const parseToSchema = (params, application) => {
  return {
    ownId: params.order_number,
    amount: {
      currency: params.currency_id,
      subtotals: {
        shipping: Math.abs(params.amount.freight * 100).toFixed(),
        addition: paymentAddition(params, application),
        discount: Math.abs(params.amount.discount * 100).toFixed() || 0
      }
    },
    items: orderItems(params),
    customer: {
      ownId: params.buyer.customer_id,
      fullname: params.buyer.fullname,
      email: params.buyer.email,
      birthDate: birthDateConvert(params.buyer.birth_date),
      taxDocument: {
        type: params.buyer.registry_type === 'p' ? 'CPF' : 'CNPJ',
        number: params.buyer.doc_number
      },
      phone: {
        countryCode: params.buyer.phone.country_code || '55',
        areaCode: params.buyer.phone.number.substr(0, 2),
        number: params.buyer.phone.number
      },
      shippingAddress: {
        city: params.to.city,
        district: params.to.borough,
        street: params.to.street,
        streetNumber: params.to.number,
        zipCode: params.to.zip,
        state: (params.hasOwnProperty('to')) && (params.to.hasOwnProperty('province_code')) ? params.to.province_code : params.to.province,
        country: params.to.country_code || 'BRA'
      }
    }
  }
}

const paymentAddition = (params, application) => {
  if (params.payment_method.code === 'credit_card') {
    if (application.hasOwnProperty('hidden_data') && application.hidden_data.hasOwnProperty('payment_options')) {
      let paymentCredit = application.hidden_data.payment_options.find(payment => payment.type === 'credit_card')
      if (paymentCredit) {
        let installmentTax = paymentCredit.installments.find(installment => installment.tax === true)
        let installmentNoTax = paymentCredit.installments.find(installment => installment.tax === false)
        if (installmentTax && installmentNoTax) {
          if (params.installments_number > installmentNoTax.number) {
            let tax = installmentTax.tax_value / 100
            return Math.abs((params.amount.total * tax) * 100).toFixed()
          }
        }
      }
    }
  }
  return 0
}

const orderItems = params => {
  let { items } = params
  let products = []
  products = items.map(item => {
    return {
      product: item.name,
      quantity: (item.hasOwnProperty('quantity') && item.quantity > 0) ? item.quantity : 1,
      price: Math.abs(item.price * 100).toFixed()
    }
  })
  return products
}

const birthDateConvert = birthdate => {
  let {
    year,
    month,
    day
  } = birthdate
  return year + '-' + month + '-' + day
}
