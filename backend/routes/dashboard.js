// ============================================
// RUTAS DE DASHBOARD
// ============================================

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarToken, verificarTipoUsuario, logActivity } = require('../middleware/auth');

// ============================================
// MIDDLEWARE COMÚN
// ============================================

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(logActivity);

// ============================================
// RUTAS DE DASHBOARD
// ============================================

/**
 * @route   GET /api/dashboard/general
 * @desc    Obtener métricas generales del sistema
 * @access  Private (Solo Administradores)
 */
router.get('/general', 
  verificarTipoUsuario(['admin']), 
  dashboardController.obtenerDashboardGeneral
);

/**
 * @route   GET /api/dashboard/usuario
 * @desc    Obtener dashboard personalizado según tipo de usuario
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/usuario', dashboardController.obtenerDashboardUsuario);

module.exports = router;