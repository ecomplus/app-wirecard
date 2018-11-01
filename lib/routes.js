const wirecard = require('./wirecard')

let routes = {
  autentication: {
    oauth: (request, response) => {
      let url = wirecard.auth.getAuthorizeUrl(request)
      return response.redirect(301, url)
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
    list: (request, response) => { wirecard.payments.list(request, response) },
    create: (request, response) => { wirecard.payments.create(request, response) }
  }
}

module.exports = routes
