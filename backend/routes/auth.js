// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken, logActividad } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 */
router.post('/register', 
  logActividad('registro_usuario'),
  authController.registrarUsuario
);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', 
  logActividad('login_usuario'),
  authController.loginUsuario
);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token y obtener datos del usuario
 * @access  Private
 */
router.get('/verify', 
  verificarToken,
  logActividad('verificacion_token'),
  authController.verificarToken
);

/**
 * @route   PUT /api/auth/password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.put('/password', 
  verificarToken,
  logActividad('cambio_password'),
  authController.cambiarPassword
);

/**
 * @route   PUT /api/auth/wallet
 * @desc    Actualizar dirección de wallet
 * @access  Private
 */
router.put('/wallet', 
  verificarToken,
  logActividad('actualizacion_wallet'),
  authController.actualizarWallet
);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', 
  verificarToken,
  logActividad('logout_usuario'),
  authController.logout
);

module.exports = router;