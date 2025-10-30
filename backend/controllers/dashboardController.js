// ============================================
// CONTROLADOR DE DASHBOARD
// ============================================

const { 
  Usuario, 
  Agricultor, 
  Ingenio, 
  Empresa, 
  Produccion, 
  Token, 
  Transaccion,
  HuellaCarbon 
} = require('../models');
const logger = require('../config/logger');
const { Op } = require('sequelize');

// ============================================
// DASHBOARD GENERAL
// ============================================

const obtenerDashboardGeneral = async (req, res) => {
  try {
    // Métricas generales del sistema
    const metricas = await Promise.all([
      // Usuarios por tipo
      Usuario.count({ where: { tipo_usuario: 'agricultor', activo: true } }),
      Usuario.count({ where: { tipo_usuario: 'ingenio', activo: true } }),
      Usuario.count({ where: { tipo_usuario: 'empresa', activo: true } }),
      
      // Producciones
      Produccion.count(),
      Produccion.sum('toneladas'),
      Produccion.sum('co2_absorbido'),
      
      // Tokens
      Token.count({ where: { estado: 'minteado' } }),
      Token.count({ where: { estado: 'vendido' } }),
      Token.sum('co2_equivalente'),
      Token.sum('valor_total', { where: { estado: 'vendido' } }),
      
      // Transacciones
      Transaccion.count({ where: { estado: 'completada' } }),
      Transaccion.sum('monto_total', { where: { estado: 'completada' } })
    ]);

    const [
      agricultores_activos,
      ingenios_activos,
      empresas_activas,
      total_producciones,
      total_toneladas,
      total_co2_absorbido,
      tokens_disponibles,
      tokens_vendidos,
      co2_tokenizado,
      valor_tokens_vendidos,
      transacciones_completadas,
      volumen_transacciones
    ] = metricas;

    // Actividad reciente (últimos 30 días)
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 30);

    const actividadReciente = await Promise.all([
      Produccion.count({ 
        where: { 
          createdAt: { [Op.gte]: fechaInicio } 
        } 
      }),
      Token.count({ 
        where: { 
          fecha_generacion: { [Op.gte]: fechaInicio } 
        } 
      }),
      Transaccion.count({ 
        where: { 
          createdAt: { [Op.gte]: fechaInicio },
          estado: 'completada'
        } 
      })
    ]);

    const [
      producciones_mes,
      tokens_generados_mes,
      transacciones_mes
    ] = actividadReciente;

    // Top performers
    const topAgricultores = await Agricultor.findAll({
      attributes: [
        'id', 'nombres', 'apellidos', 'finca_nombre',
        [Agricultor.sequelize.fn('SUM', Agricultor.sequelize.col('producciones.toneladas')), 'total_toneladas']
      ],
      include: [{
        model: Produccion,
        as: 'producciones',
        attributes: [],
        where: { estado: ['validada', 'tokenizada'] }
      }],
      group: ['Agricultor.id'],
      order: [[Agricultor.sequelize.fn('SUM', Agricultor.sequelize.col('producciones.toneladas')), 'DESC']],
      limit: 5,
      raw: true
    });

    const topEmpresas = await Empresa.findAll({
      attributes: [
        'id', 'razon_social', 'sector_economico',
        'estadisticas_compra.total_tokens_comprados',
        'estadisticas_compra.co2_compensado',
        'estadisticas_compra.total_invertido'
      ],
      order: [['estadisticas_compra.total_invertido', 'DESC']],
      limit: 5
    });

    res.json({
      success: true,
      data: {
        metricas_generales: {
          usuarios: {
            agricultores_activos,
            ingenios_activos,
            empresas_activas,
            total: agricultores_activos + ingenios_activos + empresas_activas
          },
          produccion: {
            total_producciones,
            total_toneladas: total_toneladas || 0,
            total_co2_absorbido: total_co2_absorbido || 0,
            promedio_toneladas_produccion: total_producciones > 0 ? (total_toneladas / total_producciones) : 0
          },
          tokens: {
            tokens_disponibles: tokens_disponibles || 0,
            tokens_vendidos: tokens_vendidos || 0,
            co2_tokenizado: co2_tokenizado || 0,
            valor_tokens_vendidos: valor_tokens_vendidos || 0,
            precio_promedio: tokens_vendidos > 0 ? (valor_tokens_vendidos / tokens_vendidos) : 0
          },
          transacciones: {
            transacciones_completadas: transacciones_completadas || 0,
            volumen_transacciones: volumen_transacciones || 0,
            valor_promedio: transacciones_completadas > 0 ? (volumen_transacciones / transacciones_completadas) : 0
          }
        },
        actividad_reciente: {
          producciones_mes,
          tokens_generados_mes,
          transacciones_mes
        },
        top_performers: {
          agricultores: topAgricultores,
          empresas: topEmpresas
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo dashboard general:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// DASHBOARD POR TIPO DE USUARIO
// ============================================

const obtenerDashboardUsuario = async (req, res) => {
  try {
    let dashboardData = {};

    switch (req.userTipo) {
      case 'agricultor':
        dashboardData = await obtenerDashboardAgricultor(req.userId);
        break;
      case 'ingenio':
        dashboardData = await obtenerDashboardIngenio(req.userId);
        break;
      case 'empresa':
        dashboardData = await obtenerDashboardEmpresa(req.userId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo de usuario no válido para dashboard personalizado'
        });
    }

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error obteniendo dashboard de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// DASHBOARD AGRICULTOR
// ============================================

const obtenerDashboardAgricultor = async (userId) => {
  const agricultor = await Agricultor.findOne({ 
    where: { usuario_id: userId },
    include: [{ model: Ingenio, as: 'ingenio_asociado' }]
  });

  if (!agricultor) {
    throw new Error('Perfil de agricultor no encontrado');
  }

  // Estadísticas de producción
  const estadisticasProduccion = await Produccion.findAll({
    where: { agricultor_id: agricultor.id },
    attributes: [
      [Produccion.sequelize.fn('COUNT', Produccion.sequelize.col('id')), 'total_producciones'],
      [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('toneladas')), 'total_toneladas'],
      [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('co2_absorbido')), 'total_co2'],
      [Produccion.sequelize.fn('SUM', Produccion.sequelize.col('tokens_generados')), 'total_tokens'],
      [Produccion.sequelize.fn('AVG', Produccion.sequelize.col('calidad')), 'calidad_promedio']
    ],
    raw: true
  });

  // Producciones recientes
  const produccionesRecientes = await Produccion.findAll({
    where: { agricultor_id: agricultor.id },
    order: [['fecha_entrega', 'DESC']],
    limit: 5,
    include: [{ model: Token, as: 'tokens_generados' }]
  });

  // Ingresos por tokens
  const ingresosPorTokens = await Token.findAll({
    attributes: [
      [Token.sequelize.fn('SUM', Token.sequelize.col('distribucion_ingresos.agricultor')), 'ingresos_totales']
    ],
    include: [{
      model: Produccion,
      as: 'produccion_origen',
      where: { agricultor_id: agricultor.id },
      attributes: []
    }],
    where: { estado: 'vendido' },
    raw: true
  });

  return {
    perfil: agricultor,
    estadisticas: estadisticasProduccion[0],
    producciones_recientes: produccionesRecientes,
    ingresos_tokens: ingresosPorTokens[0]?.ingresos_totales || 0
  };
};

// ============================================
// DASHBOARD INGENIO
// ============================================

const obtenerDashboardIngenio = async (userId) => {
  const ingenio = await Ingenio.findOne({ 
    where: { usuario_id: userId } 
  });

  if (!ingenio) {
    throw new Error('Perfil de ingenio no encontrado');
  }

  // Estadísticas generales
  const estadisticas = {
    total_agricultores: await Agricultor.count({ where: { ingenio_id: ingenio.id } }),
    producciones_procesadas: await Produccion.count({ where: { ingenio_id: ingenio.id } }),
    toneladas_procesadas: await Produccion.sum('toneladas', { where: { ingenio_id: ingenio.id } }) || 0,
    tokens_facilitados: await Token.count({
      include: [{
        model: Produccion,
        as: 'produccion_origen',
        where: { ingenio_id: ingenio.id }
      }]
    })
  };

  // Producciones por estado
  const produccionesPorEstado = await Produccion.findAll({
    where: { ingenio_id: ingenio.id },
    attributes: [
      'estado',
      [Produccion.sequelize.fn('COUNT', Produccion.sequelize.col('id')), 'cantidad']
    ],
    group: ['estado'],
    raw: true
  });

  // Top agricultores
  const topAgricultores = await Agricultor.findAll({
    where: { ingenio_id: ingenio.id },
    attributes: [
      'id', 'nombres', 'apellidos', 'finca_nombre',
      [Agricultor.sequelize.fn('SUM', Agricultor.sequelize.col('producciones.toneladas')), 'total_toneladas']
    ],
    include: [{
      model: Produccion,
      as: 'producciones',
      attributes: [],
      where: { estado: ['validada', 'tokenizada'] }
    }],
    group: ['Agricultor.id'],
    order: [[Agricultor.sequelize.fn('SUM', Agricultor.sequelize.col('producciones.toneladas')), 'DESC']],
    limit: 10,
    raw: true
  });

  // Ingresos por comisiones
  const ingresosPorComisiones = await Token.findAll({
    attributes: [
      [Token.sequelize.fn('SUM', Token.sequelize.col('distribucion_ingresos.ingenio')), 'comisiones_totales']
    ],
    include: [{
      model: Produccion,
      as: 'produccion_origen',
      where: { ingenio_id: ingenio.id },
      attributes: []
    }],
    where: { estado: 'vendido' },
    raw: true
  });

  return {
    perfil: ingenio,
    estadisticas,
    producciones_por_estado: produccionesPorEstado,
    top_agricultores: topAgricultores,
    ingresos_comisiones: ingresosPorComisiones[0]?.comisiones_totales || 0
  };
};

// ============================================
// DASHBOARD EMPRESA
// ============================================

const obtenerDashboardEmpresa = async (userId) => {
  const empresa = await Empresa.findOne({ 
    where: { usuario_id: userId } 
  });

  if (!empresa) {
    throw new Error('Perfil de empresa no encontrado');
  }

  // Tokens comprados
  const tokensComprados = await Token.findAll({
    where: { 'venta_info.empresa_id': empresa.id },
    order: [['venta_info.fecha_venta', 'DESC']],
    limit: 10,
    include: [{
      model: Produccion,
      as: 'produccion_origen',
      include: [
        { model: Agricultor, as: 'agricultor' },
        { model: Ingenio, as: 'ingenio_reportador' }
      ]
    }]
  });

  // Huella de carbono
  const huellaCarbonoActual = await HuellaCarbon.findOne({
    where: { 
      empresa_id: empresa.id,
      ano_reporte: new Date().getFullYear()
    },
    order: [['createdAt', 'DESC']]
  });

  // Progreso de compensación
  const progresoCompensacion = {
    objetivo_co2: huellaCarbonoActual?.compensacion_requerida_tco2e || 0,
    co2_compensado: empresa.estadisticas_compra.co2_compensado || 0,
    porcentaje_completado: 0
  };

  if (progresoCompensacion.objetivo_co2 > 0) {
    progresoCompensacion.porcentaje_completado = 
      (progresoCompensacion.co2_compensado / progresoCompensacion.objetivo_co2) * 100;
  }

  // Transacciones recientes
  const transaccionesRecientes = await Transaccion.findAll({
    where: { 
      empresa_id: empresa.id,
      tipo_transaccion: 'compra_token'
    },
    order: [['createdAt', 'DESC']],
    limit: 5
  });

  return {
    perfil: empresa,
    estadisticas_compra: empresa.estadisticas_compra,
    tokens_comprados: tokensComprados,
    huella_carbono_actual: huellaCarbonoActual,
    progreso_compensacion: progresoCompensacion,
    transacciones_recientes: transaccionesRecientes
  };
};

module.exports = {
  obtenerDashboardGeneral,
  obtenerDashboardUsuario
};