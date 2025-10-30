// ============================================
// MODELO AGRICULTOR - PRODUCTORES DE CAÑA
// ============================================

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Agricultor = sequelize.define('Agricultor', {
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
  
  ingenio_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ingenios',
      key: 'id'
    }
  },
  
  // Información personal
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  apellidos: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  cedula: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  
  telefono: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Información de la finca
  nombre_finca: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  ubicacion: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
    validate: {
      hasRequiredFields(value) {
        if (!value.municipio || !value.departamento) {
          throw new Error('La ubicación debe incluir municipio y departamento');
        }
      }
    }
  },
  
  hectareas_totales: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.1
    }
  },
  
  hectareas_cana: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.1
    }
  },
  
  // Información bancaria para pagos
  banco: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  numero_cuenta: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  tipo_cuenta: {
    type: DataTypes.ENUM('ahorros', 'corriente'),
    allowNull: true
  },
  
  // ID interno del ingenio para este agricultor
  id_ingenio_interno: {
    type: DataTypes.STRING,
    allowNull: false
  },
  
  // Estado del agricultor
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo', 'suspendido'),
    defaultValue: 'activo'
  },
  
  // Certificaciones
  certificaciones: {
    type: DataTypes.JSONB,
    defaultValue: {
      organico: false,
      comercio_justo: false,
      rainforest_alliance: false,
      otras: []
    }
  },
  
  // Estadísticas
  total_producciones: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  total_toneladas: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  
  total_tokens_generados: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  total_ingresos: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'agricultores',
  indexes: [
    {
      unique: true,
      fields: ['cedula']
    },
    {
      unique: true,
      fields: ['ingenio_id', 'id_ingenio_interno']
    },
    {
      fields: ['ingenio_id']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['ubicacion'],
      using: 'gin'
    }
  ],
  
  // Validaciones a nivel de modelo
  validate: {
    hectareasValidas() {
      if (this.hectareas_cana > this.hectareas_totales) {
        throw new Error('Las hectáreas de caña no pueden ser mayores a las hectáreas totales');
      }
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Agricultor.prototype.getNombreCompleto = function() {
  return `${this.nombre} ${this.apellidos}`;
};

Agricultor.prototype.getUbicacionCompleta = function() {
  const { municipio, departamento, vereda } = this.ubicacion;
  return vereda 
    ? `${vereda}, ${municipio}, ${departamento}`
    : `${municipio}, ${departamento}`;
};

Agricultor.prototype.calcularPromedioProduccion = function() {
  if (this.total_producciones === 0) return 0;
  return this.total_toneladas / this.total_producciones;
};

Agricultor.prototype.calcularRendimientoPorHectarea = function() {
  if (this.hectareas_cana === 0) return 0;
  return this.total_toneladas / this.hectareas_cana;
};

Agricultor.prototype.actualizarEstadisticas = async function(nuevaProduccion) {
  this.total_producciones += 1;
  this.total_toneladas = parseFloat(this.total_toneladas) + parseFloat(nuevaProduccion.toneladas);
  this.total_tokens_generados = parseFloat(this.total_tokens_generados) + parseFloat(nuevaProduccion.tokens_generados || 0);
  
  await this.save();
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Agricultor.findByIngenio = async function(ingenioId) {
  return await this.findAll({
    where: { 
      ingenio_id: ingenioId,
      estado: 'activo'
    },
    include: ['usuario']
  });
};

Agricultor.findByCedula = async function(cedula) {
  return await this.findOne({
    where: { cedula },
    include: ['usuario', 'ingenio']
  });
};

Agricultor.getTopProductores = async function(limit = 10) {
  return await this.findAll({
    where: { estado: 'activo' },
    order: [['total_toneladas', 'DESC']],
    limit,
    include: ['usuario', 'ingenio']
  });
};

module.exports = Agricultor;