const wirecard = require('./wirecard')
const WebHooks = require('./wirecard/webhooks')
let routes = {
  autentication: {
    oauth: (request, response) => {
      let url = wirecard.auth.getAuthorizeUrl(request)
      return response.redirect(301, url)
    },
    setToken: (request, response) => {
      wirecard.auth.getToken(request.query.code, request.query.x_store_id)
        .then(r => {
          console.log(r)
          response.write('<script>window.close()</script>')
          response.end()
        })
        .catch(e => {
          console.log(e)
          response.status(400)
          return response.send(e)
        })
    },
    getKey: (request, response) => {
      wirecard.auth.getKeys(request, response)
    },
    app: (request, response) => {
      wirecard.auth.app(request, response)
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
  },
  webhooks: {
    post: async (request, response) => {
      if (request.body) {
        let wh = new WebHooks()
        wh.notification(request.body).then(r => {
          response.status(200)
          response.send(r)
        }).catch(e => console.log(e))
      }
    }
  }
}

module.exports = routes
