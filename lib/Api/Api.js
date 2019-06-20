const sqlite = require('sqlite3').verbose()
const db = new sqlite.Database(process.env.ECOM_AUTH_DB)
// create necessary tables

const promise = new Promise(resolve => {
  return resolve({
    addWirecardAuth: require('./AddAuth')(db),
    getWirecardAuth: require('./GetAuth')(db),
    updateWirecardAuth: require('./UpdateAuth')(db),
    getNotification: require('./GetNotification')(db),
    addNotification: require('./AddNotifications')(db),
    updateNotification: require('./UpdateNotification')(db)
  })
})

module.exports = {
  internalApi: promise
}
