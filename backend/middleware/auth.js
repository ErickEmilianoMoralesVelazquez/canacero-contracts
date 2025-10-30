// ============================================
// MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const logger = require('../config/logger');

// ============================================
// VERIFICAR TOKEN JWT
// ============================================

const verificarToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.userId);
    
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido - Usuario no encontrado'
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada'
      });
    }

    // Agregar información del usuario al request
    req.userId = usuario.id;
    req.userEmail = usuario.email;
    req.userTipo = usuario.tipo_usuario;
    req.userWallet = usuario.wallet_address;

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    logger.error('Error en verificación de token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// VERIFICAR TIPO DE USUARIO
// ============================================

const verificarTipoUsuario = (tiposPermitidos) => {
  return (req, res, next) => {
    if (!req.userTipo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!tiposPermitidos.includes(req.userTipo)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// ============================================
// VERIFICAR WALLET CONECTADA
// ============================================

const verificarWallet = (req, res, next) => {
  if (!req.userWallet) {
    return res.status(400).json({
      success: false,
      message: 'Wallet no conectada. Por favor conecta tu wallet para continuar'
    });
  }

  next();
};

// ============================================
// MIDDLEWARE ESPECÍFICOS POR TIPO
// ============================================

const soloAgricultores = verificarTipoUsuario(['agricultor']);
const soloIngenios = verificarTipoUsuario(['ingenio']);
const soloEmpresas = verificarTipoUsuario(['empresa']);
const soloAdministradores = verificarTipoUsuario(['admin']);

// Combinaciones comunes
const agricultoresEIngenios = verificarTipoUsuario(['agricultor', 'ingenio']);
const empresasYAdmins = verificarTipoUsuario(['empresa', 'admin']);
const todosLosUsuarios = verificarTipoUsuario(['agricultor', 'ingenio', 'empresa', 'admin']);

// ============================================
// VERIFICAR PROPIEDAD DE RECURSO
// ============================================

const verificarPropietario = (modelo, campoId = 'id') => {
  return async (req, res, next) => {
    try {
      const recursoId = req.params[campoId];
      
      if (!recursoId) {
        return res.status(400).json({
          success: false,
          message: 'ID de recurso requerido'
        });
      }

      // Buscar el recurso
      const recurso = await modelo.findByPk(recursoId);
      
      if (!recurso) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      // Verificar propiedad según el tipo de usuario
      let esPropietario = false;

      switch (req.userTipo) {
        case 'agricultor':
          esPropietario = recurso.agricultor_id === req.userId || 
                         recurso.usuario_id === req.userId;
          break;
        case 'ingenio':
          esPropietario = recurso.ingenio_id === req.userId || 
                         recurso.usuario_id === req.userId;
          break;
        case 'empresa':
          esPropietario = recurso.empresa_id === req.userId || 
                         recurso.usuario_id === req.userId;
          break;
        case 'admin':
          esPropietario = true; // Los admins pueden acceder a todo
          break;
      }

      if (!esPropietario) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para acceder a este recurso'
        });
      }

      // Agregar el recurso al request para uso posterior
      req.recurso = recurso;
      next();

    } catch (error) {
      logger.error('Error verificando propiedad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  };
};

// ============================================
// RATE LIMITING POR USUARIO
// ============================================

const rateLimitPorUsuario = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.userId;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpiar requests antiguos
    if (requests.has(userId)) {
      const userRequests = requests.get(userId);
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(userId, validRequests);
    }

    // Obtener requests actuales del usuario
    const userRequests = requests.get(userId) || [];

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intenta de nuevo más tarde',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Agregar request actual
    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
};

// ============================================
// LOGGING DE ACTIVIDAD
// ============================================

const logActividad = (accion) => {
  return (req, res, next) => {
    // Log de la actividad del usuario
    logger.info(`Actividad: ${accion}`, {
      userId: req.userId,
      userEmail: req.userEmail,
      userTipo: req.userTipo,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();
  };
};

module.exports = {
  verificarToken,
  verificarTipoUsuario,
  verificarWallet,
  verificarPropietario,
  rateLimitPorUsuario,
  logActividad,
  
  // Middlewares específicos
  soloAgricultores,
  soloIngenios,
  soloEmpresas,
  soloAdministradores,
  agricultoresEIngenios,
  empresasYAdmins,
  todosLosUsuarios
};