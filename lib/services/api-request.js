'use strict'
import rq from 'request'
import config from '../config'

export const api = {
  get: (resource, app, isSandbox = false) => {
    return request('GET', resource, '', isSandbox)
  },
  post: (resource, body, isSandbox = false) => {
    return request('POST', resource, body, isSandbox)
  }
}

const request = (method, resource, body = '', isSandbox = false) => {
  const apiPath = isSandbox ? 'https://sandbox.moip.com.br/v2/' : 'https://moip.com.br/v2/'

  return new Promise((resolve, reject) => {
    let options = {
      method: method,
      url: apiPath + resource,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + config.WC_ACCESS_TOKEN
      }
    }
    if ((method !== 'GET' || method !== 'DELETE') && body !== '') {
      options.body = body
      options.json = true
    }
    rq(options, (erro, resp, body) => {
      if (resp.statusCode >= 400) {
        let erro = {
          status: resp.statusCode,
          code: 'wirecard_api_request',
          resource: resource,
          erro: resp.body
        }
        reject(new Error(JSON.stringify(erro)))
      }
      resolve(body)
    })
  })
}
