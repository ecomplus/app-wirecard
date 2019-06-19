#!/usr/bin/env node

'use strict'

// log to files
const logger = require('console-files')
// handle app authentication to Store API
// https://github.com/ecomclub/ecomplus-app-sdk
const { ecomAuth, ecomServerIps } = require('ecomplus-app-sdk')

// web server with Express
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const router = express.Router()
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use((req, res, next) => {
  if (req.url.startsWith('/ecom/') && process.env.NODE_ENV === 'production') {
    // check if request is comming from E-Com Plus servers
    if (ecomServerIps.indexOf(req.get('x-real-ip')) === -1) {
      res.status(403).send('Who are you? Unauthorized IP address')
    } else {
      // get E-Com Plus Store ID from request header
      req.storeId = parseInt(req.get('x-store-id'), 10)
      next()
    }
  } else {
    // bypass
    next()
  }
})

ecomAuth.then(appSdk => {
  // setup app routes
  const routes = './../routes'
  router.get('/', require(`${routes}/`)())

  // base routes for E-Com Plus Store API
  ;[
    '/ecom/auth-callback',
    '/ecom/webhook',
    '/ecom/modules/create-transaction',
    '/ecom/modules/list-payments'
  ].forEach(route => router.post(route, require(`${routes}${route}`)(appSdk)))

  /* Add custom app routes here */
  ;[
    '/wirecard/auth-callback',
    '/wirecard/request-auth'
  ].forEach(route => {
    router.get(route, require(`${routes}${route}`)(appSdk))
  })

  // wirecard notifications
  router.post('/wirecard/notifications/:storeId', require(`${routes}/wirecard/notifications`)(appSdk))

  // add router and start web server
  app.use(router)
  app.listen(port)
  logger.log(`--> Starting web app on port :${port}`)

  // checks if store was setup to receive wirecard webhooks
  require('./../lib/wirecard-register-notifications')
})

ecomAuth.catch(err => {
  logger.error(err)
  setTimeout(() => {
    // destroy Node process while Store API auth cannot be handled
    process.exit(1)
  }, 1100)
})
