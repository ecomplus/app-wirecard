'use strict'
module.exports = (db) => {
  return (transactionId, currentStatus) => {
    return new Promise((resolve, reject) => {
      let query = 'UPDATE wirecard_webhooks SET current_status = ? WHERE transaction_id = ?'
      db.run(query, [currentStatus, transactionId], (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }
}
