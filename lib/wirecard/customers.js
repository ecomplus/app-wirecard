const endpoints = require('./endpoints')
const rq = require('request')
const config = require('../config')

module.exports = {
  new: (customer) => {
    return new Promise((resolve, reject) => {
      if (!customer || typeof customer === 'undefined') {
        reject(new Error('Customer body empty.'))
      }

      let options = {
        method: 'POST',
        url: endpoints.customers,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        },
        body: newCostumerSchema(customer),
        json: true
      }
      rq.post(options, (erro, resp, body) => {
        if (erro || resp.body.ERROR) {
          let e = erro || resp.body.ERROR
          reject(e)
        }
        resolve(body)
      })
    })
  },
  get: (customersId) => {
    return new Promise((resolve, reject) => {
      let options = {
        method: 'GET',
        url: endpoints.customers + '/' + customersId,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        }
      }
      rq.get(options, (erro, resp, body) => {
        if (erro || resp.body.ERROR) {
          let e = erro || resp.body.ERROR
          reject(e)
        }
        resolve(body)
      })
    })
  },
  card: {
    add: (data, customerId) => {
      return new Promise((resolve, reject) => {
        let options = {
          method: 'POST',
          url: endpoints.customers + '/' + customerId + '/fundinginstruments',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
          },
          body: data,
          json: true
        }
        rq.post(options, (erro, resp, body) => {
          if (erro || resp.body.ERROR) {
            let e = erro || resp.body.ERROR
            reject(e)
          }
          resolve(body)
        })
      })
    },
    remove: (cardId) => {
      return new Promise((resolve, reject) => {
        let options = {
          url: endpoints.customers + '/fundinginstruments/' + cardId,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
          },
          body: data,
          json: true
        }
        rq.delete(options, (erro, resp) => {
          if (erro || resp.body.ERROR) {
            let e = erro || resp.body.ERROR
            reject(e)
          }
          resolve(200)
        })
      })
    }
  }
}

let newCostumerSchema = (customer) => {
  return {
    ownId: customer.params.buyers._id,
    fullname: customer.params.buyers.display_name,
    email: customer.params.buyers.email,
    birthDate: parseBirthDate(customer.params.buyers.birth_date),
    taxDocument: {
      type: customer.params.buyers.registry_type == 'p' ? 'CPF' : 'CNPJ',
      number: customer.params.buyers.doc_number
    },
    phone: {
      countryCode: customer.params.buyers.phones.country_code,
      areaCode: customer.params.buyers.phones.number.substr(0,2),
      number: customer.params.buyers.phones.number
    },
    shippingAddress: {
      city: customer.params.billing_address.city,
      complement: customer.params.billing_address.complement,
      district: customer.params.billing_address.province,
      street: customer.params.billing_address.street,
      streetNumber: customer.params.billing_address.number,
      zipCode: customer.params.billing_address.zip,
      state: customer.params.billing_address.province_code,
      country: customer.params.billing_address.country_code
    }
  }
}

let parseBirthDate = (birthdate) => {
  return birthdate.year + '-' + birthdate.month + '-' + birthdate.day
}