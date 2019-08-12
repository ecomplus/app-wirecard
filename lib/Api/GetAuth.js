'use strict'
const logger = require('console-files')
module.exports = (db) => {
  return (storeId) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM wirecard_app_auth WHERE store_id = ? ORDER BY id DESC LIMIT 1`
      db.get(query, storeId, (err, row) => {
        if (err) {
          logger.error(err)
          reject(err)
        } else if (row) {
          // found with success
          // resolve the promise returning respective store and order IDs
          resolve(row)
        } else {
          let err = new Error('Wirecard authentication not found for store_id')
          reject(err)
        }
      })
    })
  }
}
