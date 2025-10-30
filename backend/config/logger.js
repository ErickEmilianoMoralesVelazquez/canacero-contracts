// ============================================
// CONFIGURACIÓN DE LOGGING - WINSTON
// ============================================

const winston = require('winston');
const path = require('path');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Configuración de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'conocero-backend' },
  transports: [
    // Archivo para todos los logs
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Archivo solo para errores
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Archivo para blockchain operations
    new winston.transports.File({
      filename: path.join(logDir, 'blockchain.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.label({ label: 'blockchain' })
      )
    })
  ]
});

// En desarrollo, también mostrar en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Función para logging específico de blockchain
logger.blockchain = (message, data = {}) => {
  logger.info(message, { ...data, category: 'blockchain' });
};

// Función para logging de transacciones
logger.transaction = (message, txData = {}) => {
  logger.info(message, { 
    ...txData, 
    category: 'transaction',
    timestamp: new Date().toISOString()
  });
};

// Función para logging de errores de usuario
logger.userError = (message, userData = {}) => {
  logger.warn(message, { 
    ...userData, 
    category: 'user_error',
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;