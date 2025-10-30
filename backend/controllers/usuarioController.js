// ============================================
// CONTROLADOR DE USUARIOS
// ============================================

const { Usuario, Agricultor, Ingenio, Empresa } = require('../models');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

// ============================================
// OBTENER PERFIL DE USUARIO
// ============================================

const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Obtener perfil específico según tipo de usuario
    let perfilEspecifico = null;
    switch (usuario.tipo_usuario) {
      case 'agricultor':
        perfilEspecifico = await Agricultor.findOne({ 
          where: { usuario_id: req.userId },
          include: [{ model: Ingenio, as: 'ingenio_asociado' }]
        });
        break;
      case 'ingenio':
        perfilEspecifico = await Ingenio.findOne({ 
          where: { usuario_id: req.userId } 
        });
        break;
      case 'empresa':
        perfilEspecifico = await Empresa.findOne({ 
          where: { usuario_id: req.userId } 
        });
        break;
    }

    res.json({
      success: true,
      data: {
        usuario,
        perfil: perfilEspecifico
      }
    });

  } catch (error) {
    logger.error('Error obteniendo perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ACTUALIZAR PERFIL DE USUARIO
// ============================================

const actualizarPerfil = async (req, res) => {
  try {
    const { datos_usuario, datos_perfil } = req.body;

    const usuario = await Usuario.findByPk(req.userId);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar datos básicos del usuario
    if (datos_usuario) {
      const { email, configuracion } = datos_usuario;
      
      // Verificar si el email ya existe (si se está cambiando)
      if (email && email !== usuario.email) {
        const emailExiste = await Usuario.findOne({ 
          where: { 
            email, 
            id: { [Op.ne]: req.userId } 
          } 
        });
        
        if (emailExiste) {
          return res.status(400).json({
            success: false,
            message: 'El email ya está en uso'
          });
        }
      }

      await usuario.update({
        email: email || usuario.email,
        configuracion: configuracion || usuario.configuracion
      });
    }

    // Actualizar perfil específico
    if (datos_perfil) {
      let perfilActualizado = null;
      
      switch (usuario.tipo_usuario) {
        case 'agricultor':
          const agricultor = await Agricultor.findOne({ 
            where: { usuario_id: req.userId } 
          });
          if (agricultor) {
            perfilActualizado = await agricultor.update(datos_perfil);
          }
          break;
          
        case 'ingenio':
          const ingenio = await Ingenio.findOne({ 
            where: { usuario_id: req.userId } 
          });
          if (ingenio) {
            perfilActualizado = await ingenio.update(datos_perfil);
          }
          break;
          
        case 'empresa':
          const empresa = await Empresa.findOne({ 
            where: { usuario_id: req.userId } 
          });
          if (empresa) {
            perfilActualizado = await empresa.update(datos_perfil);
          }
          break;
      }
    }

    logger.info(`Perfil actualizado - Usuario: ${req.userId}`);

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error actualizando perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================

const cambiarContrasena = async (req, res) => {
  try {
    const { contrasena_actual, contrasena_nueva } = req.body;

    if (!contrasena_actual || !contrasena_nueva) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas'
      });
    }

    if (contrasena_nueva.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 6 caracteres'
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
    const contrasenaValida = await bcrypt.compare(contrasena_actual, usuario.password);
    if (!contrasenaValida) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta'
      });
    }

    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(contrasena_nueva, salt);

    await usuario.update({ password: hashedPassword });

    logger.info(`Contraseña cambiada - Usuario: ${req.userId}`);

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
// OBTENER USUARIOS (ADMIN)
// ============================================

const obtenerUsuarios = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      tipo_usuario, 
      activo, 
      email_verificado,
      buscar 
    } = req.query;

    // Solo admins pueden ver todos los usuarios
    if (req.userTipo !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta acción'
      });
    }

    const offset = (page - 1) * limit;
    const where = {};

    if (tipo_usuario) where.tipo_usuario = tipo_usuario;
    if (activo !== undefined) where.activo = activo === 'true';
    if (email_verificado !== undefined) where.email_verificado = email_verificado === 'true';
    
    if (buscar) {
      where.email = { [Op.iLike]: `%${buscar}%` };
    }

    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        usuarios,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ACTIVAR/DESACTIVAR USUARIO (ADMIN)
// ============================================

const toggleActivarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (req.userTipo !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta acción'
      });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.update({ activo });

    logger.info(`Usuario ${activo ? 'activado' : 'desactivado'} - ID: ${id}`);

    res.json({
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`
    });

  } catch (error) {
    logger.error('Error activando/desactivando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// VERIFICAR EMAIL (ADMIN)
// ============================================

const verificarEmail = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.userTipo !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para esta acción'
      });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    await usuario.update({ email_verificado: true });

    logger.info(`Email verificado - Usuario: ${id}`);

    res.json({
      success: true,
      message: 'Email verificado exitosamente'
    });

  } catch (error) {
    logger.error('Error verificando email:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// ============================================
// ESTADÍSTICAS DE USUARIOS
// ============================================

const obtenerEstadisticasUsuarios = async (req, res) => {
  try {
    // Estadísticas por tipo de usuario
    const porTipo = await Usuario.findAll({
      attributes: [
        'tipo_usuario',
        [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'cantidad']
      ],
      group: ['tipo_usuario'],
      raw: true
    });

    // Estadísticas por estado
    const porEstado = await Usuario.findAll({
      attributes: [
        'activo',
        [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'cantidad']
      ],
      group: ['activo'],
      raw: true
    });

    // Usuarios registrados por mes (últimos 12 meses)
    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - 12);

    const porMes = await Usuario.findAll({
      attributes: [
        [Usuario.sequelize.fn('DATE_TRUNC', 'month', Usuario.sequelize.col('createdAt')), 'mes'],
        [Usuario.sequelize.fn('COUNT', Usuario.sequelize.col('id')), 'cantidad']
      ],
      where: {
        createdAt: { [Op.gte]: fechaInicio }
      },
      group: [Usuario.sequelize.fn('DATE_TRUNC', 'month', Usuario.sequelize.col('createdAt'))],
      order: [[Usuario.sequelize.fn('DATE_TRUNC', 'month', Usuario.sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        por_tipo: porTipo,
        por_estado: porEstado,
        por_mes: porMes
      }
    });

  } catch (error) {
    logger.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  obtenerPerfil,
  actualizarPerfil,
  cambiarContrasena,
  obtenerUsuarios,
  toggleActivarUsuario,
  verificarEmail,
  obtenerEstadisticasUsuarios
};