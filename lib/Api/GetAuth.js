'use strict'
module.exports = (db) => {
  return (storeId) => {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM wirecard_app_auth WHERE store_id = ?`
      db.get(query, storeId, (err, row) => {
        if (err) {
          reject(err)
        }
        resolve(row)
      })
    })
  }
}
