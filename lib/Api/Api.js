const logger = require('console-files')
const sqlite = require('sqlite3').verbose()
// create necessary tables
const dbFilename = process.env.ECOM_AUTH_DB || './db.sqlite'
const db = new sqlite.Database(dbFilename, err => {
  const error = err => {
    // debug and destroy Node process
    logger.error(err)
    process.exit(1)
  }

  if (err) {
    error(err)
  } else {
    // try to run first query creating table
    db.run(
      `CREATE TABLE IF NOT EXISTS wirecard_app_auth (
        id              INTEGER  PRIMARY KEY AUTOINCREMENT
                                 NOT NULL,
        create_at       DATETIME NOT NULL
                                 DEFAULT (CURRENT_TIMESTAMP),
        store_id        INTEGER  NOT NULL,
        w_access_token  STRING   NOT NULL,
        w_refresh_token STRING   NOT NULL,
        w_expires_in    DATE,
        w_scope         STRING,
        w_account_id    INTEGER  NOT NULL,
        updated_at      DATETIME DEFAULT (CURRENT_TIMESTAMP),
        setted_up       INTEGER  DEFAULT (0) 
    );
    `, err => {
        if (err) {
          error(err)
        }
      })
    //
    db.run(
      `CREATE TABLE IF NOT EXISTS wirecard_webhooks (
        id             INTEGER  PRIMARY KEY AUTOINCREMENT
                                NOT NULL,
        created_at     DATETIME NOT NULL
                                DEFAULT (CURRENT_TIMESTAMP),
        transaction_id INTEGER  NOT NULL,
        current_status STRING   NOT NULL,
        updated_at     DATETIME DEFAULT (CURRENT_TIMESTAMP) 
    );    
    `, err => {
        if (err) {
          error(err)
        }
      })
  }
})

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
  internalApi: promise,
  addWirecardAuth: require('./AddAuth')(db),
  getWirecardAuth: require('./GetAuth')(db),
  updateWirecardAuth: require('./UpdateAuth')(db),
  getNotification: require('./GetNotification')(db),
  addNotification: require('./AddNotifications')(db),
  updateNotification: require('./UpdateNotification')(db)
}
