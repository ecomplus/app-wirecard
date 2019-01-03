// Transpile all code following this line with babel and use 'env' (aka ES6) preset.
require('babel-register')({
  presets: ['env']
})
require('babel-core/register')
require('babel-polyfill')
// process erro handle
require('./bin/uncaughtException')
// Import the rest of our application.
module.exports = require('./main')
