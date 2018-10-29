const endpoints = require('./endpoints')
const config = require('../config')
const rq = require('request')

module.exports = {
  order: (request, response) => {
  }
}

let parseOrder = (order) => {
  return {
    ownId: order._id,
    amount: {
      currency: order.currency_id
    },
    items: parderOrderItems(order.items),
    customer: getMoipCustomerId(),
    receivers: getMoipReceivers()
  }
}

let parderOrderItems = (items) => {
  let products = []
  products = items.map(item => {
    return {
      product: item.name,
      quantity: item.quantity,
      price: item.price
    }
  })
  return products
}

let getMoipReceivers = () => {
  return [{
    type: SECONDARY,
    feePayor: false,
    moipAccount: {
      id: MPA - E3C8493A06AE
    },
    amount: {
      fixed: 5000
    }
  }]
}

let getMoipCustomerId = () => {
  return {
    id: '7AKU0VORZ2D4'
  }
}