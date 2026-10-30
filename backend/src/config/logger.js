const pino = require('pino')

const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: {
    service: 'vape-market-api',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'access_token',
      'refresh_token',
    ],
    censor: '[REDACTED]',
  },
})

module.exports = logger
