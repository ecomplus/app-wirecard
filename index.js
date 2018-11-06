const bodyParser = require('body-parser')
const express = require('express')
const routes = require('./lib/routes')
const app = express()
const port = process.env.PORT || 3000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

process.on('uncaughtException', (err) => {
  // fatal error
  // log to file before exit
  let msg = '\n[' + new Date().toString() + ']\n'
  if (err) {
    if (err.hasOwnProperty('stack')) {
      msg += err.stack
    } else if (err.hasOwnProperty('message')) {
      msg += err.message
    } else {
      msg += err.toString()
    }
    msg += '\n'
  }

  let fs = require('fs')
  fs.appendFile('_stderr', msg, () => {
    process.exit(1)
  })
})

app.get('/redirect', routes.autentication.oauth)
app.get('/callback', routes.autentication.setToken)
app.post('/payments/list', routes.payments.list)
app.post('/payments/create', routes.payments.create)
app.post('/auth/callback', routes.autentication.app)
app.post('/wh/', routes.webhooks.post)
app.listen(port)
