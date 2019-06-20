'use strict'
module.exports = (db) => {
  return (storeId, accessToken, refreshToken, expiresIn, scope, accountId) => {
    return new Promise((resolve, reject) => {
      let query = 'UPDATE wirecard_app_auth SET w_access_token = ?, w_refresh_token = ?, w_expires_in = ?, w_scope = ?, w_account_id = ? WHERE transaction_id = ?'
      db.run(query, [accessToken, refreshToken, expiresIn, scope, accountId, storeId], (err) => {
        if (err) {
          reject(err)
        }
        resolve()
      })
    })
  }
}
