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
        redirect_uri: config.WC_REDIRECT_URI,
        grant_type: 'authorization_code',
        code: request.query.code
      })
    }
    rq.post(options, (erro, resp, body) => {
      console.log(body)
      if (resp.statusCode >= 400) {
        response.status(400)
        return response.send(resp.body)
      }
      let params = {
        x_store_id: request.query.x_store_id,
        w_access_token: body.access_token,
        w_refresh_token: body.refresh_token,
        w_expires_in: body.expires_in,
        w_scope: body.scope,
        w_account_id: body.moipAccount.id
      }
      sql.insert(params, 'access').then(r => {
        response.write('<script>window.close()</script>')
        return response.end()
      }).catch(e => {
        response.status(400)
        return response.send(e)
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
  console.log(request.body)
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
      sql.insert(params, 'auth').then((res) => {
        response.status(201)
        response.header('Content-Type', 'application/json')
        response.json({
          sucess: true,
          rows_inserted: res
        })
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
      sql.update(params, { application_app_id: request.body.application.app_id }, 'auth').then((res) => {
        response.status(200)
        response.header('Content-Type', 'application/json')
        response.json({
          sucess: true,
          rows_updated: res
        })
      }).catch(e => console.log(e))
    }
  })
}

let appSaveAuthentication = async (request) => {
  console.log(request.body)
  try {
    return await sql.update({ app_token: request.body.access_token }, { x_store_id: request.headers['x-store-id'], application_id: request.body.my_id }, 'auth')
  } catch (e) {
    return console.log(e)
  }
}
