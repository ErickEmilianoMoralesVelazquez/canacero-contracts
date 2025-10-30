// ============================================
// MODELO HUELLA DE CARBONO - CÁLCULO Y SEGUIMIENTO EMPRESARIAL
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HuellaCarbon = sequelize.define('HuellaCarbon', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Referencia a la empresa
  empresa_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  
  // Período de reporte
  año: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 2020,
      max: 2050
    }
  },
  
  periodo: {
    type: DataTypes.ENUM('anual', 'semestral', 'trimestral', 'mensual'),
    defaultValue: 'anual'
  },
  
  fecha_inicio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  fecha_fin: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  // Emisiones por alcance (Scope 1, 2, 3)
  emisiones_scope1: {
    type: DataTypes.JSONB,
    defaultValue: {
      combustion_estacionaria: 0,      // Calderas, generadores
      combustion_movil: 0,             // Vehículos de la empresa
      procesos_industriales: 0,        // Procesos químicos/físicos
      emisiones_fugitivas: 0,          // Refrigerantes, fugas
      total: 0
    }
  },
  
  emisiones_scope2: {
    type: DataTypes.JSONB,
    defaultValue: {
      electricidad_comprada: 0,        // Consumo eléctrico
      vapor_comprado: 0,               // Vapor para procesos
      calefaccion_comprada: 0,         // Calefacción/refrigeración
      total: 0
    }
  },
  
  emisiones_scope3: {
    type: DataTypes.JSONB,
    defaultValue: {
      bienes_servicios_comprados: 0,   // Materias primas
      bienes_capital: 0,               // Equipos, infraestructura
      combustibles_energia: 0,         // Extracción/producción combustibles
      transporte_distribucion_upstream: 0,
      residuos_operaciones: 0,
      viajes_negocios: 0,
      desplazamientos_empleados: 0,
      activos_arrendados_upstream: 0,
      transporte_distribucion_downstream: 0,
      procesamiento_productos_vendidos: 0,
      uso_productos_vendidos: 0,
      tratamiento_fin_vida: 0,
      activos_arrendados_downstream: 0,
      franquicias: 0,
      inversiones: 0,
      total: 0
    }
  },
  
  // Totales y métricas
  total_emisiones: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  unidad_medida: {
    type: DataTypes.ENUM('tCO2e', 'kgCO2e', 'MtCO2e'),
    defaultValue: 'tCO2e'
  },
  
  // Factores de emisión utilizados
  factores_emision: {
    type: DataTypes.JSONB,
    defaultValue: {
      electricidad: 0.5,               // tCO2e/MWh
      gas_natural: 2.03,               // tCO2e/m³
      diesel: 2.68,                    // tCO2e/litro
      gasolina: 2.31,                  // tCO2e/litro
      carbon: 2.42,                    // tCO2e/kg
      version_factores: '2024.1',
      fuente: 'IPCC 2024'
    }
  },
  
  // Datos de actividad (consumos)
  datos_actividad: {
    type: DataTypes.JSONB,
    defaultValue: {
      consumo_electricidad: 0,         // MWh
      consumo_gas_natural: 0,          // m³
      consumo_diesel: 0,               // litros
      consumo_gasolina: 0,             // litros
      kilometros_vehiculos: 0,         // km
      empleados: 0,                    // número
      produccion: 0,                   // unidades producidas
      ventas: 0,                       // valor monetario
      superficie_oficinas: 0           // m²
    }
  },
  
  // Intensidades de carbono
  intensidades: {
    type: DataTypes.JSONB,
    defaultValue: {
      por_empleado: 0,                 // tCO2e/empleado
      por_millon_ventas: 0,            // tCO2e/millón USD
      por_unidad_producida: 0,         // tCO2e/unidad
      por_m2: 0                        // tCO2e/m²
    }
  },
  
  // Estado del reporte
  estado: {
    type: DataTypes.ENUM(
      'borrador',                      // En construcción
      'revision',                      // En revisión interna
      'validacion',                    // En validación externa
      'aprobado',                      // Aprobado para uso
      'publicado',                     // Publicado oficialmente
      'archivado'                      // Archivado/histórico
    ),
    defaultValue: 'borrador'
  },
  
  // Metodología utilizada
  metodologia: {
    type: DataTypes.JSONB,
    defaultValue: {
      estandar: 'GHG Protocol',        // GHG Protocol, ISO 14064, etc.
      version: '2015',
      herramienta_calculo: 'Canacero Calculator',
      fecha_calculo: null,
      revisor_externo: null,
      certificacion: null
    }
  },
  
  // Objetivos y metas
  objetivos: {
    type: DataTypes.JSONB,
    defaultValue: {
      meta_reduccion: 0,               // % reducción objetivo
      año_base: null,                  // Año de referencia
      año_meta: null,                  // Año objetivo
      emisiones_base: 0,               // Emisiones año base
      emisiones_objetivo: 0,           // Emisiones objetivo
      tipo_meta: 'absoluta',           // absoluta, intensidad
      alcances_incluidos: [1, 2]      // Alcances incluidos en la meta
    }
  },
  
  // Compensación requerida
  compensacion: {
    type: DataTypes.JSONB,
    defaultValue: {
      requerida: 0,                    // tCO2e a compensar
      porcentaje_compensar: 100,       // % de emisiones a compensar
      tokens_necesarios: 0,            // Tokens tCANE necesarios
      presupuesto_estimado: 0,         // USD estimado
      prioridad_alcances: [1, 2, 3],  // Prioridad de compensación
      fecha_limite: null               // Fecha límite compensación
    }
  },
  
  // Verificación y auditoría
  verificacion: {
    type: DataTypes.JSONB,
    defaultValue: {
      verificado: false,
      auditor_externo: null,
      fecha_verificacion: null,
      certificado_verificacion: null,
      nivel_aseguramiento: null,       // limitado, razonable
      observaciones: []
    }
  },
  
  // Fechas importantes
  fecha_calculo: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  fecha_aprobacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Archivos y documentos
  documentos: {
    type: DataTypes.JSONB,
    defaultValue: {
      reporte_completo: null,
      datos_fuente: [],
      certificados: [],
      evidencias: []
    }
  },
  
  // Observaciones y notas
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'huellas_carbono',
  indexes: [
    {
      fields: ['empresa_id']
    },
    {
      fields: ['año']
    },
    {
      fields: ['periodo']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['total_emisiones']
    },
    {
      fields: ['fecha_calculo']
    },
    {
      // Índice único por empresa, año y período
      fields: ['empresa_id', 'año', 'periodo'],
      unique: true
    }
  ],
  
  // Hooks para cálculos automáticos
  hooks: {
    beforeSave: (huella) => {
      // Calcular totales por scope
      if (huella.emisiones_scope1) {
        huella.emisiones_scope1.total = Object.values(huella.emisiones_scope1)
          .filter(val => typeof val === 'number')
          .reduce((sum, val) => sum + val, 0);
      }
      
      if (huella.emisiones_scope2) {
        huella.emisiones_scope2.total = Object.values(huella.emisiones_scope2)
          .filter(val => typeof val === 'number')
          .reduce((sum, val) => sum + val, 0);
      }
      
      if (huella.emisiones_scope3) {
        huella.emisiones_scope3.total = Object.values(huella.emisiones_scope3)
          .filter(val => typeof val === 'number')
          .reduce((sum, val) => sum + val, 0);
      }
      
      // Calcular total general
      huella.total_emisiones = 
        (huella.emisiones_scope1?.total || 0) +
        (huella.emisiones_scope2?.total || 0) +
        (huella.emisiones_scope3?.total || 0);
      
      // Calcular intensidades
      const datos = huella.datos_actividad || {};
      const total = huella.total_emisiones;
      
      huella.intensidades = {
        por_empleado: datos.empleados ? total / datos.empleados : 0,
        por_millon_ventas: datos.ventas ? (total / datos.ventas) * 1000000 : 0,
        por_unidad_producida: datos.produccion ? total / datos.produccion : 0,
        por_m2: datos.superficie_oficinas ? total / datos.superficie_oficinas : 0
      };
      
      // Calcular compensación requerida
      const porcentaje = huella.compensacion?.porcentaje_compensar || 100;
      const requerida = (total * porcentaje) / 100;
      
      huella.compensacion = {
        ...huella.compensacion,
        requerida,
        tokens_necesarios: requerida, // 1:1 por ahora
        presupuesto_estimado: requerida * 10 // $10 USD por tCO2e estimado
      };
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

HuellaCarbon.prototype.calcularReduccionObjetivo = function() {
  const objetivos = this.objetivos || {};
  if (!objetivos.emisiones_base || !objetivos.meta_reduccion) return null;
  
  const reduccionAbsoluta = (objetivos.emisiones_base * objetivos.meta_reduccion) / 100;
  const emisionesObjetivo = objetivos.emisiones_base - reduccionAbsoluta;
  
  return {
    reduccion_absoluta: reduccionAbsoluta,
    emisiones_objetivo: emisionesObjetivo,
    progreso_actual: this.total_emisiones <= emisionesObjetivo,
    diferencia: this.total_emisiones - emisionesObjetivo
  };
};

HuellaCarbon.prototype.getDistribucionPorScope = function() {
  const total = this.total_emisiones;
  if (total === 0) return { scope1: 0, scope2: 0, scope3: 0 };
  
  return {
    scope1: ((this.emisiones_scope1?.total || 0) / total) * 100,
    scope2: ((this.emisiones_scope2?.total || 0) / total) * 100,
    scope3: ((this.emisiones_scope3?.total || 0) / total) * 100
  };
};

HuellaCarbon.prototype.marcarComoVerificado = async function(datosVerificacion) {
  this.verificacion = {
    ...this.verificacion,
    verificado: true,
    auditor_externo: datosVerificacion.auditor,
    fecha_verificacion: new Date(),
    certificado_verificacion: datosVerificacion.certificado,
    nivel_aseguramiento: datosVerificacion.nivel || 'limitado',
    observaciones: datosVerificacion.observaciones || []
  };
  
  if (this.estado === 'validacion') {
    this.estado = 'aprobado';
    this.fecha_aprobacion = new Date();
  }
  
  await this.save();
};

HuellaCarbon.prototype.actualizarDatosActividad = async function(nuevosDatos) {
  this.datos_actividad = { ...this.datos_actividad, ...nuevosDatos };
  
  // Recalcular emisiones basado en factores de emisión
  await this.recalcularEmisiones();
  await this.save();
};

HuellaCarbon.prototype.recalcularEmisiones = async function() {
  const datos = this.datos_actividad;
  const factores = this.factores_emision;
  
  // Scope 2 - Electricidad
  this.emisiones_scope2.electricidad_comprada = 
    (datos.consumo_electricidad || 0) * (factores.electricidad || 0);
  
  // Scope 1 - Combustibles
  this.emisiones_scope1.combustion_movil = 
    ((datos.consumo_diesel || 0) * (factores.diesel || 0)) +
    ((datos.consumo_gasolina || 0) * (factores.gasolina || 0));
  
  this.emisiones_scope1.combustion_estacionaria = 
    (datos.consumo_gas_natural || 0) * (factores.gas_natural || 0);
};

HuellaCarbon.prototype.compararConAnterior = async function() {
  const añoAnterior = this.año - 1;
  const huellaAnterior = await HuellaCarbon.findOne({
    where: {
      empresa_id: this.empresa_id,
      año: añoAnterior,
      periodo: this.periodo
    }
  });
  
  if (!huellaAnterior) return null;
  
  const diferencia = this.total_emisiones - huellaAnterior.total_emisiones;
  const porcentajeCambio = (diferencia / huellaAnterior.total_emisiones) * 100;
  
  return {
    año_anterior: añoAnterior,
    emisiones_anterior: huellaAnterior.total_emisiones,
    emisiones_actual: this.total_emisiones,
    diferencia_absoluta: diferencia,
    porcentaje_cambio: porcentajeCambio,
    tendencia: diferencia > 0 ? 'aumento' : 'reduccion'
  };
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

HuellaCarbon.findByEmpresa = async function(empresaId, limit = 10) {
  return await this.findAll({
    where: { empresa_id: empresaId },
    order: [['año', 'DESC'], ['periodo', 'DESC']],
    limit
  });
};

HuellaCarbon.findByAño = async function(año) {
  return await this.findAll({
    where: { año },
    include: ['empresa'],
    order: [['total_emisiones', 'DESC']]
  });
};

HuellaCarbon.getEstadisticasGenerales = async function(año) {
  return await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_reportes'],
      [sequelize.fn('SUM', sequelize.col('total_emisiones')), 'emisiones_totales'],
      [sequelize.fn('AVG', sequelize.col('total_emisiones')), 'promedio_emisiones'],
      [sequelize.fn('MIN', sequelize.col('total_emisiones')), 'minimo_emisiones'],
      [sequelize.fn('MAX', sequelize.col('total_emisiones')), 'maximo_emisiones']
    ],
    where: año ? { año } : {},
    raw: true
  });
};

HuellaCarbon.findPendientesVerificacion = async function() {
  return await this.findAll({
    where: { 
      estado: 'validacion',
      'verificacion.verificado': false
    },
    include: ['empresa'],
    order: [['fecha_calculo', 'ASC']]
  });
};

HuellaCarbon.getRankingEmisiones = async function(año, limit = 50) {
  return await this.findAll({
    where: { año },
    order: [['total_emisiones', 'DESC']],
    limit,
    include: ['empresa'],
    attributes: ['id', 'empresa_id', 'total_emisiones', 'intensidades']
  });
};

HuellaCarbon.calcularTendenciasSector = async function(sector, años = 5) {
  const añoActual = new Date().getFullYear();
  const añoInicio = añoActual - años;
  
  return await this.findAll({
    attributes: [
      'año',
      [sequelize.fn('AVG', sequelize.col('total_emisiones')), 'promedio_sector'],
      [sequelize.fn('COUNT', sequelize.col('HuellaCarbon.id')), 'empresas_reportando']
    ],
    include: [{
      model: sequelize.models.Empresa,
      as: 'empresa',
      where: { sector_economico: sector },
      attributes: []
    }],
    where: {
      año: {
        [sequelize.Op.gte]: añoInicio
      }
    },
    group: ['año'],
    order: [['año', 'ASC']],
    raw: true
  });
};

module.exports = HuellaCarbon;