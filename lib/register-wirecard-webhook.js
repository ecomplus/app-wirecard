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
  logger.log('--> Setup wirecard for stores')

  const task = () => {
    let sql = 'SELECT store_id, w_access_token FROM wirecard_app_auth WHERE setted_up = ?'

    db.each(sql, [0], (err, row) => {
      if (err) {
        logger.error('Wirecard setup store', err)
      } else {
        const storeId = row.store_id
        authentications.get(storeId)

          .then(({ wirecardAuth }) => {
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
