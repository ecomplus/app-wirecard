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
      `CREATE TABLE IF NOT EXISTS wirecard_transactions (
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

  db.run('DROP TABLE IF EXISTS wirecard_webhooks')
})

// abstracting DB statements with promise
const dbRunPromise = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, (err, row) => {
    if (err) {
      logger.error(err)
      reject(err)
    } else {
      // query executed with success
      resolve()
    }
  })
})

module.exports = {
  authentications: {
    save: (storeId, accessToken, refreshToken, expiresIn, scope, accountId) => {
      const sql = 'INSERT INTO wirecard_app_auth (store_id, w_access_token, w_refresh_token, w_expires_in, w_scope, w_account_id) VALUES(?,?,?,?,?,?)'
      return dbRunPromise(sql, [storeId, accessToken, refreshToken, expiresIn, scope, accountId])
    },
    remove: (storeId) => {
      const sql = 'DELETE FROM wirecard_app_auth WHERE store_id = ?'
      return dbRunPromise(sql, [storeId])
    },
    get: (storeId) => {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM wirecard_app_auth WHERE store_id = ? ORDER BY id DESC LIMIT 1'
        db.get(sql, storeId, (err, row) => {
          if (err) {
            logger.error(err)
            reject(err)
          } else if (row) {
            // found with success
            // resolve the promise returning respective store and order IDs
            resolve(row)
          } else {
            let err = new Error('Wirecard authentication not found for store_id')
            err.name = 'WirecardAuthNotFound'
            reject(err)
          }
        })
      })
    }
  },
  transactions: {
    save: (transactionId, status) => {
      const sql = 'INSERT INTO wirecard_transactions (transaction_id, current_status) VALUES(?,?)'
      return dbRunPromise(sql, [transactionId, status])
    },
    get: (transactionId) => {
      return new Promise((resolve, reject) => {
        const sql = 'SELECT * FROM wirecard_transactions WHERE transaction_id = ?'
        db.get(sql, transactionId, (err, row) => {
          if (err) {
            logger.error(err)
            reject(err)
          } else if (row) {
            // found with success
            // resolve the promise returning respective store and order IDs
            resolve(row)
          } else {
            const err = new Error('Transaction not found')
            err.name = 'TransactionCodeNotFound'
            reject(err)
          }
        })
      })
    },
    remove: (transactionId) => {
      const sql = 'DELETE FROM wirecard_transactions WHERE transaction_id = ?'
      return dbRunPromise(sql, [transactionId])
    },
    update: (transactionId, status) => {
      const sql = 'UPDATE wirecard_transactions SET current_status = ? WHERE transaction_id = ?'
      return dbRunPromise(sql, [transactionId, status])
    }
  },
  db
}
