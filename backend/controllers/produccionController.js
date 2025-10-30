// ============================================
// CONTROLADOR DE PRODUCCIÓN
// ============================================

const { Produccion, Agricultor, Ingenio, Token, Transaccion } = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const sorobanService = require('../services/sorobanService');

// ============================================
// REGISTRAR NUEVA PRODUCCIÓN
// ============================================

const registrarProduccion = async (req, res) => {
  try {
    const {
      agricultor_id,
      fecha_entrega,
      toneladas,
      calidad,
      humedad,
      pureza,
      lote_cosecha,
      hectareas_cosechadas,
      observaciones
    } = req.body;

    // Validar datos requeridos
    if (!agricultor_id || !fecha_entrega || !toneladas || !calidad || !humedad) {
      return res.status(400).json({
        success: false,
        message: 'Datos requeridos: agricultor_id, fecha_entrega, toneladas, calidad, humedad'
      });
    }

    // Verificar que el agricultor existe y pertenece al ingenio
    const agricultor = await Agricultor.findByPk(agricultor_id);
    if (!agricultor) {
      return res.status(404).json({
        success: false,
        message: 'Agricultor no encontrado'
      });
    }

    // Verificar que el ingenio tiene permisos sobre este agricultor
    if (req.userTipo === 'ingenio' && agricultor.ingenio_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para registrar producción de este agricultor'
      });
    }

    // Calcular CO2 absorbido y tokens generados usando Soroban
    const calculoTokens = sorobanService.calcularTokensDesdeProduccion(
      toneladas, 
      calidad, 
      humedad
    );
    
    const co2Absorbido = calculoTokens.co2_absorbido;
    const tokensGenerados = calculoTokens.tokens_generados;

    // Crear la producción
    const nuevaProduccion = await Produccion.create({
      agricultor_id,
      ingenio_id: req.userTipo === 'ingenio' ? req.userId : agricultor.ingenio_id,
      fecha_entrega: new Date(fecha_entrega),
      toneladas: parseFloat(toneladas),
      calidad,
      humedad: parseFloat(humedad),
      pureza: pureza ? parseFloat(pureza) : null,
      lote_cosecha,
      hectareas_cosechadas: hectareas_cosechadas ? parseFloat(hectareas_cosechadas) : null,
      observaciones,
      estado: 'registrada',
      temporada: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      co2_absorbido: co2Absorbido,
      tokens_generados: tokensGenerados
    });

    // Incluir datos relacionados en la respuesta
    const produccionCompleta = await Produccion.findByPk(nuevaProduccion.id, {
      include: [
        { model: Agricultor, as: 'agricultor' },
        { model: Ingenio, as: 'ingenio_reportador' }
      ]
    });

    logger.info(`Producción registrada: ${nuevaProduccion.id} - ${toneladas} toneladas`);

    res.status(201).json({
      success: true,
      message: 'Producción registrada exitosamente',
      data: {
        produccion: produccionCompleta,
        conversion: {
          co2_absorbido: nuevaProduccion.co2_absorbido,
          tokens_generados: nuevaProduccion.tokens_generados,
          valor_estimado: nuevaProduccion.tokens_generados * nuevaProduccion.precio_token_momento
        }
      }
    });

  } catch (error) {
    logger.error('Error registrando producción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// OBTENER PRODUCCIONES
// ============================================

const obtenerProducciones = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      estado, 
      temporada, 
      agricultor_id,
      fecha_inicio,
      fecha_fin
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Filtros según tipo de usuario
    switch (req.userTipo) {
      case 'agricultor':
        // Los agricultores solo ven sus propias producciones
        const agricultorPerfil = await Agricultor.findOne({ 
          where: { usuario_id: req.userId } 
        });
        if (agricultorPerfil) {
          where.agricultor_id = agricultorPerfil.id;
        }
        break;
      case 'ingenio':
        // Los ingenios ven producciones de sus agricultores
        where.ingenio_id = req.userId;
        break;
      case 'empresa':
        // Las empresas pueden ver todas las producciones (para comprar tokens)
        break;
    }

    // Aplicar filtros adicionales
    if (estado) where.estado = estado;
    if (temporada) where.temporada = temporada;
    if (agricultor_id) where.agricultor_id = agricultor_id;
    
    if (fecha_inicio && fecha_fin) {
      where.fecha_entrega = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    const { count, rows: producciones } = await Produccion.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['fecha_entrega', 'DESC']],
      include: [
        { model: Agricultor, as: 'agricultor' },
        { model: Ingenio, as: 'ingenio_reportador' },
        { model: Token, as: 'tokens_generados' }
      ]
    });

    res.json({
      success: true,
      data: {
        producciones,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo producciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// OBTENER PRODUCCIÓN POR ID
// ============================================

const obtenerProduccionPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const produccion = await Produccion.findByPk(id, {
      include: [
        { model: Agricultor, as: 'agricultor' },
        { model: Ingenio, as: 'ingenio_reportador' },
        { model: Token, as: 'tokens_generados' },
        { model: Transaccion, as: 'transacciones_relacionadas' }
      ]
    });

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
        message: 'No tienes permisos para ver esta producción'
      });
    }

    res.json({
      success: true,
      data: { produccion }
    });

  } catch (error) {
    logger.error('Error obteniendo producción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// VALIDAR PRODUCCIÓN
// ============================================

const validarProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { observaciones_validacion } = req.body;

    const produccion = await Produccion.findByPk(id);
    if (!produccion) {
      return res.status(404).json({
        success: false,
        message: 'Producción no encontrada'
      });
    }

    // Solo ingenios pueden validar producciones
    if (req.userTipo !== 'ingenio' || produccion.ingenio_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para validar esta producción'
      });
    }

    if (produccion.estado !== 'registrada') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden validar producciones en estado "registrada"'
      });
    }

    // Actualizar estado y verificaciones
    await produccion.update({
      estado: 'validada',
      observaciones: observaciones_validacion || produccion.observaciones,
      'verificaciones.datos_validados': true,
      'verificaciones.calidad_verificada': true,
      'verificaciones.conversion_verificada': true
    });

    logger.info(`Producción validada: ${id}`);

    res.json({
      success: true,
      message: 'Producción validada exitosamente',
      data: { produccion }
    });

  } catch (error) {
    logger.error('Error validando producción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// RECHAZAR PRODUCCIÓN
// ============================================

const rechazarProduccion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo_rechazo } = req.body;

    if (!motivo_rechazo) {
      return res.status(400).json({
        success: false,
        message: 'Motivo de rechazo es requerido'
      });
    }

    const produccion = await Produccion.findByPk(id);
    if (!produccion) {
      return res.status(404).json({
        success: false,
        message: 'Producción no encontrada'
      });
    }

    // Solo ingenios pueden rechazar producciones
    if (req.userTipo !== 'ingenio' || produccion.ingenio_id !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para rechazar esta producción'
      });
    }

    await produccion.update({
      estado: 'rechazada',
      observaciones: `RECHAZADA: ${motivo_rechazo}. ${produccion.observaciones || ''}`
    });

    logger.info(`Producción rechazada: ${id} - Motivo: ${motivo_rechazo}`);

    res.json({
      success: true,
      message: 'Producción rechazada',
      data: { produccion }
    });

  } catch (error) {
    logger.error('Error rechazando producción:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ESTADÍSTICAS DE PRODUCCIÓN
// ============================================

const obtenerEstadisticas = async (req, res) => {
  try {
    const { temporada, fecha_inicio, fecha_fin } = req.query;
    
    const where = {};
    
    // Filtros según usuario
    switch (req.userTipo) {
      case 'agricultor':
        const agricultorPerfil = await Agricultor.findOne({ 
          where: { usuario_id: req.userId } 
        });
        if (agricultorPerfil) {
          where.agricultor_id = agricultorPerfil.id;
        }
        break;
      case 'ingenio':
        where.ingenio_id = req.userId;
        break;
    }

    if (temporada) where.temporada = temporada;
    if (fecha_inicio && fecha_fin) {
      where.fecha_entrega = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    const estadisticas = await Produccion.findAll({
      where,
      attributes: [
        [Produccion.sequelize.fn('COUNT', Produccion.sequelize.col('id')), 'total_producciones'],
        [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('toneladas')), 'total_toneladas'],
        [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('co2_absorbido')), 'total_co2'],
        [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('tokens_generados')), 'total_tokens'],
        [Produccion.sequelize.fn('AVG', Produccion.sequelize.col('toneladas')), 'promedio_toneladas'],
        [Produccion.sequelize.fn('AVG', Produccion.sequelize.col('calidad')), 'calidad_promedio']
      ],
      raw: true
    });

    // Estadísticas por estado
    const porEstado = await Produccion.findAll({
      where,
      attributes: [
        'estado',
        [Produccion.sequelize.fn('COUNT', Produccion.sequelize.col('id')), 'cantidad']
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
    logger.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  registrarProduccion,
  obtenerProducciones,
  obtenerProduccionPorId,
  validarProduccion,
  rechazarProduccion,
  obtenerEstadisticas
};