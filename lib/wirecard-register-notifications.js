const sqlite = require('sqlite3').verbose()
const db = new sqlite.Database(process.env.ECOM_AUTH_DB)
const logger = require('console-files')
const rq = require('request')
//
//
const regiterNotificationsToStores = () => {
  let query = 'SELECT store_id FROM wirecard_app_auth WHERE setted_up = ?'
  let i = 0
  let path = (process.env.WC_SANDBOX) ? 'https://sandbox.moip.com.br' : 'https://api.moip.com.br'

  db.each(query, [0], (err, row) => {
    logger.log('--> Wirecard Webhooks Register')
    i++
    setTimeout(async () => {
      if (!err) {
        if (row) {
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
              logger.error('[WIRECARD WEBHOOK REGISTER - API REQUEST] ', resp.body)
            } else {
              let query = 'UPDATE wirecard_app_auth SET setted_up = ? WHERE store_id = ?'
              db.run(query, [1, row.store_id], erro => {
                if (err) {
                  logger.error('[WIRECARD WEBHOOK REGISTER - UPDATE DATABASE] ', erro)
                }
              })
            }
          })
        }
      }
    }, 1000 * i)
  })
}

regiterNotificationsToStores()
setInterval(regiterNotificationsToStores, 24 * 60 * 60 * 1000)
