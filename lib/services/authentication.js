const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')
const qs = require('querystring')
const sql = require('./../services/sql')
const webhooks = require('./webhooks')
const logger = require('console-files')

const getAuthorizeUrl = (request, response) => {
  if (!request.query.x_store_id) {
    response.status(400)
    return response.send('X-Store-Id not found.')
  }
  let url = endpoints.authorizeUrl + '?' + qs.stringify({
    response_type: 'code',
    client_id: config.WC_ID,
    redirect_uri: config.WC_REDIRECT_URI + '?x_store_id=' + request.query.x_store_id,
    scope: config.WC_SCOPE
  })
  return response.redirect(301, url)
}

const setWirecardToken = (request, response) => {
  let code = request.query.code
  let storeId = request.query.x_store_id
  //
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
  //
  rq.post(options, async (erro, resp, body) => {
    if (resp.statusCode >= 400) {
      logger.error('Erro com a solicitação ao Wirecard.' + resp.body)
      response.status(400)
      return response.send(resp.body)
    }
    body = JSON.parse(body)
    let params = {
      store_id: storeId,
      w_access_token: body.access_token,
      w_refresh_token: body.refresh_token,
      w_expires_in: body.expires_in,
      w_scope: body.scope,
      w_account_id: body.moipAccount.id
    }

    let auth = await sql.select({ store_id: storeId }, 'wirecard_app_auth')

    if (auth) {
      sql.update(params, { store_id: storeId }, 'wirecard_app_auth')
        .then(resp => {
          response.status(200)
          response.write('<script>window.close()</script>')
          return response.end()
        })
        .catch(e => {
          logger.error('Atualização da autenticação no banco falhou -> ' + e)
          response.status(400)
          return response.send('Atualização da autenticação no banco falhou -> ' + e)
        })
    }

    sql.insert(params, 'wirecard_app_auth')
      .then(resp => {
        webhooks.register(storeId)
          .then(() => {
            response.write('<script>window.close()</script>')
            response.status(200)
            return response.end()
          })
      })
      .catch(erro => {
        logger.error('Inserção da autenticação no banco falhou -> ' + e)
        response.status(400)
        return response.send('Inserção da autenticação no banco falhou -> ' + e)
      })
  })
}

const updateAppToken = (request, response) => {
}

const updateWirecardToken = (request, response) => {
}

const getPublicKey = async (token) => {
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
}

const setAppAuth = (request, response) => {
  if (!request.body.access_token) {
    // Se não houver acess_token
    // É registro de app
    setAppAuthentication(request, response)
  } else {
    // Se houver são os dados de autorização da aplicação
    saveAppAuthentication(request, response)
  }
}

let setAppAuthentication = async (request, response) => {
  let app = await sql.select({ application_app_id: request.body.application.app_id }, 'ecomplus_app_auth').catch(e => console.log(e))
  if (!app) {
    let params = {
      application_id: request.body.application._id,
      application_app_id: request.body.application.app_id,
      application_title: request.body.application.title,
      authentication_id: request.body.authentication._id,
      authentication_permission: JSON.stringify(request.body.authentication.permissions),
      store_id: request.body.store_id
    }
    sql.insert(params, 'ecomplus_app_auth')
      .then(restorno => {
        response.status(201)
        return response.end()
      })
      .catch(e => {
        logger.error('Erro ao setar autenticação do aplicativo para X-Store-Id : ' + e)
        response.status(400)
        return response.end()
      })
  } else {
    let params = {
      application_id: request.body.application._id ? request.body.application._id : app.application_id,
      application_app_id: request.body.application.app_id ? request.body.application.app_id : app.application_app_id,
      application_title: request.body.application.title ? request.body.application.title : app.application_title,
      authentication_id: request.body.authentication._id ? request.body.authentication._id : app.authentication_id,
      authentication_permission: JSON.stringify(request.body.authentication.permissions) ? JSON.stringify(request.body.authentication.permissions) : app.authentication_permission,
      x_store_id: request.body.store_id ? request.body.store_id : app.store_id
    }
    sql.update(params, { application_app_id: request.body.application.app_id }, 'auth').then((res) => {
      response.status(204)
      return response.end()
    }).catch(e => {
      logger.error('Erro ao atualizar autenticação do aplicativo para X-Store-Id : ' + e)
      response.status(400)
      return response.end()
    })
  }

  getAppAuthentication(request.headers['x-store-id'], request.body.authentication._id)
    .then(() => {
      response.status(200)
      return response.end()
    })
    .catch(e => {
      logger.error('Erro ao solicitar autenticação para o app: ' + e)
      response.status(400)
      return response.end()
    })
}

let getAppAuthentication = async (storeId, authenticationId) => {
  return rq.post({
    method: 'POST',
    uri: 'https://api.e-com.plus/v1/_callback.json',
    headers: {
      'Content-Type': 'application/json',
      'X-Store-ID': storeId
    },
    body: { '_id': authenticationId },
    json: true
  })
}

let saveAppAuthentication = async (request, response) => {
  try {
    sql.update({ app_token: request.body.access_token }, { store_id: request.headers['x-store-id'], authentication_id: request.body.my_id }, 'ecomplus_app_auth')
    response.status(200)
    return response.end()
  } catch (e) {
    response.status(400)
    return response.end()
  }
}

module.exports = {
  getAuthorizeUrl,
  setWirecardToken,
  getPublicKey,
  setAppAuth,
  updateAppToken,
  updateWirecardToken,
  getAppAuthentication
}
