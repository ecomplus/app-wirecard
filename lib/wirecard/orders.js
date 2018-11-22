const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')

module.exports = {
  order: {
    new: (order, xstoreid) => {
      return new Promise((resolve, reject) => {
        let options = {
          url: endpoints.orders,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
          },
          body: parseOrder(order, xstoreid),
          json: true
        }
        rq.post(options, (erro, resp, body) => {
          console.log(resp.body)
          if (resp.statusCode > 400) {
            reject(new Error(JSON.stringify(resp.body)))
          }
          resolve(body)
        })
      })
    }
  }
}

let parseOrder = (payload, xstoreid) => {
  return {
    ownId: payload.params.order_number,
    amount: {
      currency: payload.params.currency_id
    },
    items: parderOrderItems(payload.params.items),
    customer: {
      // id: payload.params.intermediator_buyer_id,
      ownId: payload.params.buyer.customer_id,
      fullname: payload.params.buyer.fullname,
      email: payload.params.buyer.email,
      birthDate: parseBirthDate(payload.params.buyer.birth_date),
      taxDocument: {
        type: payload.params.buyer.registry_type === 'p' ? 'CPF' : 'CNPJ',
        number: payload.params.buyer.doc_number
      },
      phone: {
        countryCode: payload.params.buyer.phone.country_code || "55",
        areaCode: payload.params.buyer.phone.number.substr(0, 2),
        number: payload.params.buyer.phone.number,
        shippingAddress: {
          city: payload.params.billing_address.city,
          // complement: payload.params.billing_address.complement,
          district: payload.params.billing_address.borough,
          street: payload.params.billing_address.street,
          streetNumber: payload.params.billing_address.number,
          zipCode: payload.params.billing_address.zip,
          state: payload.params.billing_address.province_code,
          country: payload.params.billing_address.country_code || 'BRA'
        }
      }
    }
  }
}

let parderOrderItems = (items) => {
  let products = []
  products = items.map(item => {
    return {
      product: item.name,
      quantity: item.quantity,
      price: Math.round(item.price * 100) // wirecard só aceita inteiro
    }
  })
  return products
}

let parseBirthDate = (birthdate) => {
  return birthdate.year + '-' + birthdate.month + '-' + birthdate.day
}
