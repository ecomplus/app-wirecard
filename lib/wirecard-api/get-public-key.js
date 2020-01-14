'use strict'
const axios = require('axios')
const wirecardApiPath = (process.env.WC_SANDBOX && process.env.WC_SANDBOX === 'true') ? 'https://sandbox.moip.com.br' : 'https://api.moip.com.br'

module.exports = (auth) => {
  return axios({
    url: `${wirecardApiPath}/v2/keys`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.w_access_token}`
    }
  }).then(resp => resp.data)
}
