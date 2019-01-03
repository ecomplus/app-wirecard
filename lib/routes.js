'use strict'
import express from 'express'
import { payment } from './services/_wirecard'
import { ecomplus, wirecard, requestCallback } from './services/_callback'

const router = express.Router()

const webhooks = require('./services/webhooks')

router.route('/redirect')
  .get(requestCallback)

router.route('/callback')
  .get(wirecard)
  .post(ecomplus)

router.route('/payment')
  .post(payment)

router.route('/notifications/:storeid')
  .post(webhooks.notification)

export default router
