// ============================================
// CONTROLADOR DE AUTENTICACIÓN
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Usuario, Agricultor, Ingenio, Empresa } = require('../models');
const logger = require('../config/logger');

// ============================================
// REGISTRO DE USUARIOS
// ============================================

const registrarUsuario = async (req, res) => {
  try {
    const { 
      email, 
      password, 
      tipo_usuario, 
      wallet_address,
      perfil_data 
    } = req.body;

    // Validar datos requeridos
    if (!email || !password || !tipo_usuario) {
      return res.status(400).json({
        success: false,
        message: 'Email, contraseña y tipo de usuario son requeridos'
      });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Crear usuario base
    const nuevoUsuario = await Usuario.create({
      email,
      password, // Se hashea automáticamente en el hook
      tipo_usuario,
      wallet_address,
      activo: true,
      email_verificado: false
    });

    // Crear perfil específico según el tipo
    let perfil = null;
    switch (tipo_usuario) {
      case 'agricultor':
        perfil = await Agricultor.create({
          usuario_id: nuevoUsuario.id,
          ...perfil_data
        });
        break;
      case 'ingenio':
        perfil = await Ingenio.create({
          usuario_id: nuevoUsuario.id,
          ...perfil_data
        });
        break;
      case 'empresa':
        perfil = await Empresa.create({
          usuario_id: nuevoUsuario.id,
          ...perfil_data
        });
        break;
    }

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: nuevoUsuario.id, 
        email: nuevoUsuario.email,
        tipo: tipo_usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    logger.info(`Usuario registrado: ${email} - Tipo: ${tipo_usuario}`);

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario: {
          id: nuevoUsuario.id,
          email: nuevoUsuario.email,
          tipo_usuario: nuevoUsuario.tipo_usuario,
          wallet_address: nuevoUsuario.wallet_address,
          activo: nuevoUsuario.activo
        },
        perfil,
        token
      }
    });

  } catch (error) {
    logger.error('Error en registro de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// LOGIN DE USUARIOS
// ============================================

const loginUsuario = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar datos requeridos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const usuario = await Usuario.findOne({ 
      where: { email },
      include: [
        { model: Agricultor, as: 'perfil_agricultor' },
        { model: Ingenio, as: 'perfil_ingenio' },
        { model: Empresa, as: 'perfil_empresa' }
      ]
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(403).json({
        success: false,
        message: 'Cuenta desactivada. Contacte al administrador'
      });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Actualizar último acceso
    await usuario.update({ ultimo_acceso: new Date() });

    // Generar token JWT
    const token = jwt.sign(
      { 
        userId: usuario.id, 
        email: usuario.email,
        tipo: usuario.tipo_usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Obtener perfil específico
    let perfil = null;
    switch (usuario.tipo_usuario) {
      case 'agricultor':
        perfil = usuario.perfil_agricultor;
        break;
      case 'ingenio':
        perfil = usuario.perfil_ingenio;
        break;
      case 'empresa':
        perfil = usuario.perfil_empresa;
        break;
    }

    logger.info(`Usuario logueado: ${email}`);

    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          wallet_address: usuario.wallet_address,
          activo: usuario.activo,
          email_verificado: usuario.email_verificado,
          ultimo_acceso: usuario.ultimo_acceso
        },
        perfil,
        token
      }
    });

  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// VERIFICAR TOKEN
// ============================================

const verificarToken = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.userId, {
      include: [
        { model: Agricultor, as: 'perfil_agricultor' },
        { model: Ingenio, as: 'perfil_ingenio' },
        { model: Empresa, as: 'perfil_empresa' }
      ]
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener perfil específico
    let perfil = null;
    switch (usuario.tipo_usuario) {
      case 'agricultor':
        perfil = usuario.perfil_agricultor;
        break;
      case 'ingenio':
        perfil = usuario.perfil_ingenio;
        break;
      case 'empresa':
        perfil = usuario.perfil_empresa;
        break;
    }

    res.json({
      success: true,
      data: {
        usuario: {
          id: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario,
          wallet_address: usuario.wallet_address,
          activo: usuario.activo,
          email_verificado: usuario.email_verificado
        },
        perfil
      }
    });

  } catch (error) {
    logger.error('Error verificando token:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================

const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    if (!password_actual || !password_nueva) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    const usuario = await Usuario.findByPk(req.userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(password_actual, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Actualizar contraseña
    await usuario.update({ password: password_nueva });

    logger.info(`Contraseña cambiada para usuario: ${usuario.email}`);

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    logger.error('Error cambiando contraseña:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ACTUALIZAR WALLET ADDRESS
// ============================================

const actualizarWallet = async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Dirección de wallet es requerida'
      });
    }

    // Validar formato de dirección Stellar
    if (!wallet_address.match(/^G[A-Z0-9]{55}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de dirección Stellar inválido'
      });
    }

    const usuario = await Usuario.findByPk(req.userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.update({ wallet_address });

    logger.info(`Wallet actualizada para usuario: ${usuario.email}`);

    res.json({
      success: true,
      message: 'Dirección de wallet actualizada exitosamente',
      data: {
        wallet_address
      }
    });

  } catch (error) {
    logger.error('Error actualizando wallet:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// LOGOUT
// ============================================

const logout = async (req, res) => {
  try {
    // En un sistema JWT stateless, el logout se maneja en el frontend
    // Aquí podríamos registrar el evento o invalidar el token si usáramos blacklist
    
    logger.info(`Usuario deslogueado: ${req.userEmail}`);

    res.json({
      success: true,
      message: 'Logout exitoso'
    });

  } catch (error) {
    logger.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  registrarUsuario,
  loginUsuario,
  verificarToken,
  cambiarPassword,
  actualizarWallet,
  logout
};