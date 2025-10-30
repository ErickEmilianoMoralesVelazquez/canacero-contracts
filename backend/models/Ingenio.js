// ============================================
// MODELO INGENIO - PROCESADORES DE CAÑA
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ingenio = sequelize.define('Ingenio', {
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
  
  // Ubicación del ingenio
  ubicacion: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    validate: {
      hasRequiredFields(value) {
        if (!value.municipio || !value.departamento || !value.direccion) {
          throw new Error('La ubicación debe incluir municipio, departamento y dirección');
        }
      }
    }
  },
  
  // Capacidad de procesamiento
  capacidad_procesamiento_diaria: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 1
    }
  },
  
  capacidad_procesamiento_anual: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 1
    }
  },
  
  // Información legal y certificaciones
  licencia_ambiental: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  certificaciones: {
    type: DataTypes.JSONB,
    defaultValue: {
      iso_14001: false,
      iso_9001: false,
      fssc_22000: false,
      otras: []
    }
  },
  
  // Estado del ingenio
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo', 'suspendido'),
    defaultValue: 'activo'
  },
  
  // Configuración de reportes
  configuracion_reportes: {
    type: DataTypes.JSONB,
    defaultValue: {
      frecuencia: 'semanal', // diario, semanal, mensual
      formato: 'json',
      campos_requeridos: [
        'id_agricultor',
        'fecha_entrega',
        'toneladas',
        'calidad',
        'humedad'
      ],
      validaciones: {
        toneladas_min: 0.1,
        toneladas_max: 1000,
        humedad_max: 15
      }
    }
  },
  
  // Estadísticas
  total_agricultores: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  total_producciones_procesadas: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  total_toneladas_procesadas: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_tokens_facilitados: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  comision_total_ganada: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  
  // Información bancaria para recibir comisiones
  informacion_bancaria: {
    type: DataTypes.JSONB,
    defaultValue: {},
    validate: {
      hasValidBankInfo(value) {
        if (Object.keys(value).length > 0) {
          if (!value.banco || !value.numero_cuenta || !value.tipo_cuenta) {
            throw new Error('La información bancaria debe incluir banco, número de cuenta y tipo de cuenta');
          }
        }
      }
    }
  }
}, {
  tableName: 'ingenios',
  indexes: [
    {
      unique: true,
      fields: ['nit']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['ubicacion'],
      using: 'gin'
    },
    {
      fields: ['total_toneladas_procesadas']
    }
  ]
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Ingenio.prototype.getUbicacionCompleta = function() {
  const { direccion, municipio, departamento } = this.ubicacion;
  return `${direccion}, ${municipio}, ${departamento}`;
};

Ingenio.prototype.calcularPromedioProduccionDiaria = function() {
  // Asumiendo 300 días de operación al año
  const diasOperacion = 300;
  return this.total_toneladas_procesadas / diasOperacion;
};

Ingenio.prototype.calcularUtilizacionCapacidad = function() {
  const promediodiario = this.calcularPromedioProduccionDiaria();
  return (promediodiario / this.capacidad_procesamiento_diaria) * 100;
};

Ingenio.prototype.actualizarEstadisticas = async function(nuevaProduccion) {
  this.total_producciones_procesadas += 1;
  this.total_toneladas_procesadas = parseFloat(this.total_toneladas_procesadas) + parseFloat(nuevaProduccion.toneladas);
  this.total_tokens_facilitados = parseFloat(this.total_tokens_facilitados) + parseFloat(nuevaProduccion.tokens_generados || 0);
  
  // Calcular comisión (20% del valor de los tokens)
  const comision = parseFloat(nuevaProduccion.tokens_generados || 0) * 0.20;
  this.comision_total_ganada = parseFloat(this.comision_total_ganada) + comision;
  
  await this.save();
};

Ingenio.prototype.agregarAgricultor = async function() {
  this.total_agricultores += 1;
  await this.save();
};

Ingenio.prototype.removerAgricultor = async function() {
  if (this.total_agricultores > 0) {
    this.total_agricultores -= 1;
    await this.save();
  }
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Ingenio.findByNit = async function(nit) {
  return await this.findOne({
    where: { nit },
    include: ['usuario']
  });
};

Ingenio.getTopProcesadores = async function(limit = 10) {
  return await this.findAll({
    where: { estado: 'activo' },
    order: [['total_toneladas_procesadas', 'DESC']],
    limit,
    include: ['usuario']
  });
};

Ingenio.findByUbicacion = async function(departamento, municipio = null) {
  const whereClause = {
    estado: 'activo',
    'ubicacion.departamento': departamento
  };
  
  if (municipio) {
    whereClause['ubicacion.municipio'] = municipio;
  }
  
  return await this.findAll({
    where: whereClause,
    include: ['usuario']
  });
};

module.exports = Ingenio;