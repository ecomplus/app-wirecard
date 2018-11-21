const Auth = require('./wirecard/authentication')

let authentication = new Auth()

//
setInterval(authentication.updateRefreshToken, 60 * 60 * 1000)
authentication.updateRefreshToken()
