const Token = require('../models/Token');
const Transaccion = require('../models/Transaccion');
const Usuario = require('../models/Usuario');
const sorobanService = require('../services/sorobanService');

/**
 * Obtiene el catálogo de tokens disponibles para compra
 */
const obtenerCatalogo = async (req, res) => {
  try {
    const { 
      limite = 20, 
      pagina = 1, 
      precio_min, 
      precio_max,
      zona,
      ordenar_por = 'fecha_creacion'
    } = req.query;

    // Construir filtros
    const filtros = {
      estado: 'disponible'
    };

    if (precio_min) {
      filtros.valor_usd = { ...filtros.valor_usd, $gte: parseFloat(precio_min) };
    }

    if (precio_max) {
      filtros.valor_usd = { ...filtros.valor_usd, $lte: parseFloat(precio_max) };
    }

    // Obtener tokens disponibles
    const tokens = await Token.find(filtros)
      .populate('produccion_id', 'ubicacion zona fecha_cosecha')
      .populate('agricultor_id', 'nombre zona')
      .sort({ [ordenar_por]: -1 })
      .limit(parseInt(limite))
      .skip((parseInt(pagina) - 1) * parseInt(limite));

    // Calcular estadísticas del catálogo
    const estadisticas = await Token.aggregate([
      { $match: { estado: 'disponible' } },
      {
        $group: {
          _id: null,
          total_tokens: { $sum: 1 },
          total_cantidad: { $sum: '$cantidad' },
          precio_promedio: { $avg: '$valor_usd' },
          precio_minimo: { $min: '$valor_usd' },
          precio_maximo: { $max: '$valor_usd' },
          co2_total_disponible: { $sum: '$co2_equivalente' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        tokens: tokens.map(token => ({
          token_id: token.token_id,
          cantidad: token.cantidad,
          precio_usd: token.valor_usd,
          precio_cop: token.valor_cop || token.valor_usd * 4000, // Conversión aproximada
          co2_equivalente: token.co2_equivalente,
          agricultor: {
            nombre: token.agricultor_id?.nombre,
            zona: token.agricultor_id?.zona
          },
          produccion: {
            ubicacion: token.produccion_id?.ubicacion,
            zona: token.produccion_id?.zona,
            fecha_cosecha: token.produccion_id?.fecha_cosecha
          },
          fecha_disponible: token.fecha_minteo,
          metadata: token.metadata
        })),
        paginacion: {
          pagina_actual: parseInt(pagina),
          limite: parseInt(limite),
          total_tokens: tokens.length
        },
        estadisticas: estadisticas[0] || {
          total_tokens: 0,
          total_cantidad: 0,
          precio_promedio: 0,
          precio_minimo: 0,
          precio_maximo: 0,
          co2_total_disponible: 0
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo catálogo:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Permite a una empresa comprar tokens para compensar CO2
 */
const comprarTokens = async (req, res) => {
  try {
    const {
      token_ids,
      empresa_wallet,
      co2_a_compensar,
      metadata = {}
    } = req.body;

    const usuario = req.usuario;

    // Validar que el usuario es una empresa
    if (usuario.tipo !== 'empresa') {
      return res.status(403).json({
        success: false,
        message: 'Solo las empresas pueden comprar tokens de compensación'
      });
    }

    // Validar datos requeridos
    if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar al menos un token para comprar'
      });
    }

    if (!empresa_wallet) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar la wallet de la empresa'
      });
    }

    // Obtener tokens solicitados
    const tokens = await Token.find({
      token_id: { $in: token_ids },
      estado: 'disponible'
    }).populate('agricultor_id', 'wallet_address nombre');

    if (tokens.length !== token_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos tokens no están disponibles o no existen'
      });
    }

    // Calcular totales
    const totales = tokens.reduce((acc, token) => {
      acc.cantidad_tokens += token.cantidad;
      acc.valor_total_usd += token.valor_usd;
      acc.co2_total += token.co2_equivalente;
      return acc;
    }, {
      cantidad_tokens: 0,
      valor_total_usd: 0,
      co2_total: 0
    });

    const resultadosCompra = [];

    // Procesar cada token
    for (const token of tokens) {
      try {
        // Transferir token a la empresa
        const resultadoTransferencia = await sorobanService.transferirTokens({
          token_id: token.token_id,
          from_wallet: token.agricultor_id.wallet_address,
          to_wallet: empresa_wallet,
          cantidad: token.cantidad,
          metadata: {
            ...metadata,
            tipo_transaccion: 'compra_compensacion',
            empresa_id: usuario.id,
            co2_compensado: token.co2_equivalente
          }
        });

        if (resultadoTransferencia.success) {
          // Actualizar estado del token
          await Token.findByIdAndUpdate(token._id, {
            estado: 'vendido',
            empresa_propietaria: usuario.id,
            fecha_venta: new Date(),
            transaction_hash_venta: resultadoTransferencia.transaction_hash
          });

          // Crear registro de transacción
          const transaccion = new Transaccion({
            tipo: 'compra',
            token_id: token.token_id,
            from_address: token.agricultor_id.wallet_address,
            to_address: empresa_wallet,
            cantidad: token.cantidad,
            valor_usd: token.valor_usd,
            valor_cop: token.valor_cop,
            transaction_hash: resultadoTransferencia.transaction_hash,
            estado: 'completada',
            metadata: {
              empresa_id: usuario.id,
              empresa_nombre: usuario.nombre,
              co2_compensado: token.co2_equivalente,
              agricultor_id: token.agricultor_id._id,
              agricultor_nombre: token.agricultor_id.nombre
            }
          });

          await transaccion.save();

          resultadosCompra.push({
            token_id: token.token_id,
            success: true,
            transaction_hash: resultadoTransferencia.transaction_hash,
            co2_compensado: token.co2_equivalente,
            valor_pagado: token.valor_usd
          });
        } else {
          resultadosCompra.push({
            token_id: token.token_id,
            success: false,
            error: resultadoTransferencia.error
          });
        }

      } catch (error) {
        resultadosCompra.push({
          token_id: token.token_id,
          success: false,
          error: error.message
        });
      }
    }

    // Verificar si todas las compras fueron exitosas
    const comprasExitosas = resultadosCompra.filter(r => r.success);
    const comprasFallidas = resultadosCompra.filter(r => !r.success);

    res.json({
      success: comprasFallidas.length === 0,
      message: comprasFallidas.length === 0 
        ? 'Compra completada exitosamente'
        : `${comprasExitosas.length} tokens comprados, ${comprasFallidas.length} fallaron`,
      data: {
        resumen: {
          tokens_comprados: comprasExitosas.length,
          tokens_fallidos: comprasFallidas.length,
          co2_total_compensado: comprasExitosas.reduce((sum, r) => sum + r.co2_compensado, 0),
          valor_total_pagado: comprasExitosas.reduce((sum, r) => sum + r.valor_pagado, 0)
        },
        detalle_compras: resultadosCompra,
        empresa: {
          id: usuario.id,
          nombre: usuario.nombre,
          wallet: empresa_wallet
        }
      }
    });

  } catch (error) {
    console.error('Error en compra de tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Calcula cuántos tokens necesita una empresa para compensar su CO2
 */
const calcularCompensacion = async (req, res) => {
  try {
    const { co2_producido_toneladas } = req.body;

    if (!co2_producido_toneladas || co2_producido_toneladas <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe especificar la cantidad de CO2 producido en toneladas'
      });
    }

    // Obtener tokens disponibles ordenados por precio
    const tokensDisponibles = await Token.find({ estado: 'disponible' })
      .sort({ valor_usd: 1 })
      .populate('agricultor_id', 'nombre zona');

    if (tokensDisponibles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay tokens disponibles para compensación'
      });
    }

    // Calcular la mejor combinación de tokens
    let co2Restante = parseFloat(co2_producido_toneladas);
    const tokensRecomendados = [];
    let costoTotal = 0;

    for (const token of tokensDisponibles) {
      if (co2Restante <= 0) break;

      const co2Token = token.co2_equivalente || token.cantidad; // Asumir 1:1 si no hay equivalente
      const cantidadNecesaria = Math.min(co2Token, co2Restante);
      
      tokensRecomendados.push({
        token_id: token.token_id,
        cantidad_disponible: token.cantidad,
        co2_equivalente: co2Token,
        cantidad_recomendada: cantidadNecesaria,
        precio_unitario: token.valor_usd,
        costo_parcial: (cantidadNecesaria / co2Token) * token.valor_usd,
        agricultor: token.agricultor_id?.nombre,
        zona: token.agricultor_id?.zona
      });

      costoTotal += (cantidadNecesaria / co2Token) * token.valor_usd;
      co2Restante -= cantidadNecesaria;
    }

    res.json({
      success: true,
      data: {
        co2_a_compensar: parseFloat(co2_producido_toneladas),
        co2_compensable: parseFloat(co2_producido_toneladas) - co2Restante,
        co2_restante: co2Restante,
        compensacion_completa: co2Restante <= 0,
        costo_total_usd: costoTotal,
        costo_total_cop: costoTotal * 4000, // Conversión aproximada
        tokens_recomendados: tokensRecomendados,
        resumen: {
          total_tokens: tokensRecomendados.length,
          precio_promedio_por_tonelada: tokensRecomendados.length > 0 
            ? costoTotal / (parseFloat(co2_producido_toneladas) - co2Restante)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error calculando compensación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtiene el historial de compras de una empresa
 */
const obtenerHistorialCompras = async (req, res) => {
  try {
    const usuario = req.usuario;
    const { limite = 20, pagina = 1 } = req.query;

    // Obtener transacciones de compra de la empresa
    const transacciones = await Transaccion.find({
      tipo: 'compra',
      'metadata.empresa_id': usuario.id
    })
      .sort({ fecha_creacion: -1 })
      .limit(parseInt(limite))
      .skip((parseInt(pagina) - 1) * parseInt(limite));

    // Calcular estadísticas
    const estadisticas = await Transaccion.aggregate([
      { 
        $match: { 
          tipo: 'compra',
          'metadata.empresa_id': usuario.id
        }
      },
      {
        $group: {
          _id: null,
          total_compras: { $sum: 1 },
          total_gastado_usd: { $sum: '$valor_usd' },
          total_co2_compensado: { $sum: '$metadata.co2_compensado' },
          total_tokens_comprados: { $sum: '$cantidad' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        historial: transacciones.map(t => ({
          transaction_hash: t.transaction_hash,
          token_id: t.token_id,
          cantidad: t.cantidad,
          valor_usd: t.valor_usd,
          valor_cop: t.valor_cop,
          co2_compensado: t.metadata?.co2_compensado || 0,
          agricultor_nombre: t.metadata?.agricultor_nombre,
          fecha_compra: t.fecha_creacion,
          estado: t.estado
        })),
        estadisticas: estadisticas[0] || {
          total_compras: 0,
          total_gastado_usd: 0,
          total_co2_compensado: 0,
          total_tokens_comprados: 0
        },
        paginacion: {
          pagina_actual: parseInt(pagina),
          limite: parseInt(limite)
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = {
  obtenerCatalogo,
  comprarTokens,
  calcularCompensacion,
  obtenerHistorialCompras
};