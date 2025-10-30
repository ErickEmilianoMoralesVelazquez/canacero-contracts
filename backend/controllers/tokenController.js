// ============================================
// CONTROLADOR DE TOKENS
// ============================================

const { Token, Produccion, Agricultor, Ingenio, Usuario, Empresa, HuellaCarbon, Transaccion } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const sorobanService = require('../services/sorobanService');

// ============================================
// OBTENER TOKENS DISPONIBLES
// ============================================

const obtenerTokensDisponibles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      precio_min, 
      precio_max, 
      co2_min, 
      co2_max,
      temporada,
      region
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { estado: 'minteado' }; // Solo tokens disponibles para venta

    // Filtros de precio
    if (precio_min || precio_max) {
      where.precio_actual = {};
      if (precio_min) where.precio_actual[Op.gte] = parseFloat(precio_min);
      if (precio_max) where.precio_actual[Op.lte] = parseFloat(precio_max);
    }

    // Filtros de CO2
    if (co2_min || co2_max) {
      where.co2_equivalente = {};
      if (co2_min) where.co2_equivalente[Op.gte] = parseFloat(co2_min);
      if (co2_max) where.co2_equivalente[Op.lte] = parseFloat(co2_max);
    }

    const includeOptions = [
      {
        model: Produccion,
        as: 'produccion_origen',
        include: [
          { model: Agricultor, as: 'agricultor' },
          { model: Ingenio, as: 'ingenio_reportador' }
        ]
      }
    ];

    // Filtro por temporada
    if (temporada) {
      includeOptions[0].where = { temporada };
    }

    // Filtro por región (a través del agricultor)
    if (region) {
      includeOptions[0].include[0].where = { 
        [Op.or]: [
          { municipio: { [Op.iLike]: `%${region}%` } },
          { departamento: { [Op.iLike]: `%${region}%` } }
        ]
      };
    }

    const { count, rows: tokens } = await Token.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['fecha_generacion', 'DESC']],
      include: includeOptions
    });

    res.json({
      success: true,
      data: {
        tokens,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        },
        resumen: {
          total_tokens: count,
          co2_total: tokens.reduce((sum, token) => sum + token.co2_equivalente, 0),
          valor_total: tokens.reduce((sum, token) => sum + token.valor_total, 0)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo tokens disponibles:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// OBTENER TOKEN POR ID
// ============================================

const obtenerTokenPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await Token.findByPk(id, {
      include: [
        {
          model: Produccion,
          as: 'produccion_origen',
          include: [
            { model: Agricultor, as: 'agricultor' },
            { model: Ingenio, as: 'ingenio_reportador' }
          ]
        },
        {
          model: Transaccion,
          as: 'transacciones_relacionadas',
          where: { tipo_transaccion: 'compra_token' },
          required: false
        }
      ]
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token no encontrado'
      });
    }

    res.json({
      success: true,
      data: { token }
    });

  } catch (error) {
    logger.error('Error obteniendo token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// COMPRAR TOKENS
// ============================================

const comprarTokens = async (req, res) => {
  try {
    const { tokens_ids, metodo_pago, direccion_wallet } = req.body;

    if (!tokens_ids || !Array.isArray(tokens_ids) || tokens_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un token para comprar'
      });
    }

    // Verificar que el usuario es una empresa
    if (req.userTipo !== 'empresa') {
      return res.status(403).json({
        success: false,
        message: 'Solo las empresas pueden comprar tokens'
      });
    }

    // Obtener perfil de empresa
    const empresa = await Empresa.findOne({ where: { usuario_id: req.userId } });
    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de empresa no encontrado'
      });
    }

    // Verificar tokens disponibles
    const tokens = await Token.findAll({
      where: {
        id: { [Op.in]: tokens_ids },
        estado: 'minteado'
      },
      include: [
        {
          model: Produccion,
          as: 'produccion_origen',
          include: [
            { model: Agricultor, as: 'agricultor' },
            { model: Ingenio, as: 'ingenio_reportador' }
          ]
        }
      ]
    });

    if (tokens.length !== tokens_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos tokens no están disponibles para compra'
      });
    }

    // Calcular totales
    const totalCO2 = tokens.reduce((sum, token) => sum + token.co2_equivalente, 0);
    const totalValor = tokens.reduce((sum, token) => sum + token.valor_total, 0);

    // Verificar presupuesto de la empresa
    if (empresa.presupuesto_compensacion < totalValor) {
      return res.status(400).json({
        success: false,
        message: 'Presupuesto insuficiente para esta compra'
      });
    }

    // Calcular distribución de pagos usando Soroban
    const distribucionPagos = sorobanService.calcularDistribucionPagos(totalValor);

    // Crear transacción de compra
    const transaccion = await Transaccion.create({
      tipo_transaccion: 'compra_token',
      usuario_id: req.userId,
      empresa_id: empresa.id,
      estado: 'pendiente',
      monto_total: totalValor,
      moneda: 'COP',
      co2_equivalente: totalCO2,
      cantidad_tokens: tokens.length,
      metodo_pago,
      direccion_wallet,
      detalles_especificos: {
        tipo_operacion: 'purchase_tokens',
        tokens_comprados: tokens_ids,
        distribucion_pagos: distribucionPagos
      },
      metadata: {
        empresa_info: {
          razon_social: empresa.razon_social,
          nit: empresa.nit
        }
      }
    });

    // Marcar tokens como vendidos
    await Token.update(
      { 
        estado: 'vendido',
        'venta_info.empresa_id': empresa.id,
        'venta_info.transaccion_id': transaccion.id,
        'venta_info.fecha_venta': new Date(),
        'venta_info.precio_venta': totalValor
      },
      { where: { id: { [Op.in]: tokens_ids } } }
    );

    // Actualizar estadísticas de empresa
    await empresa.update({
      'estadisticas_compra.total_tokens_comprados': empresa.estadisticas_compra.total_tokens_comprados + tokens.length,
      'estadisticas_compra.co2_compensado': empresa.estadisticas_compra.co2_compensado + totalCO2,
      'estadisticas_compra.total_invertido': empresa.estadisticas_compra.total_invertido + totalValor,
      'estadisticas_compra.numero_transacciones': empresa.estadisticas_compra.numero_transacciones + 1
    });

    logger.info(`Compra de tokens realizada - Empresa: ${empresa.id}, Tokens: ${tokens_ids.length}, Valor: ${totalValor}`);

    res.status(201).json({
      success: true,
      message: 'Compra de tokens iniciada exitosamente',
      data: {
        transaccion_id: transaccion.id,
        tokens_comprados: tokens.length,
        co2_compensado: totalCO2,
        valor_total: totalValor,
        estado: 'pendiente_pago'
      }
    });

  } catch (error) {
    logger.error('Error comprando tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// OBTENER MIS TOKENS (EMPRESA)
// ============================================

const obtenerMisTokens = async (req, res) => {
  try {
    const { page = 1, limit = 20, estado } = req.query;

    if (req.userTipo !== 'empresa') {
      return res.status(403).json({
        success: false,
        message: 'Solo las empresas pueden ver sus tokens'
      });
    }

    const empresa = await Empresa.findOne({ where: { usuario_id: req.userId } });
    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: 'Perfil de empresa no encontrado'
      });
    }

    const offset = (page - 1) * limit;
    const where = { 'venta_info.empresa_id': empresa.id };

    if (estado) where.estado = estado;

    const { count, rows: tokens } = await Token.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['venta_info.fecha_venta', 'DESC']],
      include: [
        {
          model: Produccion,
          as: 'produccion_origen',
          include: [
            { model: Agricultor, as: 'agricultor' },
            { model: Ingenio, as: 'ingenio_reportador' }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        tokens,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo tokens de empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// OBTENER TOKENS POR PRODUCCIÓN
// ============================================

const obtenerTokensPorProduccion = async (req, res) => {
  try {
    const { produccion_id } = req.params;

    // Verificar acceso a la producción
    const produccion = await Produccion.findByPk(produccion_id);
    if (!produccion) {
      return res.status(404).json({
        success: false,
        message: 'Producción no encontrada'
      });
    }

    // Verificar permisos
    let tieneAcceso = false;
    switch (req.userTipo) {
      case 'agricultor':
        const agricultorPerfil = await Agricultor.findOne({ 
          where: { usuario_id: req.userId } 
        });
        tieneAcceso = agricultorPerfil && produccion.agricultor_id === agricultorPerfil.id;
        break;
      case 'ingenio':
        tieneAcceso = produccion.ingenio_id === req.userId;
        break;
      case 'empresa':
      case 'admin':
        tieneAcceso = true;
        break;
    }

    if (!tieneAcceso) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver los tokens de esta producción'
      });
    }

    const tokens = await Token.findAll({
      where: { produccion_id },
      order: [['fecha_generacion', 'ASC']]
    });

    res.json({
      success: true,
      data: { tokens }
    });

  } catch (error) {
    logger.error('Error obteniendo tokens por producción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ESTADÍSTICAS DE TOKENS
// ============================================

const obtenerEstadisticasTokens = async (req, res) => {
  try {
    const { temporada, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    
    if (fecha_inicio && fecha_fin) {
      where.fecha_generacion = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    // Estadísticas generales
    const estadisticas = await Token.findAll({
      where,
      attributes: [
        [Token.sequelize.fn('COUNT', Token.sequelize.col('id')), 'total_tokens'],
        [Token.sequelize.fn('SUM', Token.sequelize.col('cantidad')), 'cantidad_total'],
        [Token.sequelize.fn('SUM', Token.sequelize.col('co2_equivalente')), 'co2_total'],
        [Token.sequelize.fn('SUM', Token.sequelize.col('valor_total')), 'valor_total'],
        [Token.sequelize.fn('AVG', Token.sequelize.col('precio_actual')), 'precio_promedio']
      ],
      raw: true
    });

    // Estadísticas por estado
    const porEstado = await Token.findAll({
      where,
      attributes: [
        'estado',
        [Token.sequelize.fn('COUNT', Token.sequelize.col('id')), 'cantidad'],
        [Token.sequelize.fn('SUM', Token.sequelize.col('co2_equivalente')), 'co2_total']
      ],
      group: ['estado'],
      raw: true
    });

    res.json({
      success: true,
      data: {
        resumen: estadisticas[0],
        por_estado: porEstado
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerTokensDisponibles,
  obtenerTokenPorId,
  comprarTokens,
  obtenerMisTokens,
  obtenerTokensPorProduccion,
  obtenerEstadisticasTokens
};