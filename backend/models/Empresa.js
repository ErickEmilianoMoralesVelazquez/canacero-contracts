// ============================================
// MODELO EMPRESA - COMPRADORES DE TOKENS
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Empresa = sequelize.define('Empresa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  usuario_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id'
    }
  },
  
  // Información de la empresa
  razon_social: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  nit: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  nombre_comercial: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Clasificación de la empresa
  sector_economico: {
    type: DataTypes.ENUM(
      'manufactura',
      'servicios',
      'tecnologia',
      'construccion',
      'transporte',
      'energia',
      'mineria',
      'agricultura',
      'comercio',
      'financiero',
      'otro'
    ),
    allowNull: false
  },
  
  tamaño_empresa: {
    type: DataTypes.ENUM('micro', 'pequeña', 'mediana', 'grande'),
    allowNull: false
  },
  
  // Información de contacto
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  email_contacto: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  
  sitio_web: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrl: true
    }
  },
  
  // Ubicación de la empresa
  ubicacion: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    validate: {
      hasRequiredFields(value) {
        if (!value.pais || !value.ciudad || !value.direccion) {
          throw new Error('La ubicación debe incluir país, ciudad y dirección');
        }
      }
    }
  },
  
  // Información sobre sostenibilidad
  objetivos_sostenibilidad: {
    type: DataTypes.JSONB,
    defaultValue: {
      net_zero_target: null, // Año objetivo para carbono neutro
      reduction_target: null, // % de reducción objetivo
      scope_1_emissions: 0, // Emisiones directas
      scope_2_emissions: 0, // Emisiones indirectas de energía
      scope_3_emissions: 0, // Otras emisiones indirectas
      certificaciones: []
    }
  },
  
  // Huella de carbono anual (toneladas CO2)
  huella_carbon_anual: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  // Presupuesto para compensación de carbono
  presupuesto_carbon: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  
  // Estado de la empresa
  estado: {
    type: DataTypes.ENUM('activa', 'inactiva', 'suspendida'),
    defaultValue: 'activa'
  },
  
  // Verificación de la empresa
  verificada: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  fecha_verificacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Estadísticas de compras
  total_tokens_comprados: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_co2_compensado: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  
  total_invertido: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  numero_transacciones: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Información de facturación
  informacion_facturacion: {
    type: DataTypes.JSONB,
    defaultValue: {},
    validate: {
      hasValidBillingInfo(value) {
        if (Object.keys(value).length > 0) {
          if (!value.direccion_facturacion || !value.contacto_facturacion) {
            throw new Error('La información de facturación debe incluir dirección y contacto');
          }
        }
      }
    }
  },
  
  // Preferencias de compra
  preferencias_compra: {
    type: DataTypes.JSONB,
    defaultValue: {
      precio_maximo_por_token: null,
      cantidad_minima: 1,
      cantidad_maxima: null,
      frecuencia_compra: 'mensual', // semanal, mensual, trimestral, anual
      auto_compra: false,
      regiones_preferidas: [],
      certificaciones_requeridas: []
    }
  }
}, {
  tableName: 'empresas',
  indexes: [
    {
      unique: true,
      fields: ['nit']
    },
    {
      fields: ['sector_economico']
    },
    {
      fields: ['tamaño_empresa']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['verificada']
    },
    {
      fields: ['ubicacion'],
      using: 'gin'
    },
    {
      fields: ['total_tokens_comprados']
    }
  ]
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Empresa.prototype.getUbicacionCompleta = function() {
  const { direccion, ciudad, pais } = this.ubicacion;
  return `${direccion}, ${ciudad}, ${pais}`;
};

Empresa.prototype.calcularHuellaCarbon = function() {
  const objetivos = this.objetivos_sostenibilidad;
  return (objetivos.scope_1_emissions || 0) + 
         (objetivos.scope_2_emissions || 0) + 
         (objetivos.scope_3_emissions || 0);
};

Empresa.prototype.calcularPorcentajeCompensado = function() {
  const huellaTotal = this.calcularHuellaCarbon();
  if (huellaTotal === 0) return 0;
  return (this.total_co2_compensado / huellaTotal) * 100;
};

Empresa.prototype.calcularPromedioCompra = function() {
  if (this.numero_transacciones === 0) return 0;
  return this.total_invertido / this.numero_transacciones;
};

Empresa.prototype.puedeComprar = function(cantidad, precioUnitario) {
  const costoTotal = cantidad * precioUnitario;
  const preferencias = this.preferencias_compra;
  
  // Verificar presupuesto
  if (this.presupuesto_carbon && costoTotal > this.presupuesto_carbon) {
    return { puede: false, razon: 'Excede el presupuesto disponible' };
  }
  
  // Verificar precio máximo
  if (preferencias.precio_maximo_por_token && precioUnitario > preferencias.precio_maximo_por_token) {
    return { puede: false, razon: 'Precio por token excede el máximo configurado' };
  }
  
  // Verificar cantidad mínima y máxima
  if (cantidad < preferencias.cantidad_minima) {
    return { puede: false, razon: `Cantidad mínima requerida: ${preferencias.cantidad_minima}` };
  }
  
  if (preferencias.cantidad_maxima && cantidad > preferencias.cantidad_maxima) {
    return { puede: false, razon: `Cantidad máxima permitida: ${preferencias.cantidad_maxima}` };
  }
  
  return { puede: true };
};

Empresa.prototype.actualizarEstadisticas = async function(transaccion) {
  this.total_tokens_comprados = parseFloat(this.total_tokens_comprados) + parseFloat(transaccion.cantidad);
  this.total_co2_compensado = parseFloat(this.total_co2_compensado) + parseFloat(transaccion.co2_compensado);
  this.total_invertido = parseFloat(this.total_invertido) + parseFloat(transaccion.monto_total);
  this.numero_transacciones += 1;
  
  await this.save();
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Empresa.findByNit = async function(nit) {
  return await this.findOne({
    where: { nit },
    include: ['usuario']
  });
};

Empresa.findBySector = async function(sector) {
  return await this.findAll({
    where: { 
      sector_economico: sector,
      estado: 'activa'
    },
    include: ['usuario']
  });
};

Empresa.getTopCompradores = async function(limit = 10) {
  return await this.findAll({
    where: { estado: 'activa' },
    order: [['total_tokens_comprados', 'DESC']],
    limit,
    include: ['usuario']
  });
};

Empresa.findConPresupuesto = async function(montoMinimo = 0) {
  return await this.findAll({
    where: {
      estado: 'activa',
      presupuesto_carbon: {
        [sequelize.Op.gte]: montoMinimo
      }
    },
    include: ['usuario']
  });
};

module.exports = Empresa;