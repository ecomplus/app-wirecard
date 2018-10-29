// const config = require('./config')
// const rq = require('request')
const wirecard = require('./wirecard')

let routes = {
  autentication: {
    oauth: (request, response) => {
      console.log(wirecard.auth.getAuthorizeUrl())
      return response.redirect(301, wirecard.auth.getAuthorizeUrl())
    },
    setToken: (request, response) => {
      wirecard.auth.getToken(request, response)
    },
    getKey: (request, response) => {
      wirecard.auth.getKeys(request, response)
    }
  },
  customers: {
    new: (request, response) => {
      wirecard.costumers.new(request).then(resp => {
        response.status(201)
        return response.send(resp)
      }).catch(erro => {
        response.status(400)
        return response.send(erro)
      })
    }
  },
  payments: {
    list: (request, response) => { wirecard.payments.list(request, response) }
  }
}

module.exports = routes
