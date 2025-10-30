// ============================================
// SERVICIO DE INTEGRACIÓN SOROBAN
// ============================================

const StellarSdk = require('stellar-sdk');
const logger = require('../config/logger');

// ============================================
// CONFIGURACIÓN DE RED STELLAR
// ============================================

class SorobanService {
  constructor() {
    this.server = process.env.STELLAR_NETWORK === 'testnet' 
      ? new StellarSdk.Server(process.env.STELLAR_HORIZON_URL)
      : new StellarSdk.Server('https://horizon.stellar.org');
    
    this.sorobanServer = process.env.STELLAR_NETWORK === 'testnet'
      ? new StellarSdk.SorobanRpc.Server(process.env.STELLAR_SOROBAN_RPC_URL)
      : new StellarSdk.SorobanRpc.Server('https://soroban-rpc.stellar.org');

    this.networkPassphrase = process.env.STELLAR_NETWORK === 'testnet'
      ? StellarSdk.Networks.TESTNET
      : StellarSdk.Networks.PUBLIC;

    // Cargar cuentas del sistema
    this.systemKeypair = StellarSdk.Keypair.fromSecret(process.env.SYSTEM_WALLET_SECRET);
    this.daoKeypair = StellarSdk.Keypair.fromSecret(process.env.DAO_WALLET_SECRET);

    // IDs de contratos
    this.tCANEContractId = process.env.TCANE_CONTRACT_ID;
    this.carbonRegistryContractId = process.env.CARBON_REGISTRY_CONTRACT_ID;
    this.paymentDistributorContractId = process.env.PAYMENT_DISTRIBUTOR_CONTRACT_ID;
  }

  // ============================================
  // CÁLCULO DE TOKENS Y VALOR
  // ============================================

  /**
   * Calcula tokens y valor basado en toneladas producidas
   * Regla: 1 tonelada = 1 token tCANE
   * @param {number} toneladas - Toneladas de caña producidas
   * @returns {Object} Resultado del cálculo
   */
  calcularTokensDesdeProduccion(toneladas) {
    try {
      // Conversión simple: 1 tonelada = 1 token
      const tokensGenerados = Math.floor(toneladas);
      
      // Precio base por token desde configuración
      const precioBaseUSD = parseFloat(process.env.TCANE_BASE_PRICE) || 15.00;
      
      // Valor total en USD
      const valorTotalUSD = tokensGenerados * precioBaseUSD;
      
      // Conversión a COP (aproximada, en producción usar API de cambio)
      const tasaCambio = 4200; // USD a COP aproximado
      const valorTotalCOP = valorTotalUSD * tasaCambio;

      return {
        toneladas_procesadas: toneladas,
        tokens_generados: tokensGenerados,
        precio_por_token_usd: precioBaseUSD,
        valor_total_usd: valorTotalUSD,
        valor_total_cop: valorTotalCOP,
        tasa_cambio_usada: tasaCambio,
        fecha_calculo: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error calculando tokens desde producción:', error);
      throw new Error(`Error en cálculo de tokens: ${error.message}`);
    }
  }

  // ============================================
  // DISTRIBUCIÓN DE PAGOS
  // ============================================

  /**
   * Calcula la distribución de pagos según especificación
   * 80% Agricultor, 10% Ingenio, 10% Fondo de Ahorro
   * @param {number} valorTotal - Valor total en COP
   * @returns {Object} Distribución de pagos
   */
  calcularDistribucionPagos(valorTotal) {
    const porcentajeAgricultor = parseFloat(process.env.AGRICULTOR_PERCENTAGE) || 80;
    const porcentajeIngenio = parseFloat(process.env.INGENIO_PERCENTAGE) || 10;
    const porcentajeFondoAhorro = parseFloat(process.env.FONDO_AHORRO_PERCENTAGE) || 10;

    return {
      agricultor: Math.round(valorTotal * (porcentajeAgricultor / 100)),
      ingenio: Math.round(valorTotal * (porcentajeIngenio / 100)),
      fondo_ahorro: Math.round(valorTotal * (porcentajeFondoAhorro / 100)),
      total: valorTotal,
      porcentajes: {
        agricultor: porcentajeAgricultor,
        ingenio: porcentajeIngenio,
        fondo_ahorro: porcentajeFondoAhorro
      }
    };
  }

  // ============================================
  // OPERACIONES DE CONTRATO tCANE
  // ============================================

  /**
   * Mintea tokens tCANE en el contrato basado en producción
   * @param {Object} produccionData - Datos de la producción
   * @returns {Promise<Object>} Resultado de la transacción
   */
  async mintearTokens(produccionData) {
    try {
      const { 
        produccion_id, 
        toneladas_producidas,
        agricultor_wallet, 
        ingenio_id,
        metadata 
      } = produccionData;

      // Calcular tokens y valor usando la nueva lógica
      const calculoTokens = this.calcularTokensDesdeProduccion(toneladas_producidas);
      const distribucionPagos = this.calcularDistribucionPagos(calculoTokens.valor_total_cop);

      // Construir transacción para mintear tokens
      const account = await this.server.loadAccount(this.systemKeypair.publicKey());
      
      // Preparar argumentos para el contrato
      const contractArgs = [
        StellarSdk.nativeToScVal(produccion_id, { type: 'u64' }),
        StellarSdk.nativeToScVal(Math.round(calculoTokens.tokens_generados * 1000000), { type: 'u64' }), // 6 decimales
        StellarSdk.nativeToScVal(Math.round(toneladas_producidas * 1000000), { type: 'u64' }),
        StellarSdk.nativeToScVal(agricultor_wallet, { type: 'address' }),
        StellarSdk.nativeToScVal(JSON.stringify({
          ...metadata,
          calculo_tokens: calculoTokens,
          distribucion_pagos: distribucionPagos,
          ingenio_id: ingenio_id
        }), { type: 'string' })
      ];

      // Crear operación de invocación de contrato
      const operation = StellarSdk.Operation.invokeContract({
        contract: this.tCANEContractId,
        function: 'mint_tokens',
        args: contractArgs
      });

      // Construir y simular transacción
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simular transacción
      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Simulation failed: ${simulationResult.error}`);
      }

      // Preparar transacción para envío
      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      );

      // Firmar transacción
      preparedTransaction.sign(this.systemKeypair);

      // Enviar transacción
      const sendResult = await this.sorobanServer.sendTransaction(preparedTransaction);
      
      if (sendResult.status === 'ERROR') {
        throw new Error(`Transaction failed: ${sendResult.errorResultXdr}`);
      }

      // Esperar confirmación
      const getTransactionResult = await this.sorobanServer.getTransaction(sendResult.hash);
      
      logger.blockchain(`Tokens minteados exitosamente - Hash: ${sendResult.hash}`);

      return {
        success: true,
        transaction_hash: sendResult.hash,
        token_id: `tCANE_${produccion_id}_${Date.now()}`,
        tokens_generados: calculoTokens.tokens_generados,
        valor_total_usd: calculoTokens.valor_total_usd,
        valor_total_cop: calculoTokens.valor_total_cop,
        distribucion_pagos: distribucionPagos,
        block_number: getTransactionResult.ledger,
        gas_used: simulationResult.cost?.cpuInsns || 0,
        metadata: {
          toneladas_procesadas: toneladas_producidas,
          precio_por_token: calculoTokens.precio_por_token_usd,
          ingenio_id: ingenio_id
        }
      };

    } catch (error) {
      logger.error('Error minteando tokens en Soroban:', error);
      throw new Error(`Error en minteo de tokens: ${error.message}`);
    }
  }

  // ============================================
  // TRANSFERENCIA DE TOKENS
  // ============================================

  /**
   * Distribuye pagos automáticamente según los porcentajes configurados
   * @param {Object} distribucionData - Datos de la distribución
   * @returns {Promise<Object>} Resultado de la distribución
   */
  async distribuirPagos(distribucionData) {
    try {
      const {
        token_id,
        valor_total_cop,
        agricultor_wallet,
        ingenio_wallet,
        fondo_ahorro_wallet,
        metadata = {}
      } = distribucionData;

      // Calcular distribución
      const distribucion = this.calcularDistribucionPagos(valor_total_cop);

      const resultados = [];

      // Transferir al agricultor (80%)
      if (agricultor_wallet && distribucion.agricultor > 0) {
        const resultadoAgricultor = await this.transferirPago({
          destinatario: agricultor_wallet,
          cantidad: distribucion.agricultor,
          concepto: 'Pago por producción de caña - 80%',
          token_id,
          metadata: {
            ...metadata,
            tipo_beneficiario: 'agricultor',
            porcentaje: 80
          }
        });
        resultados.push({
          tipo: 'agricultor',
          wallet: agricultor_wallet,
          cantidad: distribucion.agricultor,
          resultado: resultadoAgricultor
        });
      }

      // Transferir al ingenio (10%)
      if (ingenio_wallet && distribucion.ingenio > 0) {
        const resultadoIngenio = await this.transferirPago({
          destinatario: ingenio_wallet,
          cantidad: distribucion.ingenio,
          concepto: 'Comisión por procesamiento - 10%',
          token_id,
          metadata: {
            ...metadata,
            tipo_beneficiario: 'ingenio',
            porcentaje: 10
          }
        });
        resultados.push({
          tipo: 'ingenio',
          wallet: ingenio_wallet,
          cantidad: distribucion.ingenio,
          resultado: resultadoIngenio
        });
      }

      // Transferir al fondo de ahorro (10%)
      if (fondo_ahorro_wallet && distribucion.fondo_ahorro > 0) {
        const resultadoFondo = await this.transferirPago({
          destinatario: fondo_ahorro_wallet,
          cantidad: distribucion.fondo_ahorro,
          concepto: 'Fondo de ahorro comunitario - 10%',
          token_id,
          metadata: {
            ...metadata,
            tipo_beneficiario: 'fondo_ahorro',
            porcentaje: 10
          }
        });
        resultados.push({
          tipo: 'fondo_ahorro',
          wallet: fondo_ahorro_wallet,
          cantidad: distribucion.fondo_ahorro,
          resultado: resultadoFondo
        });
      }

      logger.blockchain(`Distribución de pagos completada para token ${token_id}`);

      return {
        success: true,
        token_id,
        valor_total_distribuido: valor_total_cop,
        distribucion_calculada: distribucion,
        transferencias_realizadas: resultados,
        fecha_distribucion: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error en distribución de pagos:', error);
      throw new Error(`Error en distribución de pagos: ${error.message}`);
    }
  }

  /**
   * Realiza una transferencia de pago individual
   * @param {Object} pagoData - Datos del pago
   * @returns {Promise<Object>} Resultado de la transferencia
   */
  async transferirPago(pagoData) {
    try {
      const {
        destinatario,
        cantidad,
        concepto,
        token_id,
        metadata = {}
      } = pagoData;

      // Construir transacción para transferir pago
      const account = await this.server.loadAccount(this.systemKeypair.publicKey());
      
      // Preparar argumentos para el contrato de distribución
      const contractArgs = [
        StellarSdk.nativeToScVal(destinatario, { type: 'address' }),
        StellarSdk.nativeToScVal(Math.round(cantidad * 100), { type: 'u64' }), // Centavos
        StellarSdk.nativeToScVal(token_id, { type: 'string' }),
        StellarSdk.nativeToScVal(concepto, { type: 'string' }),
        StellarSdk.nativeToScVal(JSON.stringify(metadata), { type: 'string' })
      ];

      // Crear operación de invocación de contrato
      const operation = StellarSdk.Operation.invokeContract({
        contract: this.paymentDistributorContractId,
        function: 'distribute_payment',
        args: contractArgs
      });

      // Construir y simular transacción
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simular transacción
      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Simulation failed: ${simulationResult.error}`);
      }

      // Preparar transacción para envío
      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      );

      // Firmar transacción
      preparedTransaction.sign(this.systemKeypair);

      // Enviar transacción
      const sendResult = await this.sorobanServer.sendTransaction(preparedTransaction);
      
      if (sendResult.status === 'ERROR') {
        throw new Error(`Transaction failed: ${sendResult.errorResultXdr}`);
      }

      // Esperar confirmación
      const getTransactionResult = await this.sorobanServer.getTransaction(sendResult.hash);

      return {
        success: true,
        transaction_hash: sendResult.hash,
        destinatario,
        cantidad_transferida: cantidad,
        concepto,
        block_number: getTransactionResult.ledger,
        gas_used: simulationResult.cost?.cpuInsns || 0
      };

    } catch (error) {
      logger.error('Error en transferencia de pago:', error);
      throw new Error(`Error en transferencia: ${error.message}`);
    }
  }

  /**
   * Transfiere tokens entre wallets
   * @param {string} fromWallet - Wallet origen
   * @param {string} toWallet - Wallet destino
   * @param {number} amount - Cantidad a transferir
   * @param {string} fromSecret - Clave privada del wallet origen
   * @returns {Promise<Object>} Resultado de la transacción
   */
  async transferirTokens(fromWallet, toWallet, amount, fromSecret) {
    try {
      const fromKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
      const account = await this.server.loadAccount(fromWallet);

      // Preparar argumentos para transferencia
      const contractArgs = [
        StellarSdk.nativeToScVal(fromWallet, { type: 'address' }),
        StellarSdk.nativeToScVal(toWallet, { type: 'address' }),
        StellarSdk.nativeToScVal(Math.round(amount * 1000000), { type: 'u64' }) // 6 decimales
      ];

      // Crear operación de transferencia
      const operation = StellarSdk.Operation.invokeContract({
        contract: this.tCANEContractId,
        function: 'transfer',
        args: contractArgs
      });

      // Construir transacción
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simular y enviar
      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Simulation failed: ${simulationResult.error}`);
      }

      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      );

      preparedTransaction.sign(fromKeypair);
      const sendResult = await this.sorobanServer.sendTransaction(preparedTransaction);

      logger.blockchain(`Tokens transferidos - De: ${fromWallet} A: ${toWallet} Cantidad: ${amount}`);

      return {
        success: true,
        transaction_hash: sendResult.hash,
        from: fromWallet,
        to: toWallet,
        amount: amount
      };

    } catch (error) {
      logger.error('Error transfiriendo tokens:', error);
      throw new Error(`Error en transferencia: ${error.message}`);
    }
  }

  // ============================================
  // CONSULTA DE BALANCE
  // ============================================

  /**
   * Consulta el balance de tokens tCANE de una wallet
   * @param {string} walletAddress - Dirección de la wallet
   * @returns {Promise<Object>} Balance de la wallet
   */
  async consultarBalance(walletAddress) {
    try {
      // Preparar argumentos para consulta de balance
      const contractArgs = [
        StellarSdk.nativeToScVal(walletAddress, { type: 'address' })
      ];

      // Crear operación de consulta
      const operation = StellarSdk.Operation.invokeContract({
        contract: this.tCANEContractId,
        function: 'balance',
        args: contractArgs
      });

      // Construir transacción de solo lectura
      const account = await this.server.loadAccount(this.systemKeypair.publicKey());
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      // Simular para obtener resultado
      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Balance query failed: ${simulationResult.error}`);
      }

      // Extraer balance del resultado
      const balanceScVal = simulationResult.result?.retval;
      const balance = balanceScVal ? StellarSdk.scValToNative(balanceScVal) / 1000000 : 0;

      return {
        address: walletAddress,
        tcane_balance: balance,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error consultando balance:', error);
      throw new Error(`Error consultando balance: ${error.message}`);
    }
  }

  // ============================================
  // REGISTRO DE CARBONO
  // ============================================

  /**
   * Registra créditos de carbono en el registro
   * @param {Object} carbonData - Datos del crédito de carbono
   * @returns {Promise<Object>} Resultado del registro
   */
  async registrarCreditoCarbono(carbonData) {
    try {
      const {
        produccion_id,
        co2_absorbido,
        metodologia,
        certificaciones,
        ubicacion,
        periodo
      } = carbonData;

      const account = await this.server.loadAccount(this.systemKeypair.publicKey());

      const contractArgs = [
        StellarSdk.nativeToScVal(produccion_id, { type: 'u64' }),
        StellarSdk.nativeToScVal(Math.round(co2_absorbido * 1000000), { type: 'u64' }),
        StellarSdk.nativeToScVal(metodologia, { type: 'string' }),
        StellarSdk.nativeToScVal(JSON.stringify(certificaciones), { type: 'string' }),
        StellarSdk.nativeToScVal(ubicacion, { type: 'string' }),
        StellarSdk.nativeToScVal(periodo, { type: 'string' })
      ];

      const operation = StellarSdk.Operation.invokeContract({
        contract: this.carbonRegistryContractId,
        function: 'register_carbon_credit',
        args: contractArgs
      });

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Carbon registration failed: ${simulationResult.error}`);
      }

      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      );

      preparedTransaction.sign(this.systemKeypair);
      const sendResult = await this.sorobanServer.sendTransaction(preparedTransaction);

      logger.blockchain(`Crédito de carbono registrado - Producción: ${produccion_id}`);

      return {
        success: true,
        transaction_hash: sendResult.hash,
        carbon_credit_id: `CC_${produccion_id}_${Date.now()}`,
        co2_registered: co2_absorbido
      };

    } catch (error) {
      logger.error('Error registrando crédito de carbono:', error);
      throw new Error(`Error en registro de carbono: ${error.message}`);
    }
  }

  // ============================================
  // DISTRIBUCIÓN DE PAGOS
  // ============================================

  /**
   * Ejecuta la distribución de pagos automática
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Resultado de la distribución
   */
  async ejecutarDistribucionPagos(paymentData) {
    try {
      const {
        token_id,
        valor_total,
        agricultor_wallet,
        ingenio_wallet,
        distribucion
      } = paymentData;

      const account = await this.server.loadAccount(this.systemKeypair.publicKey());

      const contractArgs = [
        StellarSdk.nativeToScVal(token_id, { type: 'string' }),
        StellarSdk.nativeToScVal(valor_total, { type: 'u64' }),
        StellarSdk.nativeToScVal(agricultor_wallet, { type: 'address' }),
        StellarSdk.nativeToScVal(ingenio_wallet, { type: 'address' }),
        StellarSdk.nativeToScVal(this.daoKeypair.publicKey(), { type: 'address' }),
        StellarSdk.nativeToScVal(distribucion.agricultor, { type: 'u64' }),
        StellarSdk.nativeToScVal(distribucion.ingenio, { type: 'u64' }),
        StellarSdk.nativeToScVal(distribucion.dao, { type: 'u64' })
      ];

      const operation = StellarSdk.Operation.invokeContract({
        contract: this.paymentDistributorContractId,
        function: 'distribute_payment',
        args: contractArgs
      });

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(300)
        .build();

      const simulationResult = await this.sorobanServer.simulateTransaction(transaction);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(simulationResult)) {
        throw new Error(`Payment distribution failed: ${simulationResult.error}`);
      }

      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        transaction,
        simulationResult
      );

      preparedTransaction.sign(this.systemKeypair);
      const sendResult = await this.sorobanServer.sendTransaction(preparedTransaction);

      logger.blockchain(`Distribución de pagos ejecutada - Token: ${token_id}`);

      return {
        success: true,
        transaction_hash: sendResult.hash,
        distributions: {
          agricultor: distribucion.agricultor,
          ingenio: distribucion.ingenio,
          dao: distribucion.dao
        }
      };

    } catch (error) {
      logger.error('Error ejecutando distribución de pagos:', error);
      throw new Error(`Error en distribución de pagos: ${error.message}`);
    }
  }
}

// Exportar instancia singleton
module.exports = new SorobanService();