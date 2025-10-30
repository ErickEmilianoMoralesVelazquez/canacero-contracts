// ============================================
// MODELO TRANSACCIÓN - REGISTRO DE TRANSACCIONES BLOCKCHAIN Y PAGOS
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaccion = sequelize.define('Transaccion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Tipo de transacción
  tipo: {
    type: DataTypes.ENUM(
      'mint_token',           // Minteo de tokens
      'transfer_token',       // Transferencia de tokens
      'distribute_revenue',   // Distribución de ingresos
      'deposit_dao',          // Depósito al DAO
      'payment_farmer',       // Pago a agricultor
      'payment_mill',         // Pago a ingenio
      'purchase_token',       // Compra de token por empresa
      'refund',              // Reembolso
      'fee_collection'       // Cobro de comisiones
    ),
    allowNull: false
  },
  
  // Estado de la transacción
  estado: {
    type: DataTypes.ENUM(
      'pendiente',           // Iniciada pero no confirmada
      'procesando',          // En proceso en blockchain
      'confirmada',          // Confirmada en blockchain
      'fallida',             // Falló en blockchain
      'revertida',           // Revertida
      'cancelada'            // Cancelada por el usuario
    ),
    defaultValue: 'pendiente'
  },
  
  // Información del blockchain
  blockchain_data: {
    type: DataTypes.JSONB,
    defaultValue: {
      network: 'testnet',
      transaction_hash: null,
      block_number: null,
      block_hash: null,
      gas_used: null,
      gas_price: null,
      fee_paid: null,
      confirmations: 0,
      timestamp: null,
      contract_address: null,
      function_called: null,
      events_emitted: []
    }
  },
  
  // Participantes de la transacción
  from_address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isValidStellarAddress(value) {
        if (value && !value.match(/^G[A-Z0-9]{55}$/)) {
          throw new Error('Dirección Stellar inválida');
        }
      }
    }
  },
  
  to_address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isValidStellarAddress(value) {
        if (value && !value.match(/^G[A-Z0-9]{55}$/)) {
          throw new Error('Dirección Stellar inválida');
        }
      }
    }
  },
  
  // Referencias a entidades del sistema
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  
  token_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tokens',
      key: 'id'
    }
  },
  
  produccion_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'producciones',
      key: 'id'
    }
  },
  
  // Montos y valores
  monto: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  
  moneda: {
    type: DataTypes.ENUM('XLM', 'tCANE', 'USD', 'COP'),
    defaultValue: 'tCANE'
  },
  
  // Equivalencias en otras monedas
  equivalencias: {
    type: DataTypes.JSONB,
    defaultValue: {
      xlm: 0,
      usd: 0,
      cop: 0,
      tcane: 0
    }
  },
  
  // Comisiones y fees
  comisiones: {
    type: DataTypes.JSONB,
    defaultValue: {
      plataforma: {
        porcentaje: 0,
        monto: 0
      },
      blockchain: {
        gas_fee: 0,
        network_fee: 0
      },
      procesamiento: {
        monto: 0,
        concepto: null
      }
    }
  },
  
  // Detalles específicos por tipo de transacción
  detalles: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Fechas importantes
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  fecha_procesamiento: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  fecha_confirmacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Información de retry y errores
  intentos: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  max_intentos: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  
  errores: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  
  // Metadatos adicionales
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      origen: null,           // Web, API, Sistema
      ip_address: null,
      user_agent: null,
      session_id: null,
      batch_id: null,         // Para transacciones en lote
      parent_transaction: null // Para transacciones relacionadas
    }
  },
  
  // Observaciones y notas
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'transacciones',
  indexes: [
    {
      fields: ['tipo']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['usuario_id']
    },
    {
      fields: ['token_id']
    },
    {
      fields: ['produccion_id']
    },
    {
      fields: ['from_address']
    },
    {
      fields: ['to_address']
    },
    {
      fields: ['fecha_creacion']
    },
    {
      fields: ['blockchain_data'],
      using: 'gin'
    },
    {
      fields: ['metadata'],
      using: 'gin'
    },
    {
      // Índice compuesto para búsquedas por hash
      fields: ['blockchain_data'],
      name: 'idx_transaction_hash',
      where: {
        'blockchain_data.transaction_hash': {
          [sequelize.Op.ne]: null
        }
      }
    }
  ],
  
  // Hooks para validaciones y cálculos
  hooks: {
    beforeCreate: (transaccion) => {
      // Generar ID único si no existe
      if (!transaccion.id) {
        transaccion.id = require('crypto').randomUUID();
      }
      
      // Establecer fecha de procesamiento si está procesando
      if (transaccion.estado === 'procesando') {
        transaccion.fecha_procesamiento = new Date();
      }
    },
    
    beforeUpdate: (transaccion) => {
      // Actualizar fechas según el estado
      if (transaccion.changed('estado')) {
        switch (transaccion.estado) {
          case 'procesando':
            if (!transaccion.fecha_procesamiento) {
              transaccion.fecha_procesamiento = new Date();
            }
            break;
          case 'confirmada':
            if (!transaccion.fecha_confirmacion) {
              transaccion.fecha_confirmacion = new Date();
            }
            break;
        }
      }
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Transaccion.prototype.marcarComoProcesando = async function(transactionHash) {
  this.estado = 'procesando';
  this.fecha_procesamiento = new Date();
  this.blockchain_data.transaction_hash = transactionHash;
  this.intentos += 1;
  await this.save();
};

Transaccion.prototype.marcarComoConfirmada = async function(blockchainData) {
  this.estado = 'confirmada';
  this.fecha_confirmacion = new Date();
  this.blockchain_data = {
    ...this.blockchain_data,
    ...blockchainData,
    timestamp: new Date()
  };
  await this.save();
};

Transaccion.prototype.marcarComoFallida = async function(error) {
  this.estado = 'fallida';
  this.errores.push({
    timestamp: new Date(),
    intento: this.intentos,
    error: error.message || error,
    stack: error.stack || null
  });
  await this.save();
};

Transaccion.prototype.puedeReintentar = function() {
  return this.intentos < this.max_intentos && 
         ['pendiente', 'fallida'].includes(this.estado);
};

Transaccion.prototype.calcularComisionTotal = function() {
  const comisiones = this.comisiones || {};
  let total = 0;
  
  if (comisiones.plataforma) total += comisiones.plataforma.monto || 0;
  if (comisiones.blockchain) {
    total += comisiones.blockchain.gas_fee || 0;
    total += comisiones.blockchain.network_fee || 0;
  }
  if (comisiones.procesamiento) total += comisiones.procesamiento.monto || 0;
  
  return total;
};

Transaccion.prototype.getMontoNeto = function() {
  return this.monto - this.calcularComisionTotal();
};

Transaccion.prototype.agregarEvento = async function(evento) {
  const eventos = this.blockchain_data.events_emitted || [];
  eventos.push({
    ...evento,
    timestamp: new Date()
  });
  this.blockchain_data.events_emitted = eventos;
  await this.save();
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Transaccion.findByHash = async function(transactionHash) {
  return await this.findOne({
    where: {
      'blockchain_data.transaction_hash': transactionHash
    }
  });
};

Transaccion.findByUsuario = async function(usuarioId, limit = 50) {
  return await this.findAll({
    where: { usuario_id: usuarioId },
    order: [['fecha_creacion', 'DESC']],
    limit,
    include: ['usuario', 'token_relacionado']
  });
};

Transaccion.findPendientes = async function() {
  return await this.findAll({
    where: { 
      estado: ['pendiente', 'procesando'],
      intentos: {
        [sequelize.Op.lt]: sequelize.col('max_intentos')
      }
    },
    order: [['fecha_creacion', 'ASC']]
  });
};

Transaccion.findFallidas = async function() {
  return await this.findAll({
    where: { 
      estado: 'fallida',
      intentos: {
        [sequelize.Op.gte]: sequelize.col('max_intentos')
      }
    },
    order: [['fecha_creacion', 'DESC']]
  });
};

Transaccion.getEstadisticasPorTipo = async function(fechaInicio, fechaFin) {
  return await this.findAll({
    attributes: [
      'tipo',
      [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
      [sequelize.fn('SUM', sequelize.col('monto')), 'monto_total'],
      [sequelize.fn('AVG', sequelize.col('monto')), 'monto_promedio']
    ],
    where: {
      fecha_creacion: {
        [sequelize.Op.between]: [fechaInicio, fechaFin]
      },
      estado: 'confirmada'
    },
    group: ['tipo'],
    raw: true
  });
};

Transaccion.getVolumenDiario = async function(dias = 30) {
  const fechaInicio = new Date();
  fechaInicio.setDate(fechaInicio.getDate() - dias);
  
  return await this.findAll({
    attributes: [
      [sequelize.fn('DATE', sequelize.col('fecha_confirmacion')), 'fecha'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'transacciones'],
      [sequelize.fn('SUM', sequelize.col('monto')), 'volumen_total']
    ],
    where: {
      fecha_confirmacion: {
        [sequelize.Op.gte]: fechaInicio
      },
      estado: 'confirmada'
    },
    group: [sequelize.fn('DATE', sequelize.col('fecha_confirmacion'))],
    order: [[sequelize.fn('DATE', sequelize.col('fecha_confirmacion')), 'ASC']],
    raw: true
  });
};

Transaccion.crearTransaccionMinteo = async function(tokenData, usuarioId) {
  return await this.create({
    tipo: 'mint_token',
    usuario_id: usuarioId,
    token_id: tokenData.tokenId,
    produccion_id: tokenData.produccionId,
    monto: tokenData.cantidad,
    moneda: 'tCANE',
    detalles: {
      cantidad_tokens: tokenData.cantidad,
      co2_equivalente: tokenData.co2Equivalente,
      precio_base: tokenData.precioBase
    },
    metadata: {
      origen: 'sistema',
      batch_id: tokenData.batchId || null
    }
  });
};

Transaccion.crearTransaccionDistribucion = async function(distribucionData) {
  return await this.create({
    tipo: 'distribute_revenue',
    token_id: distribucionData.tokenId,
    monto: distribucionData.montoTotal,
    moneda: 'tCANE',
    detalles: {
      agricultor: distribucionData.agricultor,
      ingenio: distribucionData.ingenio,
      dao: distribucionData.dao
    },
    metadata: {
      origen: 'sistema',
      trigger: 'venta_token'
    }
  });
};

module.exports = Transaccion;