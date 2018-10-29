const endpoints = require('./endpoints')
const rq = require('request')

module.exports = {
  list: (request, response) => {
    let body = request.body
    if (!request.body || typeof request.body === 'undefined') {
      response.status(400)
      return response.send('Body empty')
    }
    response.send(parseToSchemaList(body))
  }
}

let parseToSchemaList = (data) => {
  let items = []
  let retorno = {}
  items = data.application.hidden_data.payment_options.map(method => {
    let item = {}
    if (listSchema.item.icon(method)) {
      item.icon = listSchema.item.icon(method)
    }
    if (listSchema.item.installment_options(method, data)) {
      item.installment_options = listSchema.item.installment_options(method, data)
    }
    if (listSchema.item.intermediator(method)) {
      item.intermediator = listSchema.item.intermediator(method)
    }
    if (listSchema.item.label(method)) {
      item.label = listSchema.item.label(method)
    }
    if (listSchema.item.payment_method(method)) {
      item.payment_method = listSchema.item.payment_method(method)
    }
    if (listSchema.item.payment_url(method)) {
      item.payment_url = listSchema.item.payment_url(method)
    }
    if (listSchema.item.type(method)) {
      item.type = listSchema.item.type(method)
    }
    return item
  })
  retorno.payment_gateways = items
  return retorno
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
    // todo
    js_client: (payment) => {
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
