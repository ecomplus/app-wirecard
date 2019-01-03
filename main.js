
'use strict'
import bodyParser from 'body-parser'
import express from 'express'
import router from './lib/routes'

const app = express()
const port = process.env.PORT || 9090

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(router)
app.listen(port)
