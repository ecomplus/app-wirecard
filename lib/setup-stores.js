const sqlite = require('sqlite3').verbose()
const db = new sqlite.Database('/var/dbs/wirecard.sqlite')
const logger = require('console-files')
const rq = require('request')
const path = (process.env.WC_SANDBOX && process.env.WC_SANDBOX === 'true') ? 'https://sandbox.moip.com.br' : 'https://api.moip.com.br'
//
module.exports = (appSdk) => {
  logger.log('--> Setup wirecard webhooks')

  const task = () => {
    let query = 'SELECT store_id, w_access_token FROM wirecard_app_auth WHERE setted_up = ?'
    db.each(query, [0], (err, row) => {
      if (!err) {
        if (row) {
          (() => {
            return new Promise((resolve, reject) => {
              let resource = `${path}/v2/preferences/${process.env.WC_ID}/notifications`
              let body = {
                events: ['PAYMENT.WAITING', 'PAYMENT.IN_ANALYSIS', 'PAYMENT.AUTHORIZED', 'PAYMENT.CANCELLED', 'PAYMENT.REFUNDED', 'PAYMENT.SETTLED'],
                target: 'https://wirecard.ecomplus.biz/wirecard/notifications/' + row.store_id,
                media: 'WEBHOOK'
              }

              let options = {
                method: 'POST',
                url: resource,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'bearer ' + process.env.WC_ACCESS_TOKEN
                },
                body: body,
                json: true
              }
              rq(options, (erro, resp, result) => {
                if (erro || resp.statusCode >= 400) {
                  reject(new Error(JSON.stringify(resp.body)))
                } else {
                  resolve(row)
                }
              })
            })
          })()

            .then(() => {
              return new Promise((resolve, reject) => {
                let options = {
                  method: 'GET',
                  url: `${path}/v2/keys`,
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${row.w_access_token}`
                  }
                }
                rq.get(options, async (err, resp, body) => {
                  if (err) {
                    reject(new Error(err))
                  }

                  let parse = JSON.parse(body)
                  let auth = await appSdk.getAuth(row.store_id)
                  let appId = auth.row.application_id
                  let resource = `applications/${appId}/hidden_data.json`
                  let method = 'PATCH'
                  let update = {
                    public_key: parse.keys.encryption
                  }
                  appSdk.apiRequest(row.store_id, resource, method, update, auth).then(resolve).catch(reject)
                })
              })
            })

            .then(() => {
              return new Promise((resolve, reject) => {
                let query = 'UPDATE wirecard_app_auth SET setted_up = ? WHERE store_id = ?'
                db.run(query, [1, row.store_id], erro => {
                  if (erro) {
                    reject(new Error(erro))
                  } else {
                    resolve()
                  }
                })
              })
            })

            .then(() => {
              logger.log('Wirecard setup for store #', row.store_id)
            })

            .catch(error => {
              logger.error('WIRECARD_SETUP_ERR', error)
            })
        }
      }
    })
  }
  let interval = 5000
  setInterval(task, interval)
}
