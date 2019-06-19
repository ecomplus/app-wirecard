'use strict'
module.exports = (db) => {
  return (transactionId, currentStatus) => {
    return new Promise((resolve, reject) => {
      let query = `INSERT INTO wirecard_webhooks 
      (transaction_id, current_status) 
      VALUES(?,?)`
      db.run(query, [transactionId, currentStatus], (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }
}
