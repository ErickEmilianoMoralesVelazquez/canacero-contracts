// ============================================
// MODELO TOKEN - GESTIÓN DE TOKENS tCANE
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Token = sequelize.define('Token', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  // Referencia a la producción que generó el token
  produccion_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'producciones',
      key: 'id'
    }
  },
  
  // Información básica del token
  token_id_blockchain: {
    type: DataTypes.STRING,
    allowNull: true, // Se llena cuando se minta en blockchain
    unique: true
  },
  
  // ID único del token en el sistema
  token_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  // Referencias
  agricultor_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  
  ingenio_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  
  empresa_propietaria: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  
  cantidad: {
    type: DataTypes.DECIMAL(12, 6),
    allowNull: false,
    validate: {
      min: 0.000001
    }
  },
  
  // Valores en diferentes monedas
  valor_usd: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  valor_cop: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Hash de transacciones
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  transaction_hash_venta: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Equivalencia en CO2
  co2_equivalente: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  
  // Precio y valoración
  precio_base: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10.00
  },
  
  precio_actual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10.00
  },
  
  valor_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  
  // Estado del token
  estado: {
    type: DataTypes.ENUM(
      'generado',        // Token calculado pero no minteado
      'minteado',        // Token creado en blockchain
      'disponible',      // Disponible para venta
      'reservado',       // Reservado por una empresa
      'vendido',         // Vendido y transferido
      'retirado',        // Retirado del mercado
      'expirado'         // Expirado (si aplica)
    ),
    defaultValue: 'disponible'
  },
  
  // Fechas importantes
  fecha_minteo: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  fecha_venta: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Información del blockchain
  blockchain_info: {
    type: DataTypes.JSONB,
    defaultValue: {
      contract_address: null,
      mint_transaction: null,
      mint_block: null,
      mint_timestamp: null,
      current_owner: null,
      transfer_history: []
    }
  },
  
  // Metadatos del token
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      origen: {
        agricultor_nombre: null,
        ingenio_nombre: null,
        ubicacion: null,
        fecha_produccion: null
      },
      certificaciones: [],
      calidad_cana: null,
      sostenibilidad: {
        practicas_organicas: false,
        certificacion_carbono: false,
        biodiversidad: false
      },
      trazabilidad: {
        lote_origen: null,
        proceso_conversion: null,
        verificaciones: []
      }
    }
  },
  
  // Fechas importantes
  fecha_generacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  fecha_minteo: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  fecha_vencimiento: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: () => {
      // Los tokens vencen en 5 años por defecto
      const fecha = new Date();
      fecha.setFullYear(fecha.getFullYear() + 5);
      return fecha;
    }
  },
  
  // Información de venta
  venta_info: {
    type: DataTypes.JSONB,
    defaultValue: {
      empresa_compradora: null,
      precio_venta: null,
      fecha_venta: null,
      transaction_hash: null,
      comision_plataforma: null,
      distribucion_realizada: false
    }
  },
  
  // Distribución de ingresos actualizada
  distribucion_ingresos: {
    type: DataTypes.JSONB,
    defaultValue: {
      agricultor: {
        porcentaje: 80,
        monto: 0,
        wallet_address: null,
        transferido: false,
        fecha_transferencia: null,
        transaction_hash: null
      },
      ingenio: {
        porcentaje: 10,
        monto: 0,
        wallet_address: null,
        transferido: false,
        fecha_transferencia: null,
        transaction_hash: null
      },
      fondo_ahorro: {
        porcentaje: 10,
        monto: 0,
        wallet_address: null,
        transferido: false,
        fecha_transferencia: null,
        transaction_hash: null
      }
    }
  },
  
  // Verificaciones y auditorías
  verificaciones: {
    type: DataTypes.JSONB,
    defaultValue: {
      calculo_co2_verificado: false,
      metadata_validada: false,
      blockchain_confirmado: false,
      auditoria_externa: false,
      certificacion_carbono: false
    }
  },
  
  // Historial de precios
  historial_precios: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'tokens',
  indexes: [
    {
      fields: ['produccion_id']
    },
    {
      fields: ['token_id_blockchain'],
      unique: true
    },
    {
      fields: ['estado']
    },
    {
      fields: ['fecha_generacion']
    },
    {
      fields: ['fecha_vencimiento']
    },
    {
      fields: ['precio_actual']
    },
    {
      fields: ['blockchain_info'],
      using: 'gin'
    },
    {
      fields: ['metadata'],
      using: 'gin'
    }
  ],
  
  // Hooks para cálculos automáticos
  hooks: {
    beforeCreate: (token) => {
      // Calcular valor total
      token.valor_total = token.cantidad * token.precio_actual;
      
      // Calcular distribución de ingresos
      token.distribucion_ingresos.agricultor.monto = token.valor_total * 0.70;
      token.distribucion_ingresos.ingenio.monto = token.valor_total * 0.20;
      token.distribucion_ingresos.dao.monto = token.valor_total * 0.10;
    },
    
    beforeUpdate: (token) => {
      // Recalcular si cambia el precio
      if (token.changed('precio_actual') || token.changed('cantidad')) {
        token.valor_total = token.cantidad * token.precio_actual;
        
        // Solo recalcular distribución si no se ha vendido
        if (token.estado !== 'vendido') {
          token.distribucion_ingresos.agricultor.monto = token.valor_total * 0.70;
          token.distribucion_ingresos.ingenio.monto = token.valor_total * 0.20;
          token.distribucion_ingresos.dao.monto = token.valor_total * 0.10;
        }
      }
      
      // Actualizar historial de precios
      if (token.changed('precio_actual')) {
        const historial = token.historial_precios || [];
        historial.push({
          precio: token.precio_actual,
          fecha: new Date(),
          motivo: 'actualizacion_mercado'
        });
        token.historial_precios = historial;
      }
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Token.prototype.marcarComoMinteado = async function(blockchainData) {
  this.estado = 'minteado';
  this.fecha_minteo = new Date();
  this.token_id_blockchain = blockchainData.tokenId;
  this.blockchain_info = {
    ...this.blockchain_info,
    contract_address: blockchainData.contractAddress,
    mint_transaction: blockchainData.transactionHash,
    mint_block: blockchainData.blockNumber,
    mint_timestamp: new Date(),
    current_owner: blockchainData.ownerAddress
  };
  this.verificaciones.blockchain_confirmado = true;
  
  // Cambiar a disponible si todas las verificaciones están completas
  if (this.verificaciones.calculo_co2_verificado && this.verificaciones.metadata_validada) {
    this.estado = 'disponible';
  }
  
  await this.save();
};

Token.prototype.marcarComoVendido = async function(ventaData) {
  this.estado = 'vendido';
  this.venta_info = {
    empresa_compradora: ventaData.empresaId,
    precio_venta: ventaData.precioVenta,
    fecha_venta: new Date(),
    transaction_hash: ventaData.transactionHash,
    comision_plataforma: ventaData.comision || 0,
    distribucion_realizada: false
  };
  
  // Recalcular distribución con precio de venta real
  const valorVenta = this.cantidad * ventaData.precioVenta;
  this.distribucion_ingresos.agricultor.monto = valorVenta * 0.70;
  this.distribucion_ingresos.ingenio.monto = valorVenta * 0.20;
  this.distribucion_ingresos.dao.monto = valorVenta * 0.10;
  
  await this.save();
};

Token.prototype.procesarDistribucion = async function(distribucionData) {
  // Marcar transferencias como realizadas
  if (distribucionData.agricultor) {
    this.distribucion_ingresos.agricultor.transferido = true;
    this.distribucion_ingresos.agricultor.fecha_transferencia = new Date();
    this.distribucion_ingresos.agricultor.transaction_hash = distribucionData.agricultor.txHash;
  }
  
  if (distribucionData.ingenio) {
    this.distribucion_ingresos.ingenio.transferido = true;
    this.distribucion_ingresos.ingenio.fecha_transferencia = new Date();
    this.distribucion_ingresos.ingenio.transaction_hash = distribucionData.ingenio.txHash;
  }
  
  if (distribucionData.dao) {
    this.distribucion_ingresos.dao.transferido = true;
    this.distribucion_ingresos.dao.fecha_transferencia = new Date();
    this.distribucion_ingresos.dao.transaction_hash = distribucionData.dao.txHash;
  }
  
  // Marcar distribución como realizada
  this.venta_info.distribucion_realizada = true;
  
  await this.save();
};

Token.prototype.actualizarPrecio = async function(nuevoPrecio, motivo = 'actualizacion_mercado') {
  const precioAnterior = this.precio_actual;
  this.precio_actual = nuevoPrecio;
  
  // El hook se encargará de actualizar el historial
  await this.save();
  
  return {
    precio_anterior: precioAnterior,
    precio_nuevo: nuevoPrecio,
    cambio_porcentual: ((nuevoPrecio - precioAnterior) / precioAnterior) * 100
  };
};

Token.prototype.estaVencido = function() {
  return this.fecha_vencimiento && new Date() > this.fecha_vencimiento;
};

Token.prototype.diasParaVencimiento = function() {
  if (!this.fecha_vencimiento) return null;
  const hoy = new Date();
  const diferencia = this.fecha_vencimiento - hoy;
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Token.findDisponibles = async function(limit = 50, filtros = {}) {
  const where = { estado: 'disponible' };
  
  if (filtros.precioMin) where.precio_actual = { [sequelize.Op.gte]: filtros.precioMin };
  if (filtros.precioMax) where.precio_actual = { [sequelize.Op.lte]: filtros.precioMax };
  if (filtros.cantidadMin) where.cantidad = { [sequelize.Op.gte]: filtros.cantidadMin };
  
  return await this.findAll({
    where,
    order: [['fecha_generacion', 'DESC']],
    limit,
    include: ['produccion_origen']
  });
};

Token.findByProduccion = async function(produccionId) {
  return await this.findAll({
    where: { produccion_id: produccionId },
    include: ['produccion_origen']
  });
};

Token.getEstadisticasMercado = async function() {
  return await this.findAll({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_tokens'],
      [sequelize.fn('SUM', sequelize.col('cantidad')), 'cantidad_total'],
      [sequelize.fn('AVG', sequelize.col('precio_actual')), 'precio_promedio'],
      [sequelize.fn('MIN', sequelize.col('precio_actual')), 'precio_minimo'],
      [sequelize.fn('MAX', sequelize.col('precio_actual')), 'precio_maximo'],
      [sequelize.fn('SUM', sequelize.col('valor_total')), 'valor_mercado_total']
    ],
    where: { estado: 'disponible' },
    raw: true
  });
};

Token.findPendientesMinteo = async function() {
  return await this.findAll({
    where: { 
      estado: 'generado',
      'verificaciones.calculo_co2_verificado': true,
      'verificaciones.metadata_validada': true
    },
    include: ['produccion_origen']
  });
};

Token.findVencidosProximamente = async function(dias = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + dias);
  
  return await this.findAll({
    where: {
      fecha_vencimiento: {
        [sequelize.Op.lte]: fechaLimite,
        [sequelize.Op.gt]: new Date()
      },
      estado: ['disponible', 'reservado']
    },
    order: [['fecha_vencimiento', 'ASC']]
  });
};

module.exports = Token;