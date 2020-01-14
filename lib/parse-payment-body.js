'use strict'
const configDefault = require('./payment-default')

module.exports = body => {
  const { params, application } = body
  // application config
  const config = Object.assign({}, application.hidden_data, configDefault)

  // parse create transaction module request body to wirecard reference
  // https://apx-mods.e-com.plus/api/v1/create_transaction/schema.json?store_id=100
  const { amount, items, buyer, to } = params
  // preset default order currency
  let currency = body.currency_id
  if (!currency) {
    currency = (items.length && items[0].currency_id) || 'BRL'
  }

  // remove decimal separator from values
  // https://dev.wirecard.com.br/reference#criar-pedido-2
  const subtotals = {
    shipping: amount.freight ? Math.abs(amount.freight * 100).toFixed() : 0,
    addition: 0,
    discount: amount.discount ? Math.abs(amount.discount * 100).toFixed() : 0
  }

  // if the chosen payment method is credit_card
  // check for additional rule at application config
  if (params.payment_method && params.payment_method.code === 'credit_card') {
    const creditOption = config.payment_options.find(option => option.type === 'credit_card')
    if (creditOption && creditOption.installments && params.installments_number) {
      const installment = creditOption.installments.find(installment => installment.number === params.installments_number)
      if (installment && installment.tax && installment.tax === true) {
        const taxValue = installment.tax_value / 100
        subtotals.addition = Math.abs((amount.total * taxValue) * 100).toFixed()
      }
    }
  }

  // response body
  const wirecardPayment = {
    ownId: params.order_number,
    amount: {
      currency,
      subtotals
    },
    items: [],
    customer: {
      ownId: buyer.customer_id,
      fullname: buyer.fullname,
      email: buyer.email,
      birthDate: `${buyer.birth_date.year}-${buyer.birth_date.month}-${buyer.birth_date.day}`,
      taxDocument: {
        type: buyer.registry_type === 'p' ? 'CPF' : 'CNPJ',
        number: buyer.doc_number
      },
      phone: {
        countryCode: buyer.phone && buyer.phone.country_code ? buyer.phone.country_code : '55',
        areaCode: buyer.phone && buyer.phone.number ? buyer.phone.number.substr(0, 2) : '',
        number: buyer.phone.number
      },
      shippingAddress: {
        city: to.city,
        district: to.borough,
        street: to.street,
        streetNumber: to.number,
        zipCode: to.zip,
        state: to.province_code ? to.province_code : to.province,
        country: to.country_code || 'BRA'
      }
    }
  }

  // items
  items.forEach(item => {
    wirecardPayment.items.push({
      product: item.name,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      price: Math.abs(item.price * 100).toFixed()
    })
  })

  return wirecardPayment
}
