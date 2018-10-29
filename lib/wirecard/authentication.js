const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')
const qs = require('querystring')

module.exports = {
  getAuthorizeUrl: () => {
    return endpoints.authorizeUrl + '?' + qs.stringify({
      response_type: 'code',
      client_id: config.WC_ID,
      redirect_uri: config.WC_REDIRECT_URI,
      scope: config.WC_SCOPE
    })
  },
  getToken: (request, response) => {
    if (!request.query.code || typeof request.query.code === 'undefined') {
      response.status(400)
      return response.send({ erro: 'code param not found.' })
    }
    let options = {
      url: endpoints.generateTokenUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': config.WC_ACCESS_TOKEN
      },
      form: qs.stringify({
        client_id: config.WC_ID,
        client_secret: config.WC_APP_SECRET,
        redirect_uri: config.WC_REDIRECT_URI,
        grant_type: 'authorization_code',
        code: request.query.code
      }),
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      console.log(JSON.stringify(body, 'undefined', 4))
      response.end()
    })
  },
  updateToken: (request, response) => {
  },
  getKeys: (request, response) => {
    let options = {
      url: endpoints.keys,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer '
      }
    }
    rq.get(options, (erro, resp, body) => {
      if (erro) {

      }

      return response.end()
    })
  }
}
