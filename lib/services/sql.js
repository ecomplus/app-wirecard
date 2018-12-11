const config = require('../config')
const sqlite = require('sqlite3').verbose()
const logger = require('console-files')
const path = require('path')
const fs = require('fs')
const dbPath = path.resolve(__dirname, config.BD_PATH)

const db = new sqlite.Database(dbPath)

db.serialize(async () => {
  if (!fs.existsSync(dbPath)) {
    //
    logger.log("Can't find a SQLite database, creating one now...")
    console.log("Can't find a SQLite database, creating one now...")
    //
    db.run(`CREATE TABLE IF NOT EXISTS ecomplus_app_auth (
      id                        INTEGER  PRIMARY KEY AUTOINCREMENT,
      created_at                DATETIME DEFAULT (CURRENT_TIMESTAMP),
      application_id            STRING   NOT NULL,
      application_app_id        STRING   NOT NULL,
      authentication_id         STRING   NOT NULL,
      authentication_permission STRING   NOT NULL,
      store_id                  INTEGER  NOT NULL,
      app_token,
      application_title         STRING,
      updated_at                DATETIME DEFAULT (CURRENT_TIMESTAMP) 
    );`)
    //
    db.run(`CREATE TABLE IF NOT EXISTS wirecard_webhooks (
      id             INTEGER  PRIMARY KEY AUTOINCREMENT
                              NOT NULL,
      created_at     DATETIME NOT NULL
                              DEFAULT (CURRENT_TIMESTAMP),
      transaction_id INTEGER  NOT NULL,
      current_status STRING   NOT NULL,
      updated_at     DATETIME DEFAULT (CURRENT_TIMESTAMP) 
    );`)
    //
    db.run(`CREATE TABLE IF NOT EXISTS wirecard_app_auth (
      id              INTEGER  PRIMARY KEY AUTOINCREMENT
            NOT NULL,
      create_at       DATETIME NOT NULL
            DEFAULT (CURRENT_TIMESTAMP),
      store_id      INTEGER  UNIQUE
            NOT NULL,
      w_access_token  STRING   NOT NULL,
      w_refresh_token STRING   NOT NULL,
      w_expires_in    DATE,
      w_scope         STRING,
      w_account_id    INTEGER  NOT NULL,
      updated_at      DATETIME DEFAULT (CURRENT_TIMESTAMP) 
    );`)
  }
})

let insert = async (data, entity) => {
  return new Promise((resolve, reject) => {
    let keys = []
    let values = []
    let binds = []

    for (let key in data) {
      if (!data.hasOwnProperty(key)) continue
      keys.push(key)
      values.push(data[key])
      binds.push('?')
    }

    let query = 'INSERT INTO ' + entity + ' (' + keys.join(',') + ') VALUES (' + binds.join(',') + ')'
    db.run(query, values, (err) => {
      if (err) {
        reject(new Error(err.message))
      } else {
        resolve(this.changes)
      }
    })
  })
}

let select = async (data, entity) => {
  return new Promise((resolve, reject) => {
    let key, value
    for (const index in data) {
      if (data.hasOwnProperty(index)) {
        key = index
        value = data[index]
      }
    }

    let query = 'SELECT * FROM ' + entity + ' WHERE ' + key + ' = ?'

    db.get(query, value, (err, row) => {
      if (err) {
        reject(new Error(err.message))
      } else {
        resolve(row || false)
      }
    })
  })
}

let update = async (data, clause, entity) => {
  return new Promise((resolve, reject) => {
    let sets = []
    let where = []
    let values = []
    for (let key in data) {
      if (!data.hasOwnProperty(key)) continue
      sets.push(key + ' = ?')
      values.push(data[key])
    }
    for (let key in clause) {
      if (!clause.hasOwnProperty(key)) continue
      where.push(key + ' = ?')
      values.push(clause[key])
    }

    let query = 'UPDATE ' + entity + ' SET ' + sets.join(', ') + (where.length > 0 ? ' WHERE ' + where.join(' AND ') : '')

    db.run(query, values, function (err) {
      if (err) {
        reject(new Error(err.message))
      } else {
        resolve(this.changes)
      }
    })
  })
}

let create = async () => {
  let access = `CREATE TABLE IF NOT EXISTS access (
        id              INTEGER  PRIMARY KEY AUTOINCREMENT
                                NOT NULL,
        create_at       DATETIME NOT NULL
                                DEFAULT (CURRENT_TIMESTAMP),
        store_id      INTEGER  UNIQUE
                                NOT NULL,
        w_access_token  STRING   NOT NULL
                                UNIQUE,
        w_refresh_token STRING   NOT NULL,
        w_expires_in    DATE,
        w_scope         STRING,
        w_account_id    INTEGER  NOT NULL
  );`
  let auth = `CREATE TABLE IF NOT EXISTS auth (
        id                        INTEGER  PRIMARY KEY AUTOINCREMENT,
        created_at                DATETIME DEFAULT (CURRENT_TIMESTAMP),
        application_id            STRING   NOT NULL,
        application_app_id        STRING   NOT NULL,
        authentication_id         STRING   NOT NULL,
        authentication_permission STRING   NOT NULL,
        store_id                INTEGER  NOT NULL,
        app_token,
        application_title         STRING
  );`
  let wbs = `CREATE TABLE IF NOT EXISTS webhooks (
        id             INTEGER  PRIMARY KEY AUTOINCREMENT
                                NOT NULL,
        created_at     DATETIME NOT NULL
                                DEFAULT (CURRENT_TIMESTAMP),
        transaction_id INTEGER  NOT NULL,
        current_status STRING   NOT NULL
  );`
  db.run(access)
  db.run(auth)
  db.run(wbs)
}

module.exports = {
  insert,
  select,
  update
}
