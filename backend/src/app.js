const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const { rateLimit } = require('express-rate-limit')
const pinoHttp = require('pino-http')
const swaggerUi = require('swagger-ui-express')

const { openapiDocument, openapiYaml } = require('./config/openapi')
const logger = require('./config/logger')
const requestId = require('./middleware/requestId')
const auditLogger = require('./middleware/auditLogger')
const healthRoutes = require('./routes/health.routes')
const authRoutes = require('./routes/auth.routes')
const profileRoutes = require('./routes/profile.routes')
const addressesRoutes = require('./routes/addresses.routes')
const cartRoutes = require('./routes/cart.routes')
const productsRoutes = require('./routes/products.routes')
const categoriesRoutes = require('./routes/categories.routes')
const ordersRoutes = require('./routes/orders.routes')
const adminRoutes = require('./routes/admin.routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

const isProduction = process.env.NODE_ENV === 'production'
app.set('trust proxy', isProduction ? 1 : false)
app.use(requestId)
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.requestId,
  customProps: (req) => ({
    requestId: req.requestId,
  }),
  customSuccessObject: (req, res, value) => ({
    ...value,
    requestId: req.requestId,
    userId: req.user && (req.user.id || req.user.sub),
    route: req.route && req.route.path,
  }),
  customErrorObject: (req, res, error, value) => ({
    ...value,
    requestId: req.requestId,
    userId: req.user && (req.user.id || req.user.sub),
    route: req.route && req.route.path,
    err: error,
  }),
}))

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: isProduction
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
app.use(cors())
app.use(compression({
  filter: () => true,
}))
app.use(express.json())
app.use(auditLogger)

const rateLimitResponse = (req, res) => res.status(429).json({
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Trop de requêtes',
  },
})

const createLimiter = (limit) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitResponse,
})

const globalLimiter = createLimiter(100)
const authLimiter = createLimiter(10)
const ordersLimiter = createLimiter(30)
const adminLimiter = createLimiter(50)

app.use(globalLimiter)

app.use('/', healthRoutes)
app.get('/docs/openapi.yaml', (req, res) => {
  res.type('application/yaml').send(openapiYaml)
})
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument, {
  customSiteTitle: 'VAPE MARKET API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
}))
app.use('/api/v1/auth', authLimiter, authRoutes)
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/addresses', addressesRoutes)
app.use('/api/v1/cart', cartRoutes)
app.use('/api/v1/products', productsRoutes)
app.use('/api/v1/categories', categoriesRoutes)
app.use('/api/v1/orders', ordersLimiter, ordersRoutes)
app.use('/api/v1/admin', adminLimiter, adminRoutes)

// Keep the pre-versioned paths available during the API v1 transition.
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/addresses', addressesRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/orders', ordersLimiter, ordersRoutes)
app.use('/api/admin', adminLimiter, adminRoutes)

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
    request_id: req.requestId,
  })
})

app.use(errorHandler)

module.exports = app
