'use strict'
const authentication = require('./authentication')
/**
 * Jobs
 */
// ecomplus tokens
setInterval(authentication.updateAppToken, 60 * 60 * 1000)
// wirecard tokens
setInterval(authentication.updateWirecardToken, 24 * 60 * 60 * 1000)
// wirecard payments status cron
