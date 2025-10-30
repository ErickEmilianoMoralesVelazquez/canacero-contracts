// ============================================
// MODELO PRODUCCIÓN - REGISTRO DE CAÑA Y TOKENS
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produccion = sequelize.define('Produccion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  agricultor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'agricultores',
      key: 'id'
    }
  },
  
  ingenio_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ingenios',
      key: 'id'
    }
  },
  
  // Información de la producción
  fecha_entrega: {
    type: DataTypes.DATE,
    allowNull: false
  },
  
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Datos de la caña
  toneladas: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  
  calidad: {
    type: DataTypes.ENUM('A', 'B', 'C', 'D'),
    allowNull: false,
    defaultValue: 'B'
  },
  
  humedad: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  pureza: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  
  // Datos de ubicación de la cosecha
  lote_cosecha: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  hectareas_cosechadas: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    validate: {
      min: 0.01
    }
  },
  
  // Conversión a CO2 y tokens
  co2_absorbido: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  tokens_generados: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  factor_conversion_usado: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1.47 // Toneladas CO2 por tonelada de caña
  },
  
  precio_token_momento: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10.00
  },
  
  // Estado del procesamiento
  estado: {
    type: DataTypes.ENUM(
      'registrada',      // Recién registrada por el ingenio
      'validada',        // Validada por el sistema
      'tokenizada',      // Tokens generados en blockchain
      'distribuida',     // Pagos distribuidos
      'completada',      // Proceso completo
      'rechazada'        // Rechazada por algún error
    ),
    defaultValue: 'registrada'
  },
  
  // Información del blockchain
  blockchain_data: {
    type: DataTypes.JSONB,
    defaultValue: {
      transaction_hash: null,
      block_number: null,
      contract_address: null,
      gas_used: null,
      timestamp: null
    }
  },
  
  // Distribución de pagos (70/20/10)
  distribucion_pagos: {
    type: DataTypes.JSONB,
    defaultValue: {
      agricultor: {
        porcentaje: 70,
        monto: 0,
        pagado: false,
        fecha_pago: null
      },
      ingenio: {
        porcentaje: 20,
        monto: 0,
        pagado: false,
        fecha_pago: null
      },
      dao: {
        porcentaje: 10,
        monto: 0,
        transferido: false,
        fecha_transferencia: null
      }
    }
  },
  
  // Validaciones y verificaciones
  verificaciones: {
    type: DataTypes.JSONB,
    defaultValue: {
      datos_validados: false,
      calidad_verificada: false,
      conversion_verificada: false,
      blockchain_confirmado: false,
      pagos_confirmados: false
    }
  },
  
  // Observaciones y notas
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Archivos adjuntos (URLs o referencias)
  documentos: {
    type: DataTypes.JSONB,
    defaultValue: {
      ticket_bascula: null,
      certificado_calidad: null,
      fotos_entrega: [],
      otros: []
    }
  },
  
  // Temporada de cosecha
  temporada: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: () => {
      const year = new Date().getFullYear();
      return `${year}-${year + 1}`;
    }
  }
}, {
  tableName: 'producciones',
  indexes: [
    {
      fields: ['agricultor_id']
    },
    {
      fields: ['ingenio_id']
    },
    {
      fields: ['fecha_entrega']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['temporada']
    },
    {
      fields: ['calidad']
    },
    {
      fields: ['blockchain_data'],
      using: 'gin'
    }
  ],
  
  // Hooks para cálculos automáticos
  hooks: {
    beforeCreate: (produccion) => {
      // Calcular CO2 absorbido
      produccion.co2_absorbido = produccion.toneladas * produccion.factor_conversion_usado;
      
      // Calcular tokens generados (1:1 con CO2 por ahora)
      produccion.tokens_generados = produccion.co2_absorbido;
      
      // Calcular distribución de pagos
      const valorTotal = produccion.tokens_generados * produccion.precio_token_momento;
      produccion.distribucion_pagos.agricultor.monto = valorTotal * 0.70;
      produccion.distribucion_pagos.ingenio.monto = valorTotal * 0.20;
      produccion.distribucion_pagos.dao.monto = valorTotal * 0.10;
    },
    
    beforeUpdate: (produccion) => {
      // Recalcular si cambian los valores base
      if (produccion.changed('toneladas') || produccion.changed('factor_conversion_usado')) {
        produccion.co2_absorbido = produccion.toneladas * produccion.factor_conversion_usado;
        produccion.tokens_generados = produccion.co2_absorbido;
        
        const valorTotal = produccion.tokens_generados * produccion.precio_token_momento;
        produccion.distribucion_pagos.agricultor.monto = valorTotal * 0.70;
        produccion.distribucion_pagos.ingenio.monto = valorTotal * 0.20;
        produccion.distribucion_pagos.dao.monto = valorTotal * 0.10;
      }
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Produccion.prototype.calcularRendimiento = function() {
  if (!this.hectareas_cosechadas || this.hectareas_cosechadas === 0) return 0;
  return this.toneladas / this.hectareas_cosechadas;
};

Produccion.prototype.getValorTotal = function() {
  return this.tokens_generados * this.precio_token_momento;
};

Produccion.prototype.marcarComoTokenizada = async function(blockchainData) {
  this.estado = 'tokenizada';
  this.blockchain_data = { ...this.blockchain_data, ...blockchainData };
  this.verificaciones.blockchain_confirmado = true;
  await this.save();
};

Produccion.prototype.marcarPagoAgricultor = async function() {
  this.distribucion_pagos.agricultor.pagado = true;
  this.distribucion_pagos.agricultor.fecha_pago = new Date();
  
  // Si todos los pagos están hechos, marcar como completada
  if (this.distribucion_pagos.ingenio.pagado && this.distribucion_pagos.dao.transferido) {
    this.estado = 'completada';
    this.verificaciones.pagos_confirmados = true;
  }
  
  await this.save();
};

Produccion.prototype.marcarPagoIngenio = async function() {
  this.distribucion_pagos.ingenio.pagado = true;
  this.distribucion_pagos.ingenio.fecha_pago = new Date();
  
  // Si todos los pagos están hechos, marcar como completada
  if (this.distribucion_pagos.agricultor.pagado && this.distribucion_pagos.dao.transferido) {
    this.estado = 'completada';
    this.verificaciones.pagos_confirmados = true;
  }
  
  await this.save();
};

Produccion.prototype.marcarTransferenciaDAO = async function() {
  this.distribucion_pagos.dao.transferido = true;
  this.distribucion_pagos.dao.fecha_transferencia = new Date();
  
  // Si todos los pagos están hechos, marcar como completada
  if (this.distribucion_pagos.agricultor.pagado && this.distribucion_pagos.ingenio.pagado) {
    this.estado = 'completada';
    this.verificaciones.pagos_confirmados = true;
  }
  
  await this.save();
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Produccion.findByAgricultor = async function(agricultorId, limit = 50) {
  return await this.findAll({
    where: { agricultor_id: agricultorId },
    order: [['fecha_entrega', 'DESC']],
    limit,
    include: ['agricultor', 'ingenio_reportador']
  });
};

Produccion.findByIngenio = async function(ingenioId, limit = 100) {
  return await this.findAll({
    where: { ingenio_id: ingenioId },
    order: [['fecha_registro', 'DESC']],
    limit,
    include: ['agricultor', 'ingenio_reportador']
  });
};

Produccion.findPendientesTokenizacion = async function() {
  return await this.findAll({
    where: { 
      estado: 'validada',
      'verificaciones.blockchain_confirmado': false
    },
    include: ['agricultor', 'ingenio_reportador']
  });
};

Produccion.getEstadisticasTemporada = async function(temporada) {
  return await this.findAll({
    where: { temporada },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_producciones'],
      [sequelize.fn('SUM', sequelize.col('toneladas')), 'total_toneladas'],
      [sequelize.fn('SUM', sequelize.col('tokens_generados')), 'total_tokens'],
      [sequelize.fn('AVG', sequelize.col('toneladas')), 'promedio_toneladas'],
      [sequelize.fn('AVG', sequelize.col('calidad')), 'calidad_promedio']
    ],
    raw: true
  });
};

module.exports = Produccion;