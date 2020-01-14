'use strict'
const logger = require('console-files')

// db abstract
const { db, authentications } = require('./database')

// register webhook at wirecard-api
const registerWebhook = require('./wirecard-api/register-webhook')

// get account public_key
const myPublicKey = require('./wirecard-api/get-public-key')

// update application data
const updateApp = require('./store-api/patch-application')

module.exports = appSdk => {
  logger.log('--> Setup wirecard webhooks')

  const task = () => {
    let sql = 'SELECT store_id, w_access_token FROM wirecard_app_auth WHERE setted_up = ?'

    db.each(sql, [0], (err, row) => {
      if (err) {
        logger.error('Wirecard webhook setup err', err)
      } else {
        const storeId = row.store_id
        authentications.get(storeId)

          .then(wirecardAuth => {
            // register a new notification for application at wirecard
            let options = {
              accessToken: process.env.WC_ACCESS_TOKEN,
              production: (!(process.env.WC_SANDBOX && process.env.WC_SANDBOX === 'true'))
            }

            let body = {
              events: ['PAYMENT.*', 'PAYMENT.CREATED', 'PAYMENT.IN_ANALYSIS', 'PAYMENT.AUTHORIZED', 'PAYMENT.CANCELLED', 'PAYMENT.PRE_AUTHORIZED', 'PAYMENT.REFUNDED', 'PAYMENT.REVERSED', 'PAYMENT.STATUS_UPDATED', 'PAYMENT.WAITING', 'PAYMENT.SETTLED', 'PAYMENTV2.*', 'PAYMENTV2.CREATED', 'PAYMENTV2.WAITING', 'PAYMENTV2.IN_ANALYSIS', 'PAYMENTV2.AUTHORIZED', 'PAYMENTV2.CANCELLED', 'PAYMENTV2.REFUNDED', 'PAYMENTV2.REVERSED', 'PAYMENTV2.DUE_DATE', 'PAYMENTV2.SETTLED'],
              target: 'https://wirecard.ecomplus.biz/wirecard/notifications/' + storeId,
              media: 'WEBHOOK'
            }
            return registerWebhook(body, options).then(() => ({ wirecardAuth }))
          })

          .then(({ wirecardAuth }) => {
            logger.log(`[!] Wirecard setup webhook for store #${storeId}`)
            // get account public_key
            return myPublicKey(wirecardAuth)
          })

          .then(resp => {
            // save at application.hidden_data
            const body = {
              public_key: resp.keys.encryption
            }
            return updateApp(appSdk, storeId)(body, true)
          })

          .then(() => {
            logger.log(`[!] Public key setted up ate application.hidden_data for store #${storeId}`)
          })

          .then(() => {
            // update application settings
            const sql = 'UPDATE wirecard_app_auth SET setted_up = ? WHERE store_id = ?'
            db.run(sql, [1, storeId], err => {
              if (err) {
                const error = new Error('Update app settings err')
                error.name = 'APPLICATION_SETUP_ERR'
                Promise.reject(error)
              } else {
                Promise.resolve()
              }
            })
          })

          .then(() => {
            logger.log(`[!] Setup completed for store # ${storeId}`)
          })

          .catch(err => {
            logger.error('REGISTER_WIRECARD_WEBHOOK_ERR', err)
          })
      }
    })
  }

  // call the task every five minute
  let interval = 5000
  setInterval(task, interval)
}
