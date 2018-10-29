// const endpoints = require('./endpoints')
// const rq = require('request')

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
