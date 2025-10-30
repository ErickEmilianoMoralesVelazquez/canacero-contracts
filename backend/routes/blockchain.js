// ============================================
// RUTAS DE BLOCKCHAIN
// ============================================

const express = require('express');
const router = express.Router();
const blockchainController = require('../controllers/blockchainController');
const { verificarToken, verificarTipoUsuario, logActivity } = require('../middleware/auth');

// ============================================
// MIDDLEWARE COMÚN
// ============================================

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(logActivity);

// ============================================
// RUTAS DE CONSULTA
// ============================================

/**
 * @route   GET /api/blockchain/balance
 * @desc    Consultar balance de wallet
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/balance', blockchainController.consultarBalance);

/**
 * @route   GET /api/blockchain/transacciones
 * @desc    Obtener historial de transacciones blockchain
 * @access  Private (Todos los usuarios autenticados)
 */
router.get('/transacciones', blockchainController.obtenerHistorialTransacciones);

// ============================================
// RUTAS DE OPERACIONES
// ============================================

/**
 * @route   POST /api/blockchain/mintear
 * @desc    Mintear tokens desde producción validada
 * @access  Private (Solo Ingenios y Admins)
 */
router.post('/mintear', 
  verificarTipoUsuario(['ingenio', 'admin']), 
  blockchainController.mintearTokens
);

/**
 * @route   POST /api/blockchain/transferir
 * @desc    Transferir tokens entre wallets
 * @access  Private (Solo Empresas y Admins)
 */
router.post('/transferir', 
  verificarTipoUsuario(['empresa', 'admin']), 
  blockchainController.transferirTokens
);

module.exports = router;