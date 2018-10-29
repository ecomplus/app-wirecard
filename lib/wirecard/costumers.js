const endpoints = require('./endpoints')
const rq = require('request')
const config = require('./../config')

module.exports = {
  new: (request) => {
    return new Promise((resolve, reject) => {
      let options = {
        method: 'POST',
        url: endpoints.customers,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
        },
        body: request.body,
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
