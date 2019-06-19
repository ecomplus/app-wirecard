'use strict'
module.exports = (db) => {
  return (transactionId) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM wirecard_webhooks WHERE transaction_id = ?`
      db.get(query, [transactionId], (err, row) => {
        if (err) {
          reject(err)
        }
        resolve(row)
      })
    })
  }
}
