const auth = require('./authentication')
const sql = require('./../services/sql')

module.exports = {
  list: (request, response) => {
    if (!request.body || typeof request.body === 'undefined') {
      response.status(400)
      return response.send('Body empty')
    }
    sql.select({ x_store_id: request.headers['x-store-id'] }, (retorno) => {
      if (typeof retorno === 'undefined') {
        response.status(400)
        return response.send('Token not found for x-store-id.')
      }
      return response.send(parseToSchemaList(request.body, retorno.w_access_token))
    })
  }
}

let parseToSchemaList = (data, token) => {
  let items = []
  items = data.application.hidden_data.payment_options.map(method => {
    let item = {}
    if (!(item.icon = listSchema.item.icon(method))) {
      delete item.icon
    }
    if (!(item.installment_options = listSchema.item.installment_options(method, data))) {
      delete item.installment_options
    }
    if (!(item.intermediator = listSchema.item.intermediator(method))) {
      delete item.intermediator
    }
    if (method.type === 'credit_card') {
      if (!(item.js_client = listSchema.item.js_client(token))) {
        delete item.js_client
      }
    }
    if (!(item.label = listSchema.item.label(method))) {
      delete item.label
    }
    if (!(item.payment_method = listSchema.item.payment_method(method))) {
      delete item.payment_method
    }
    if (!(item.payment_url = listSchema.item.payment_url(method))) {
      delete item.payment_url
    }
    if (!(item.type = listSchema.item.type(method))) {
      delete item.type
    }
    return item
  })
  return { payment_gateways: items }
}

let listSchema = {
  item: {
    icon: (payment) => {
      if (payment.icon) {
        return payment.icon
      }
      return false
    },
    installment_options: (payment, data) => {
      if (payment.installments) {
        let items = payment.installments.map(installment => {
          let number = installment.number
          let value = (data.params.amount.total / number)
          if (installment.tax === true) {
            value = (value * installment.tax_value) + value
          }
          return {
            number: installment.number,
            tax: installment.tax || false,
            value: value
          }
        })
        return items
      }
      return false
    },
    intermediator: (payment) => {
      if (payment.intermediator) {
        return {
          code: payment.intermediator.code,
          link: payment.intermediator.link,
          name: payment.intermediator.name
        }
      }
    },
    js_client: async (token) => {
      try {
        let pubk = await auth.getPublicKey(token)
        pubk = JSON.parse(pubk)
        let onloadFunction = "(function(){var pubKey=" + pubk.keys.encryption + ";window.wirecardHash=function(obj){if(!MoipValidator.isValidNumber(obj.number)){return new Promise(function(resolve,reject){reject(new Error('Card number invalid.'))})} if(!MoipValidator.isSecurityCodeValid(obj.number,obj.cvc)){return new Promise(function(resolve,reject){reject(new Error('Card cvc invalid.'))})} if(!MoipValidator.isExpiryDateValid(obj.expirationMonth,obj.expirationYear)){return new Promise(function(resolve,reject){reject(new Erro('Card expiration invalid.'))})} return MoipSdkJs.MoipCreditCard.setPubKey(pubKey).setCreditCard({number:obj.number,cvc:obj.cvc,expirationMonth:obj.expirationYear,expirationYear:obj.expirationYear}).hash().then(function(hash){console.log('hash',hash)})} window.wirecardBrand=function(obj){return MoipValidator.cardType(obj.number)}}())"
        let schema = {
          cc_brand: {
            function: 'window.wirecardBrand',
            is_promisse: false
          },
          cc_hash: {
            function: 'window.wirecardHash',
            is_promisse: true
          },
          fallback_script_uri: 'https://wirecard.ecomplus.biz/assets/moip-sdk-js.js',
          onload_expression: onloadFunction,
          script_uri: 'https://raw.githubusercontent.com/wirecardBrasil/moip-sdk-js/master/dist/moip-sdk-js.js'
        }
        console.log(schema)
        return schema
      } catch (error) {
        console.log(error)
        return false
      }
    },
    label: (payment) => {
      if (payment.name) {
        return payment.name
      }
      return false
    },
    payment_method: (payment) => {
      if (payment.type) {
        return {
          code: payment.type,
          name: payment.name
        }
      }
    },
    payment_url: (payment) => {
      if (payment.url) {
        return payment.url
      }
      return false
    },
    type: (payment) => {
      return payment.payment_type || 'payment'
    }
  }
}
