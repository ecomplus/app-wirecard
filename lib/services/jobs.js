'use strict'
const sqlite = require('sqlite3')

const createDatabase = () => {
  const db = new sqlite.Database(process.env.ECOM_AUTH_DB, err => {
    if (err) {
      console.log(err)
    } else {
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
}

createDatabase()

const sql = require('./sql')

const wirecardTokenUpdate = () => {
  let query = 'SELECT authentication_id, store_id FROM wirecard_app_auth WHERE updated_at < datetime("now", "-1 month")'
  let i = 0
  sql.each(query, (err, row) => {
    i++
    setTimeout(async () => {
      if (!err) {
        try {
          //
          let options = {
            url: endpoints.generateTokenUrl,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': config.WC_ACCESS_TOKEN
            },
            form: qs.stringify({
              grant_type: 'refresh_token',
              refresh_token: row.w_refresh_token
            })
          }
          //
          rq.post(options, async (erro, resp, body) => {
            if (resp.statusCode >= 400) {
              logger.error('Erro com a solicitação ao Wirecard.' + resp.body)
              return
            }
            body = JSON.parse(body)
            let params = {
              store_id: row.store_id,
              w_access_token: body.access_token,
              w_refresh_token: body.refresh_token,
              w_expires_in: body.expires_in,
              w_scope: body.scope,
              w_account_id: body.moipAccount.id
            }

            sql.update(params, { store_id: row.store_id }, 'wirecard_app_auth')
              .catch(e => {
                logger.error('Atualização da autenticação no banco falhou -> ' + e)
              })
          })
        } catch (error) {
          logger.log(new Error('Erro with auth request.', error))
        }
      }
    }, 1000 * i)
  })
}

/**
 * Jobs
 */
// wirecard tokens
setInterval(wirecardTokenUpdate, 24 * 60 * 60 * 1000)
