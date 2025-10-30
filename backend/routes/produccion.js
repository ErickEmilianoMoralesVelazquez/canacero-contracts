// ============================================
// RUTAS DE PRODUCCIÓN
// ============================================

const express = require('express');
const router = express.Router();
const produccionController = require('../controllers/produccionController');
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
 * @route   GET /api/produccion
 * @desc    Obtener producciones (filtradas por tipo de usuario)
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/', produccionController.obtenerProducciones);

/**
 * @route   GET /api/produccion/estadisticas
 * @desc    Obtener estadísticas de producción
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/estadisticas', produccionController.obtenerEstadisticas);

/**
 * @route   GET /api/produccion/:id
 * @desc    Obtener producción por ID
 * @access  Private (Propietarios y relacionados)
 */
router.get('/:id', produccionController.obtenerProduccionPorId);

// ============================================
// RUTAS PARA INGENIOS
// ============================================

/**
 * @route   POST /api/produccion
 * @desc    Registrar nueva producción
 * @access  Private (Solo Ingenios)
 */
router.post('/', 
  verificarTipoUsuario(['ingenio']), 
  produccionController.registrarProduccion
);

/**
 * @route   PUT /api/produccion/:id/validar
 * @desc    Validar producción
 * @access  Private (Solo Ingenios propietarios)
 */
router.put('/:id/validar', 
  verificarTipoUsuario(['ingenio']), 
  produccionController.validarProduccion
);

/**
 * @route   PUT /api/produccion/:id/rechazar
 * @desc    Rechazar producción
 * @access  Private (Solo Ingenios propietarios)
 */
router.put('/:id/rechazar', 
  verificarTipoUsuario(['ingenio']), 
  produccionController.rechazarProduccion
);

module.exports = router;