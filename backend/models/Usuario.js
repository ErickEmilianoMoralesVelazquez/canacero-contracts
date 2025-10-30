// ============================================
// MODELO USUARIO - BASE PARA AUTENTICACIÓN
// ============================================

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  },
  
  tipo_usuario: {
    type: DataTypes.ENUM('agricultor', 'ingenio', 'empresa', 'admin'),
    allowNull: false
  },
  
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  email_verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  wallet_address: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      // Validar formato de dirección Stellar
      isValidStellarAddress(value) {
        if (value && !/^G[A-Z2-7]{55}$/.test(value)) {
          throw new Error('Dirección de wallet Stellar inválida');
        }
      }
    }
  },
  
  configuracion: {
    type: DataTypes.JSONB,
    defaultValue: {
      notificaciones: {
        email: true,
        transacciones: true,
        producciones: true
      },
      idioma: 'es',
      timezone: 'America/Mexico_City'
    }
  }
}, {
  tableName: 'usuarios',
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['tipo_usuario']
    },
    {
      fields: ['wallet_address']
    }
  ],
  
  // Hooks para encriptar password
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    },
    
    beforeUpdate: async (usuario) => {
      if (usuario.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    }
  }
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

Usuario.prototype.validarPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

Usuario.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

Usuario.prototype.actualizarUltimoAcceso = async function() {
  this.ultimo_acceso = new Date();
  await this.save();
};

// ============================================
// MÉTODOS DE CLASE
// ============================================

Usuario.findByEmail = async function(email) {
  return await this.findOne({
    where: { email: email.toLowerCase() }
  });
};

Usuario.findByWalletAddress = async function(walletAddress) {
  return await this.findOne({
    where: { wallet_address: walletAddress }
  });
};

module.exports = Usuario;