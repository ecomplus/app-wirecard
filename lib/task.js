const sqlite = require('sqlite3').verbose()
const path = require('path')
const dbPath = path.resolve(__dirname, './db/wirecard')
const db = new sqlite.Database(dbPath)
const table = 'auth'
const rq = require('request')

console.log('Tarefa: Atualizar token ECP ok')
const updateEcomTokens = () => {
  // refresh each access token every 8 hours
  let query = 'SELECT authentication_id, x_store_id FROM ' + table +
  ' WHERE updated_at < datetime("now", "-8 hours")'
  // run query and get row object
  db.each(query, (err, row) => {
    if (!err) {
      // start app authentication flux
      // refreshToken(row.store_id, row.authentication_id)
    }
  })
}

const refreshToken = (storeId, authenticationId) => {
  return rq.post({
    method: 'POST',
    uri: 'https://api.e-com.plus/v1/_callback.json',
    headers: {
      'Content-Type': 'application/json',
      'X-Store-ID': storeId
    },
    body: { '_id': authenticationId },
    json: true
  })
}
updateEcomTokens()
//
//setInterval(updateEcomTokens, 60 * 60 * 1000)