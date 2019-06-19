'use strict'
module.exports = (db) => {
  return (storeId, accessToken, refreshToken, expiresIn, scope, accountId) => {
    return new Promise((resolve, reject) => {
      let query = `INSERT INTO wirecard_app_auth 
      (store_id, w_access_token, w_refresh_token, w_expires_in, w_scope, w_account_id) 
      VALUES(?,?,?,?,?,?)`
      db.run(query, [storeId, accessToken, refreshToken, expiresIn, scope, accountId], (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }
}
