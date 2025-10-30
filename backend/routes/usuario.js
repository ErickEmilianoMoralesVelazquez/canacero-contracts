// ============================================
// RUTAS DE USUARIOS
// ============================================

const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verificarToken, verificarTipoUsuario, logActivity } = require('../middleware/auth');

// ============================================
// MIDDLEWARE COMÚN
// ============================================

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(logActivity);

// ============================================
// RUTAS DE PERFIL
// ============================================

/**
 * @route   GET /api/usuario/perfil
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/perfil', usuarioController.obtenerPerfil);

/**
 * @route   PUT /api/usuario/perfil
 * @desc    Actualizar perfil del usuario
 * @access  Private (Todos los usuarios autenticados)
 */
router.put('/perfil', usuarioController.actualizarPerfil);

/**
 * @route   PUT /api/usuario/cambiar-contrasena
 * @desc    Cambiar contraseña del usuario
 * @access  Private (Todos los usuarios autenticados)
 */
router.put('/cambiar-contrasena', usuarioController.cambiarContrasena);

// ============================================
// RUTAS DE ADMINISTRACIÓN
// ============================================

/**
 * @route   GET /api/usuario
 * @desc    Obtener lista de usuarios
 * @access  Private (Solo Administradores)
 */
router.get('/', 
  verificarTipoUsuario(['admin']), 
  usuarioController.obtenerUsuarios
);

/**
 * @route   PUT /api/usuario/:id/activar
 * @desc    Activar/Desactivar usuario
 * @access  Private (Solo Administradores)
 */
router.put('/:id/activar', 
  verificarTipoUsuario(['admin']), 
  usuarioController.toggleActivarUsuario
);

/**
 * @route   PUT /api/usuario/:id/verificar-email
 * @desc    Verificar email de usuario
 * @access  Private (Solo Administradores)
 */
router.put('/:id/verificar-email', 
  verificarTipoUsuario(['admin']), 
  usuarioController.verificarEmail
);

/**
 * @route   GET /api/usuario/estadisticas
 * @desc    Obtener estadísticas de usuarios
 * @access  Private (Solo Administradores)
 */
router.get('/estadisticas', 
  verificarTipoUsuario(['admin']), 
  usuarioController.obtenerEstadisticasUsuarios
);

module.exports = router;