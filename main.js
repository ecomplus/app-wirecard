
'use strict'
const bodyParser = require('body-parser')
const express = require('express')
const router = require('./lib/routes')

const app = express()
const port = process.env.PORT || 9090

require('./bin/uncaughtException')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(router)
app.listen(port)

//
require('./lib/services/jobs')
