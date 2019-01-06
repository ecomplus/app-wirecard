'use strict'
const express = require('express')
const { payment } = require('./services/wirecard')
const { ecomplus, wirecard, requestCallback } = require('./services/callback')
const { handle } = require('./services/webhooks')

const router = express.Router()

router.route('/redirect')
  .get(requestCallback)

router.route('/callback')
  .get(wirecard)
  .post(ecomplus)

router.route('/payment')
  .post(payment)

router.route('/notifications/:storeid')
  .post(handle)

module.exports = router
