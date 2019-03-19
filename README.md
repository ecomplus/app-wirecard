# app-wirecard

Environment variables

Env | Val
---------|--------
WC_TOKEN  | Wirecard app token
WC_CHAVE  | Wirecard app key
WC_SANDBOX  | Wirecard env [default false]
WC_ID  | Wirecard app id
WC_ACCESS_TOKEN  | Wirecard access token
WC_APP_SECRET  | Wirecard app secret
WC_REDIRECT_URI  | Callback url
WC_SCOPE | Wirecard oath scope
TABLE_NAME | app table name
BD_PATH | db path

## Production server

Published at https://wirecard.ecomplus.biz

### Continuous deployment

When app version is **production ready**,
[create a new release](https://github.com/ecomclub/app-wirecard/releases)
to run automatic deploy from `master` branch.
