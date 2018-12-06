'use strict'
const rq = require('request')

let api = {
  // order+orderId -> order/orderId
  // subresource+subresourceId
  get: (app, resource, subresource = '') => {
    return requestApi('GET', resource + subresource, '', app)
  },
  post: (app, body, resource, subresource = '') => {
    return requestApi('POST', resource + subresource, body, app)
  },
  path: (app, body, resource, subresource = '') => {
    return requestApi('PATCH', resource + subresource, body, app)
  }
}

const requestApi = (method, url, body = '', app) => {
  let path = 'https://api.e-com.plus/v1/' + url
  let options = {
    method: method,
    uri: path,
    headers: {
      'Content-Type': 'application/json',
      'X-Store-Id': app.store_id,
      'X-Access-Token': app.app_token,
      'X-My-ID': app.authentication_id
    }
  }

  if (method !== 'GET') {
    options.body = body
    options.json = true
  }

  return new Promise((resolve, reject) => {
    rq(options, (e, response, body) => {
      if (response.statusCode >= 400) {
        console.log(response.body)
        reject(new Error('Failed E-com.plus API Request.'))
      }
      resolve(body)
    })
  })
}

module.exports = {
  api
}
