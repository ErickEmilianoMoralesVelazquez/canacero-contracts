// ============================================
// SERVIDOR PRINCIPAL - CONOCERO BACKEND
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Importar configuraciones
const db = require('./config/database');
const logger = require('./config/logger');

// Importar rutas
const authRoutes = require('./routes/auth');
const agricultorRoutes = require('./routes/agricultor');
const ingenioRoutes = require('./routes/ingenio');
const empresaRoutes = require('./routes/empresa');
const produccionRoutes = require('./routes/produccion');
const tokenRoutes = require('./routes/token');
const blockchainRoutes = require('./routes/blockchain');
const dashboardRoutes = require('./routes/dashboard');
const catalogoRoutes = require('./routes/catalogo');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  }
});

app.use(limiter);
app.use(helmet());
app.use(compression());

// CORS configurado para el frontend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tu-dominio.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================
// MIDDLEWARES GENERALES
// ============================================

app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RUTAS DE LA API
// ============================================

// Ruta de salud del servidor
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CoñoCero Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
});

// Rutas principales
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/agricultor`, agricultorRoutes);
app.use(`${API_PREFIX}/ingenio`, ingenioRoutes);
app.use(`${API_PREFIX}/empresa`, empresaRoutes);
app.use(`${API_PREFIX}/produccion`, produccionRoutes);
app.use(`${API_PREFIX}/token`, tokenRoutes);
app.use(`${API_PREFIX}/blockchain`, blockchainRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/catalogo`, catalogoRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`,
    availableRoutes: [
      `${API_PREFIX}/auth`,
      `${API_PREFIX}/agricultor`,
      `${API_PREFIX}/ingenio`,
      `${API_PREFIX}/empresa`,
      `${API_PREFIX}/produccion`,
      `${API_PREFIX}/token`,
      `${API_PREFIX}/blockchain`,
      `${API_PREFIX}/dashboard`
    ]
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  logger.error('Error no manejado:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// ============================================
// INICIALIZACIÓN DEL SERVIDOR
// ============================================

async function startServer() {
  try {
    // Verificar conexión a la base de datos
    await db.authenticate();
    logger.info('✅ Conexión a la base de datos establecida correctamente');

    // Sincronizar modelos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      await db.sync({ alter: true });
      logger.info('✅ Modelos de base de datos sincronizados');
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor CoñoCero iniciado en puerto ${PORT}`);
      logger.info(`📍 API disponible en: http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
      logger.info(`🔗 Red Stellar: ${process.env.STELLAR_NETWORK}`);
    });

  } catch (error) {
    logger.error('❌ Error iniciando el servidor:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  logger.info('🔄 Cerrando servidor...');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🔄 Cerrando servidor...');
  await db.close();
  process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;