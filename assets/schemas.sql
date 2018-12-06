CREATE TABLE
IF NOT EXISTS ecomplus_app_auth
(
      id                        INTEGER  PRIMARY KEY AUTOINCREMENT,
      created_at                DATETIME DEFAULT
(CURRENT_TIMESTAMP),
      application_id            STRING   NOT NULL,
      application_app_id        STRING   NOT NULL,
      authentication_id         STRING   NOT NULL,
      authentication_permission STRING   NOT NULL,
      store_id                  INTEGER  NOT NULL,
      app_token,
      application_title         STRING,
      updated_at                DATETIME DEFAULT
(CURRENT_TIMESTAMP) 
    );

CREATE TABLE
IF NOT EXISTS wirecard_webhooks
(
      id             INTEGER  PRIMARY KEY AUTOINCREMENT
                              NOT NULL,
      created_at     DATETIME NOT NULL
                              DEFAULT
(CURRENT_TIMESTAMP),
      transaction_id INTEGER  NOT NULL,
      current_status STRING   NOT NULL,
      updated_at     DATETIME DEFAULT
(CURRENT_TIMESTAMP) 
    );

CREATE TABLE
IF NOT EXISTS wirecard_app_auth
(
      id              INTEGER  PRIMARY KEY AUTOINCREMENT
                               NOT NULL,
      create_at       DATETIME NOT NULL
                               DEFAULT
(CURRENT_TIMESTAMP),
      store_id      INTEGER  UNIQUE
                               NOT NULL,
      w_access_token  STRING   NOT NULL
                               UNIQUE,
      w_refresh_token STRING   NOT NULL,
      w_expires_in    DATE,
      w_scope         STRING,
      w_account_id    INTEGER  NOT NULL,
      updated_at      DATETIME DEFAULT
(CURRENT_TIMESTAMP) 
    );