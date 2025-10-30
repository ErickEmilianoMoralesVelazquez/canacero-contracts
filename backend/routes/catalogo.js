const express = require('express');
const router = express.Router();
const catalogoController = require('../controllers/catalogoController');
const authMiddleware = require('../middleware/auth');

/**
 * @route GET /api/catalogo
 * @desc Obtener catálogo de tokens disponibles para compra
 * @access Public (las empresas pueden ver el catálogo sin autenticación)
 */
router.get('/', catalogoController.obtenerCatalogo);

/**
 * @route POST /api/catalogo/calcular-compensacion
 * @desc Calcular cuántos tokens necesita una empresa para compensar su CO2
 * @access Public
 */
router.post('/calcular-compensacion', catalogoController.calcularCompensacion);

/**
 * @route POST /api/catalogo/comprar
 * @desc Comprar tokens para compensar CO2 (solo empresas autenticadas)
 * @access Private (empresas)
 */
router.post('/comprar', authMiddleware, catalogoController.comprarTokens);

/**
 * @route GET /api/catalogo/historial
 * @desc Obtener historial de compras de la empresa
 * @access Private (empresas)
 */
router.get('/historial', authMiddleware, catalogoController.obtenerHistorialCompras);

module.exports = router;