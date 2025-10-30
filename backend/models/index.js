// ============================================
// ÍNDICE DE MODELOS - CONFIGURACIÓN Y RELACIONES
// ============================================

const sequelize = require('../config/database');

// Importar todos los modelos
const Usuario = require('./Usuario');
const Agricultor = require('./Agricultor');
const Ingenio = require('./Ingenio');
const Empresa = require('./Empresa');
const Produccion = require('./Produccion');
const Token = require('./Token');
const Transaccion = require('./Transaccion');
const HuellaCarbon = require('./HuellaCarbon');

// ============================================
// DEFINICIÓN DE RELACIONES
// ============================================

// Relaciones Usuario
Usuario.hasOne(Agricultor, { 
  foreignKey: 'usuario_id', 
  as: 'perfil_agricultor',
  onDelete: 'CASCADE'
});

Usuario.hasOne(Ingenio, { 
  foreignKey: 'usuario_id', 
  as: 'perfil_ingenio',
  onDelete: 'CASCADE'
});

Usuario.hasOne(Empresa, { 
  foreignKey: 'usuario_id', 
  as: 'perfil_empresa',
  onDelete: 'CASCADE'
});

Usuario.hasMany(Transaccion, { 
  foreignKey: 'usuario_id', 
  as: 'transacciones',
  onDelete: 'SET NULL'
});

// Relaciones Agricultor
Agricultor.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

Agricultor.belongsTo(Ingenio, { 
  foreignKey: 'ingenio_id', 
  as: 'ingenio_asociado' 
});

Agricultor.hasMany(Produccion, { 
  foreignKey: 'agricultor_id', 
  as: 'producciones',
  onDelete: 'CASCADE'
});

// Relaciones Ingenio
Ingenio.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

Ingenio.hasMany(Agricultor, { 
  foreignKey: 'ingenio_id', 
  as: 'agricultores_asociados',
  onDelete: 'SET NULL'
});

Ingenio.hasMany(Produccion, { 
  foreignKey: 'ingenio_id', 
  as: 'producciones_reportadas',
  onDelete: 'CASCADE'
});

// Relaciones Empresa
Empresa.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

Empresa.hasMany(HuellaCarbon, { 
  foreignKey: 'empresa_id', 
  as: 'huellas_carbono',
  onDelete: 'CASCADE'
});

Empresa.hasMany(Transaccion, { 
  foreignKey: 'usuario_id', 
  as: 'compras_tokens',
  scope: { tipo: 'purchase_token' }
});

// Relaciones Producción
Produccion.belongsTo(Agricultor, { 
  foreignKey: 'agricultor_id', 
  as: 'agricultor' 
});

Produccion.belongsTo(Ingenio, { 
  foreignKey: 'ingenio_id', 
  as: 'ingenio_reportador' 
});

Produccion.hasMany(Token, { 
  foreignKey: 'produccion_id', 
  as: 'tokens_generados',
  onDelete: 'CASCADE'
});

Produccion.hasMany(Transaccion, { 
  foreignKey: 'produccion_id', 
  as: 'transacciones_relacionadas',
  onDelete: 'SET NULL'
});

// Relaciones Token
Token.belongsTo(Produccion, { 
  foreignKey: 'produccion_id', 
  as: 'produccion_origen' 
});

Token.hasMany(Transaccion, { 
  foreignKey: 'token_id', 
  as: 'transacciones_token',
  onDelete: 'SET NULL'
});

// Relaciones Transacción
Transaccion.belongsTo(Usuario, { 
  foreignKey: 'usuario_id', 
  as: 'usuario' 
});

Transaccion.belongsTo(Token, { 
  foreignKey: 'token_id', 
  as: 'token_relacionado' 
});

Transaccion.belongsTo(Produccion, { 
  foreignKey: 'produccion_id', 
  as: 'produccion_relacionada' 
});

// Relaciones HuellaCarbon
HuellaCarbon.belongsTo(Empresa, { 
  foreignKey: 'empresa_id', 
  as: 'empresa' 
});



// ============================================
// EXPORTAR MODELOS Y SEQUELIZE
// ============================================

module.exports = {
  sequelize,
  Usuario,
  Agricultor,
  Ingenio,
  Empresa,
  Produccion,
  Token,
  Transaccion,
  HuellaCarbon
};