'use strict'
const router = require('express').Router()
const wirecard = require('./services/wirecard')
const authentication = require('./services/authentication')
const webhooks = require('./services/webhooks')

router.route('/redirect')
  .get(authentication.getAuthorizeUrl)

router.route('/callback')
  .get(authentication.setWirecardToken)
  .post(authentication.setAppAuth)

router.route('/payments/list')
  .post(wirecard.listPayments)

router.route('/payments/create')
  .post(wirecard.requestPayment)

router.route('/notifications/:storeid')
  .post(webhooks.notification)

module.exports = router
