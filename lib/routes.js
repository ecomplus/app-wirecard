// const config = require('./config')
// const rq = require('request')
const moip = require('./wirecard')

let routes = {
  oauth: (request, response) => {
    return response.redirect(301, moip.auth.getAuthorizeUrl())
  },
  setToken: (request, response) => {
    moip.auth.getToken(request, response)
  }
}

module.exports = routes
