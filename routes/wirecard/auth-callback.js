'use strict'
const rq = require('request')
const qs = require('querystring')
const logger = require('console-files')
//
const { internalApi } = require('./../../lib/Api/Api')
//
module.exports = (appSdk) => {
  return (req, res) => {
    internalApi

      .then(api => api)

      .then(api => {
        const { code, storeId } = req.query
        let appEnv = (process.env.WC_SANDBOX) ? 'https://connect-sandbox.' : 'https://connect.'
        let wirecardUri = appEnv + 'moip.com.br/oauth/token'

        let reqOptions = {
          url: wirecardUri,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': process.env.WC_ACCESS_TOKEN
          },
          form: qs.stringify({
            client_id: process.env.WC_ID,
            client_secret: process.env.WC_APP_SECRET,
            redirect_uri: process.env.WC_REDIRECT_URI,
            grant_type: 'authorization_code',
            code: code
          })
        }

        rq.post(reqOptions, (erro, resp, body) => {
          if (erro || resp.statusCode >= 400) {
            throw erro
          }

          try {
            let wirecardBody = JSON.parse(body)
            let accessToken = wirecardBody.access_token
            let refreshToken = wirecardBody.refresh_token
            let expiresIn = wirecardBody.expires_in
            let scope = wirecardBody.scope
            let accountId = wirecardBody.moipAccount.id

            api.getWirecardAuth(storeId)
              .then(result => {
                if (result) {
                  return api.updateWirecardAuth(storeId, accessToken, refreshToken, expiresIn, scope, accountId)
                } else {
                  return api.addWirecardAuth(storeId, accessToken, refreshToken, expiresIn, scope, accountId)
                }
              })
              /** Save publicKey at application.data */
              .then(() => {
                let resource = (process.env.WC_SANDBOX) ? 'https://sandbox.moip.com.br' : 'https://api.moip.com.br'
                let options = {
                  method: 'GET',
                  url: resource + `/v2/keys`,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'bearer ' + accessToken
                  }
                }
                rq.get(options, async (err, resp, body) => {
                  if (err) {
                    throw err
                  }

                  try {
                    let auth = await appSdk.getAuth(storeId)
                    let appId = auth.row.application_id
                    let resource = `applications/${appId}/data.json`
                    let method = 'PATCH'
                    let update = {
                      public_key: body.keys.encryption
                    }
                    return appSdk.apiRequest(storeId, resource, method, update, auth)
                  } catch (error) {
                    throw error
                  }
                })
              })
          } catch (error) {
            throw error
          }
        })
      })
      .then(() => {
        res.status(200)
        res.write('<script>window.close()</script>')
        return res.end()
      })

      .catch(e => {
        logger.log('WIRECARD_OAUTH', e)
        res.status(400)
        res.write('Wirecard oauth callback erro')
        return res.end()
      })
  }
}