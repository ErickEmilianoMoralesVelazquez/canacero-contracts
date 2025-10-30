// ============================================
// CONTROLADOR DE BLOCKCHAIN
// ============================================

const { Token, Produccion, Transaccion, Usuario, Agricultor } = require('../models');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const sorobanService = require('../services/sorobanService');
const StellarSdk = require('stellar-sdk');

// ============================================
// CONFIGURACIÓN STELLAR/SOROBAN
// ============================================

// Configurar red según el entorno
const server = process.env.STELLAR_NETWORK === 'testnet' 
  ? new StellarSdk.Server(process.env.STELLAR_HORIZON_URL)
  : new StellarSdk.Server('https://horizon.stellar.org');

// Configurar red
if (process.env.STELLAR_NETWORK === 'testnet') {
  StellarSdk.Networks.TESTNET;
} else {
  StellarSdk.Networks.PUBLIC;
}

// ============================================
// MINTEAR TOKENS
// ============================================

/**
 * Mintea tokens tCANE basado en producción reportada por el ingenio
 */
const mintearTokens = async (req, res) => {
  try {
    const { 
      produccion_id, 
      toneladas_producidas, 
      agricultor_id, 
      ingenio_id,
      metadata = {} 
    } = req.body;
    const usuario = req.usuario;

    // Validar datos requeridos
    if (!produccion_id || !toneladas_producidas || !agricultor_id || !ingenio_id) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos: produccion_id, toneladas_producidas, agricultor_id, ingenio_id'
      });
    }

    // Verificar que la producción existe y está validada
    const produccion = await Produccion.findOne({
      where: { 
        id: produccion_id,
        estado: 'validada'
      },
      include: [{
        model: Agricultor,
        include: [{ model: Usuario }]
      }]
    });

    if (!produccion) {
      return res.status(404).json({
        success: false,
        message: 'Producción no encontrada o no validada'
      });
    }

    // Verificar que no existan tokens ya minteados para esta producción
    const tokensExistentes = await Token.findOne({
      where: { produccion_id }
    });

    if (tokensExistentes) {
      return res.status(400).json({
        success: false,
        message: 'Los tokens para esta producción ya han sido minteados'
      });
    }

    // Obtener información del agricultor
    const agricultor = await Usuario.findOne({
      where: { id: agricultor_id, tipo_usuario: 'agricultor' }
    });
    
    if (!agricultor) {
      return res.status(404).json({
        success: false,
        message: 'Agricultor no encontrado o tipo de usuario incorrecto'
      });
    }

    // Verificar que el agricultor tiene wallet configurado
    if (!agricultor.wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'El agricultor no tiene wallet configurado'
      });
    }

    // Crear transacción de minteo
    const transaccion = await Transaccion.create({
      tipo: 'minteo',
      estado: 'pendiente',
      usuario_id: usuario.id,
      produccion_id: produccion.id,
      monto: 0,
      moneda: 'tCANE',
      detalles: {
        tipo_operacion: 'mint_tokens',
        produccion_id: produccion.id,
        toneladas_producidas: parseFloat(toneladas_producidas),
        agricultor_id,
        ingenio_id
      }
    });

    try {
      // Preparar datos para Soroban
      const produccionData = {
        produccion_id: produccion.id,
        toneladas_producidas: parseFloat(toneladas_producidas),
        agricultor_wallet: agricultor.wallet_address,
        ingenio_id,
        metadata: {
          ...metadata,
          agricultor_nombre: agricultor.nombre,
          fecha_procesamiento: new Date().toISOString(),
          zona: agricultor.zona || 'No especificada',
          ubicacion: produccion.ubicacion,
          variedad: produccion.variedad_cana,
          calidad: produccion.calidad,
          humedad: produccion.humedad,
          fecha_cosecha: produccion.fecha_cosecha,
          temporada: produccion.temporada
        }
      };

      // Mintear tokens usando Soroban
      const resultadoMinteo = await sorobanService.mintearTokens(produccionData);

      if (!resultadoMinteo.success) {
        throw new Error('Error en el minteo de tokens');
      }

      // Crear token en la base de datos
      const nuevoToken = await Token.create({
        produccion_id: produccion.id,
        token_id_blockchain: resultadoMinteo.token_id,
        cantidad: resultadoMinteo.tokens_generados,
        co2_equivalente: resultadoMinteo.co2_equivalente || 0,
        precio_base: resultadoMinteo.metadata.precio_por_token,
        precio_actual: resultadoMinteo.metadata.precio_por_token,
        valor_total: resultadoMinteo.valor_total_usd,
        estado: 'minteado',
        blockchain_info: {
          transaction_hash: resultadoMinteo.transaction_hash,
          block_number: resultadoMinteo.block_number,
          gas_used: resultadoMinteo.gas_used,
          network: process.env.STELLAR_NETWORK
        },
        metadata: resultadoMinteo.metadata,
        distribucion_ingresos: resultadoMinteo.distribucion_pagos,
        fecha_minteo: new Date()
      });

      // Actualizar transacción como exitosa
      await transaccion.update({
        estado: 'completada',
        hash_blockchain: resultadoMinteo.transaction_hash,
        bloque: resultadoMinteo.block_number,
        gas_usado: resultadoMinteo.gas_used,
        fecha_completado: new Date()
      });

      // Actualizar estado de la producción
      await produccion.update({
        estado: 'tokenizada',
        tokens_generados: resultadoMinteo.tokens_generados,
        valor_total_usd: resultadoMinteo.valor_total_usd,
        valor_total_cop: resultadoMinteo.valor_total_cop,
        distribucion_pagos: resultadoMinteo.distribucion_pagos
      });

      logger.blockchain(`Tokens minteados exitosamente - Producción: ${produccion_id}, Hash: ${resultadoMinteo.transaction_hash}`);

      res.status(200).json({
        success: true,
        message: 'Tokens minteados exitosamente',
        data: {
          token: nuevoToken,
          transaccion: {
            id: transaccion.id,
            hash: resultadoMinteo.transaction_hash,
            estado: 'completada'
          },
          blockchain: {
            transaction_hash: resultadoMinteo.transaction_hash,
            block_number: resultadoMinteo.block_number,
            token_id: resultadoMinteo.token_id
          },
          tokens_generados: resultadoMinteo.tokens_generados,
          valor_total_usd: resultadoMinteo.valor_total_usd,
          valor_total_cop: resultadoMinteo.valor_total_cop,
          distribucion_pagos: resultadoMinteo.distribucion_pagos,
          toneladas_procesadas: toneladas_producidas,
          precio_por_token: resultadoMinteo.metadata.precio_por_token
        }
      });

    } catch (blockchainError) {
      // Actualizar transacción como fallida
      await transaccion.update({
        estado: 'fallida',
        error: blockchainError.message,
        fecha_completado: new Date()
      });

      throw blockchainError;
    }

  } catch (error) {
    logger.error('Error minteando tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// TRANSFERIR TOKENS
// ============================================

/**
 * Transfiere tokens entre wallets
 */
const transferirTokens = async (req, res) => {
  try {
    const { token_id, wallet_destino, cantidad } = req.body;
    const usuario = req.usuario;

    // Validar datos de entrada
    if (!token_id || !wallet_destino || !cantidad || cantidad <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Datos de transferencia incompletos o inválidos'
      });
    }

    // Verificar que el token existe y pertenece al usuario
    const token = await Token.findOne({
      where: { 
        id: token_id,
        estado: ['minteado', 'vendido']
      },
      include: [{
        model: Produccion,
        include: [{
          model: Agricultor,
          include: [{ model: Usuario }]
        }]
      }]
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token no encontrado'
      });
    }

    // Verificar permisos de transferencia
    const esAgricultor = token.Produccion.Agricultor.Usuario.id === usuario.id;
    const esAdmin = usuario.tipo_usuario === 'admin';
    
    if (!esAgricultor && !esAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para transferir este token'
      });
    }

    // Validar dirección de wallet destino
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(wallet_destino)) {
      return res.status(400).json({
        success: false,
        message: 'Dirección de wallet destino inválida'
      });
    }

    // Verificar que hay suficientes tokens disponibles
    if (cantidad > token.cantidad) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad insuficiente de tokens'
      });
    }

    // Crear transacción de transferencia
    const transaccion = await Transaccion.create({
      tipo: 'transferencia',
      estado: 'pendiente',
      usuario_id: usuario.id,
      token_id: token.id,
      monto: cantidad,
      moneda: 'tCANE',
      detalles: {
        tipo_operacion: 'transfer_tokens',
        wallet_origen: usuario.wallet_address,
        wallet_destino: wallet_destino,
        cantidad: cantidad,
        token_id_blockchain: token.token_id_blockchain
      }
    });

    try {
      // Obtener clave privada del usuario (en producción esto debe ser más seguro)
      const walletSecret = process.env.SYSTEM_WALLET_SECRET; // Temporal para demo

      // Transferir tokens usando Soroban
      const resultadoTransferencia = await sorobanService.transferirTokens(
        usuario.wallet_address,
        wallet_destino,
        cantidad,
        walletSecret
      );

      if (!resultadoTransferencia.success) {
        throw new Error('Error en la transferencia de tokens');
      }

      // Actualizar token (reducir cantidad o marcar como transferido)
      if (cantidad === token.cantidad) {
        await token.update({
          estado: 'transferido'
        });
      } else {
        await token.update({
          cantidad: token.cantidad - cantidad
        });
      }

      // Actualizar transacción como exitosa
      await transaccion.update({
        estado: 'completada',
        hash_blockchain: resultadoTransferencia.transaction_hash,
        fecha_completado: new Date()
      });

      logger.blockchain(`Tokens transferidos - De: ${usuario.wallet_address} A: ${wallet_destino} Cantidad: ${cantidad}`);

      res.status(200).json({
        success: true,
        message: 'Tokens transferidos exitosamente',
        data: {
          transaccion: {
            id: transaccion.id,
            hash: resultadoTransferencia.transaction_hash,
            estado: 'completada'
          },
          transferencia: {
            from: usuario.wallet_address,
            to: wallet_destino,
            amount: cantidad,
            transaction_hash: resultadoTransferencia.transaction_hash
          }
        }
      });

    } catch (blockchainError) {
      // Actualizar transacción como fallida
      await transaccion.update({
        estado: 'fallida',
        error: blockchainError.message,
        fecha_completado: new Date()
      });

      throw blockchainError;
    }

  } catch (error) {
    logger.error('Error transfiriendo tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// CONSULTAR BALANCE
// ============================================

/**
 * Consulta el balance de una wallet
 */
const consultarBalance = async (req, res) => {
  try {
    const { wallet_address } = req.params;
    const usuario = req.usuario;

    // Validar dirección de wallet
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Dirección de wallet inválida'
      });
    }

    // Verificar permisos (solo puede consultar su propia wallet o admin)
    if (wallet_address !== usuario.wallet_address && usuario.tipo_usuario !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para consultar esta wallet'
      });
    }

    try {
      // Consultar balance usando Soroban
      const balanceInfo = await sorobanService.consultarBalance(wallet_address);

      // Obtener información adicional de tokens desde la base de datos
      const tokensUsuario = await Token.findAll({
        where: {
          '$Produccion.Agricultor.Usuario.wallet_address$': wallet_address
        },
        include: [{
          model: Produccion,
          include: [{
            model: Agricultor,
            include: [{ model: Usuario }]
          }]
        }],
        attributes: ['id', 'cantidad', 'co2_equivalente', 'valor_total', 'estado', 'fecha_minteo']
      });

      const estadisticasTokens = {
        total_tokens: tokensUsuario.reduce((sum, token) => sum + token.cantidad, 0),
        total_co2: tokensUsuario.reduce((sum, token) => sum + token.co2_equivalente, 0),
        valor_total: tokensUsuario.reduce((sum, token) => sum + token.valor_total, 0),
        tokens_por_estado: {
          minteado: tokensUsuario.filter(t => t.estado === 'minteado').length,
          vendido: tokensUsuario.filter(t => t.estado === 'vendido').length,
          transferido: tokensUsuario.filter(t => t.estado === 'transferido').length
        }
      };

      res.status(200).json({
        success: true,
        data: {
          wallet_address: wallet_address,
          blockchain_balance: balanceInfo,
          database_stats: estadisticasTokens,
          tokens: tokensUsuario,
          last_updated: new Date().toISOString()
        }
      });

    } catch (blockchainError) {
      logger.error('Error consultando balance en blockchain:', blockchainError);
      
      // Si falla la consulta blockchain, devolver solo datos de la base de datos
      const tokensUsuario = await Token.findAll({
        where: {
          '$Produccion.Agricultor.Usuario.wallet_address$': wallet_address
        },
        include: [{
          model: Produccion,
          include: [{
            model: Agricultor,
            include: [{ model: Usuario }]
          }]
        }]
      });

      res.status(200).json({
        success: true,
        data: {
          wallet_address: wallet_address,
          blockchain_balance: { 
            tcane_balance: 0, 
            error: 'No se pudo consultar balance en blockchain' 
          },
          database_tokens: tokensUsuario,
          last_updated: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    logger.error('Error consultando balance:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// OBTENER HISTORIAL DE TRANSACCIONES
// ============================================

/**
 * Obtiene el historial de transacciones
 */
const obtenerHistorialTransacciones = async (req, res) => {
  try {
    const usuario = req.usuario;
    const { 
      page = 1, 
      limit = 20, 
      tipo, 
      estado, 
      fecha_inicio, 
      fecha_fin 
    } = req.query;

    // Construir filtros
    const whereClause = {};
    
    // Filtrar por usuario (excepto admin que puede ver todas)
    if (usuario.tipo_usuario !== 'admin') {
      whereClause.usuario_id = usuario.id;
    }

    if (tipo) {
      whereClause.tipo = tipo;
    }

    if (estado) {
      whereClause.estado = estado;
    }

    if (fecha_inicio && fecha_fin) {
      whereClause.createdAt = {
        [Op.between]: [new Date(fecha_inicio), new Date(fecha_fin)]
      };
    }

    // Calcular offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener transacciones
    const { count, rows: transacciones } = await Transaccion.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          attributes: ['id', 'nombre', 'email', 'tipo_usuario']
        },
        {
          model: Token,
          attributes: ['id', 'token_id_blockchain', 'cantidad', 'co2_equivalente'],
          required: false
        },
        {
          model: Produccion,
          attributes: ['id', 'toneladas', 'ubicacion', 'temporada'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Calcular estadísticas
    const estadisticas = await Transaccion.findAll({
      where: usuario.tipo_usuario !== 'admin' ? { usuario_id: usuario.id } : {},
      attributes: [
        'tipo',
        'estado',
        [Transaccion.sequelize.fn('COUNT', Transaccion.sequelize.col('id')), 'count'],
        [Transaccion.sequelize.fn('SUM', Transaccion.sequelize.col('monto')), 'total_monto']
      ],
      group: ['tipo', 'estado'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        transacciones,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_items: count,
          items_per_page: parseInt(limit)
        },
        estadisticas: estadisticas,
        filtros_aplicados: {
          tipo,
          estado,
          fecha_inicio,
          fecha_fin,
          usuario_id: usuario.tipo_usuario !== 'admin' ? usuario.id : 'all'
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo historial de transacciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  mintearTokens,
  transferirTokens,
  consultarBalance,
  obtenerHistorialTransacciones
};