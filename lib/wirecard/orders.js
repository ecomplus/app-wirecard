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
          if (resp.statusCode > 400) {
            reject(new Error(JSON.stringify(resp.body)))
          }
          resolve(body)
        })
      })
    }
  }
}

let parseOrder = (order, xstoreid) => {
  return {
    ownId: order.params.order_number + '_' + xstoreid,
    amount: {
      currency: order.params.currency_id
    },
    items: parderOrderItems(order.params.items),
    customer: {
      id: order.params.intermediator_buyer_id,
      ownid: order.params.buyers.customers_id,
      fullname: order.params.buyers.fullname,
      email: order.params.buyers.email,
      birthDate: parseBirthDate(order.params.buyers.birth_date),
      taxDocument: {
        type: order.params.buyers.registry_type === 'p' ? 'CPF' : 'CNPJ',
        number: order.params.buyers.doc_number
      },
      phone: {
        countryCode: order.params.buyers.phone.country_code,
        areaCode: order.params.buyers.phone.number.substr(0, 2),
        number: order.params.buyers.phone.number,
        shippingAddress: {
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

let parderOrderItems = (items) => {
  let products = []
  products = items.map(item => {
    return {
      product: item.name,
      quantity: item.quantity,
      price: item.price
    }
  })
  return products
}

let parseBirthDate = (birthdate) => {
  return birthdate.year + '-' + birthdate.month + '-' + birthdate.day
}
