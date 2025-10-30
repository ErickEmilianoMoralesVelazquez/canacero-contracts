// ============================================
// RUTAS DE TOKENS
// ============================================

const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');
const { verificarToken, verificarTipoUsuario, logActivity } = require('../middleware/auth');

// ============================================
// MIDDLEWARE COMÚN
// ============================================

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(logActivity);

// ============================================
// RUTAS PÚBLICAS (AUTENTICADAS)
// ============================================

/**
 * @route   GET /api/token/disponibles
 * @desc    Obtener tokens disponibles para compra
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/disponibles', tokenController.obtenerTokensDisponibles);

/**
 * @route   GET /api/token/estadisticas
 * @desc    Obtener estadísticas de tokens
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/estadisticas', tokenController.obtenerEstadisticasTokens);

/**
 * @route   GET /api/token/:id
 * @desc    Obtener token por ID
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/:id', tokenController.obtenerTokenPorId);

/**
 * @route   GET /api/token/produccion/:produccion_id
 * @desc    Obtener tokens de una producción específica
 * @access  Private (Propietarios y relacionados)
 */
router.get('/produccion/:produccion_id', tokenController.obtenerTokensPorProduccion);

// ============================================
// RUTAS PARA EMPRESAS
// ============================================

/**
 * @route   POST /api/token/comprar
 * @desc    Comprar tokens
 * @access  Private (Solo Empresas)
 */
router.post('/comprar', 
  verificarTipoUsuario(['empresa']), 
  tokenController.comprarTokens
);

/**
 * @route   GET /api/token/mis-tokens
 * @desc    Obtener tokens comprados por la empresa
 * @access  Private (Solo Empresas)
 */
router.get('/mis-tokens', 
  verificarTipoUsuario(['empresa']), 
  tokenController.obtenerMisTokens
);

module.exports = router;