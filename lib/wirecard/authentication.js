const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')
const qs = require('querystring')
const sql = require('./../services/sql')
const WebHooks = require('./webhooks')

module.exports = {
  getAuthorizeUrl: (request) => {
    if (!request.query.x_store_id) {
      return false
    }
    console.log(endpoints.authorizeUrl)
    return endpoints.authorizeUrl + '?' + qs.stringify({
      response_type: 'code',
      client_id: config.WC_ID,
      redirect_uri: config.WC_REDIRECT_URI + '?x_store_id=' + request.query.x_store_id,
      scope: config.WC_SCOPE
    })
  },
  getToken: async (code, storeId) => {
    return new Promise((resolve, reject) => {
      if (!code || typeof code === 'undefined') {
        return reject(new Error('Wirecard code not found.'))
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
          code: code
        })
      }
      rq.post(options, async (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          return reject(new Error('Failed Wirecard API Request.'))
        }
        body = JSON.parse(body)
        let params = {
          x_store_id: storeId,
          w_access_token: body.access_token,
          w_refresh_token: body.refresh_token,
          w_expires_in: body.expires_in,
          w_scope: body.scope,
          w_account_id: body.moipAccount.id
        }
        console.log(params)

        let auth = await sql.select({ x_store_id: storeId }, 'access')

        if (auth) {
          console.log("Update")
          sql.update(params, { x_store_id: storeId }, 'access')
            .then(r => resolve(r))
            .catch(e => { return reject(new Error('Failed db update.' + e)) })
        }
        console.log("Insert")
        sql.insert(params, 'access')
          .then(r => {
            let wh = new WebHooks()
            wh.register(storeId)
              .then(r => {
                resolve(r)
              })
              .catch(e => {
                console.log(e)
                return reject(e)
              })
          })
          .catch(e => { return reject(new Error('Failed db insert.' + e)) })
      })
    })
  },
  updateToken: (request, response) => {
  },
  getPublicKey: async (token) => {
    return new Promise((resolve, reject) => {
      let options = {
        url: endpoints.keys,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'bearer ' + token
        }
      }
      rq.get(options, (erro, resp, body) => {
        if (resp.statusCode >= 400) {
          reject(new Error(resp.body))
        }
        resolve(body)
      })
    })
  },
  app: (request, response) => {
    if (!request.body.access_token) {
      // Se não houver acess_token
      // É registro de app
      appGetAuthentication(request, response)
    } else {
      // Se houver são os dados de autorização da aplicação
      appSaveAuthentication(request)
    }
  }
}

let appGetAuthentication = (request, response) => {
  sql.select({ application_app_id: request.body.application.app_id }, 'auth').then(ret => {
    if (!ret) {
      let params = {
        application_id: request.body.application._id,
        application_app_id: request.body.application.app_id,
        application_title: request.body.application.title,
        authentication_id: request.body.authentication._id,
        authentication_permission: JSON.stringify(request.body.authentication.permissions),
        x_store_id: request.body.store_id
      }
      console.log(params)
      sql.insert(params, 'auth').then((res) => {
        response.status(201)
        response.header('Content-Type', 'application/json')
        response.json({
          sucess: true,
          rows_inserted: res
        })
      }).catch(e => console.log(e))
    } else {
      let params = {
        application_id: request.body.application._id ? request.body.application._id : ret.application_id,
        application_app_id: request.body.application.app_id ? request.body.application.app_id : ret.application_app_id,
        application_title: request.body.application.title ? request.body.application.title : ret.application_title,
        authentication_id: request.body.authentication._id ? request.body.authentication._id : ret.authentication_id,
        authentication_permission: JSON.stringify(request.body.authentication.permissions) ? JSON.stringify(request.body.authentication.permissions) : ret.authentication_permission,
        x_store_id: request.body.store_id ? request.body.store_id : ret.store_id
      }
      console.log(params)
      sql.update(params, { application_app_id: request.body.application.app_id }, 'auth').then((res) => {
        response.status(200)
        response.header('Content-Type', 'application/json')
        response.json({
          sucess: true,
          rows_updated: res
        })
      }).catch(e => console.log(e))
    }
    return rq.post({
      method: 'POST',
      uri: 'https://api.e-com.plus/v1/_callback.json',
      headers: {
        'Content-Type': 'application/json',
        'X-Store-ID': request.body.store_id
      },
      body: { '_id': request.body.authentication._id },
      json: true
    })
  })
}

let appSaveAuthentication = async (request) => {
  try {
    console.log(request.body)
    return await sql.update({ app_token: request.body.access_token }, { x_store_id: request.headers['x-store-id'], authentication_id: request.body.my_id }, 'auth')
  } catch (e) {
    return console.log(e)
  }
}
