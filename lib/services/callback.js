'use strict'
const { ecomAuth } = require('ecomplus-app-sdk')
const logger = require('console-files')
const rq = require('request')
const qs = require('querystring')
const config = require('../config')
const endpoints = require('./endpoints')
const sql = require('./sql')

module.exports.ecomplus = async (request, response) => {
  ecomAuth.then(sdk => {
    let storeId = parseInt(request.headers['x-store-id'], 10)
    let body = request.body
    sdk.handleCallback(storeId, body).then(async ({ isNew, authenticationId }) => {
      // just respond first
      response.status(204)
      // handle successful authentication flux
      if (!isNew) {
        // not a new app installed
        // authentication done
        // create procedures if not already created
        let auth = await sdk.getAuth(storeId, authenticationId)
        sdk.apiRequest(storeId, '/procedures.json', 'POST', {}, auth)
      }
      return response.end()
    })
      .catch(err => {
        if (typeof err.code === 'string' && !err.code.startsWith('SQLITE_CONSTRAINT')) {
          // debug SQLite errors
          logger.error(err)
        }
        response.status(500)
        return response.send({ erro: 'wirecard_callback_erro', message: err.message })
      })
  })
    .catch(e => console.log('Erro', e))
}

module.exports.wirecard = async (request, response) => {
  let { code, storeId } = request.query
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
    if (erro || resp.statusCode >= 400) {
      let urlRetry = endpoints.authorizeUrl + '?' + qs.stringify({
        response_type: 'code',
        client_id: config.WC_ID,
        redirect_uri: config.WC_REDIRECT_URI + '?storeId=' + request.query.storeId,
        scope: config.WC_SCOPE
      })
      let msg = '<html>Autenticação falhou, refaça no <a href="' + urlRetry + '">link.</a></html>'
      response.status(400)
      response.set('Content-Type', 'text/html; charset=utf-8')
      response.write(msg)
      return response.end()
    }

    const successResponse = () => {
      response.status(200)
      response.write('<script>window.close()</script>')
      return response.end()
    }
    const erroResponse = (e) => {
      let msg = 'Erro ao atualizar as informações do wirecard.\n' + e
      logger.error(msg)
      response.status(400)
      return response.send(msg)
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
        .then(successResponse)
        .catch(erroResponse)
    }

    sql.insert(params, 'wirecard_app_auth')
      .then(successResponse)
      .catch(erroResponse)
  })
  // register wirecard webhook
  console.log('End')
}

module.exports.requestCallback = (request, response) => {
  if (!request.query.x_store_id) {
    response.status(400)
    return response.send('X-Store-Id not found.')
  }
  let url = endpoints.authorizeUrl + '?' + qs.stringify({
    response_type: 'code',
    client_id: config.WC_ID,
    redirect_uri: config.WC_REDIRECT_URI + '?storeId=' + request.query.x_store_id,
    scope: config.WC_SCOPE
  })
  return response.redirect(301, url)
}
