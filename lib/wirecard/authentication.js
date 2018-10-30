const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')
const qs = require('querystring')
const sql = require('./../services/sql')

module.exports = {
  getAuthorizeUrl: (request) => {
    if (!request.query.x_store_id) {
      return false
    }
    return endpoints.authorizeUrl + '?' + qs.stringify({
      response_type: 'code',
      client_id: config.WC_ID,
      redirect_uri: config.WC_REDIRECT_URI + '?x_store_id=' + request.query.x_store_id,
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
        redirect_uri: config.WC_REDIRECT_URI + '?x_store_id=' + request.query.x_store_id,
        grant_type: 'authorization_code',
        code: request.query.code
      }),
      json: true
    }
    rq.post(options, (erro, resp, body) => {
      if (erro || resp.body.ERROR) {
        let e = erro || resp.body.ERROR
        response.status(400)
        return response.send(e)
      }
      let params = {
        x_store_id: request.query.x_store_id,
        w_access_token: body.access_token,
        w_refresh_token: body.refresh_token,
        w_expires_in: body.expires_in,
        w_scope: body.scope,
        w_account_id: body.moipAccount.id
      }
      sql.insert(params, (r, e) => {
        if (e) {
          response.status(400)
          return response.send(e)
        }
        response.write('<script>window.close()</script>')
        return response.end()
      })
    })
  },
  updateToken: (request, response) => {
  },
  getPublicKey: (token) => {
    return new Promise((resolve, reject) => {
      let options = {
        url: endpoints.keys,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + token
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
  }
}
