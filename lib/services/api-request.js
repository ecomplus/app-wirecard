'use strict'
const rq = require('request')
const config = require('../config')
/**
 * @description Wirecard API request
 */
module.exports.api = {
  /**
   * @description Busca recursos específicos na API da Wirecard
   * @param {string} resource
   * @param {object} app objeto com as configurações do app, access_token, etc..
   * @param {boolean} isSandbox
   * @returns {promise} promise como retorno da requisição.
   */
  get: (resource, app = null, isSandbox = false) => {
    return request('GET', resource, '', app, isSandbox)
  },
  /**
 * @description Busca recursos específicos na API da Wirecard.
 * @param {string} resource resoucer e onde será realizada a busca.
 * @param {object} app objeto com as configurações do app, access_token, etc..
 * @param {body} body body da requisição para criação ou alteração.
 * @param {boolean} isSandbox ambiente que será feito a requisição, defaul false.
 * @returns {promise} promise como retorno da requisição.
 */
  post: (resource, body, app = null, isSandbox = false) => {
    return request('POST', resource, body, app, isSandbox)
  }
}

const request = (method, resource, body = '', app = null, isSandbox = false) => {
  const apiPath = isSandbox ? 'https://sandbox.moip.com.br/v2/' : 'https://moip.com.br/v2/'

  return new Promise((resolve, reject) => {
    let options = {
      method: method,
      url: apiPath + resource,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'bearer ' + (app ? app.w_access_token : config.WC_ACCESS_TOKEN)
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
