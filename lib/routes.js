'use strict'
const express = require('express')
const { payment } = require('./services/wirecard')
const { ecomplus, wirecard, requestCallback } = require('./services/callback')

const router = express.Router()

// const webhooks = require('./services/webhooks')

router.route('/redirect')
  .get(requestCallback)

router.route('/callback')
  .get(wirecard)
  .post(ecomplus)

router.route('/payment')
  .post(payment)

router.route('/notifications/:storeid')
  .post()

module.exports = router
