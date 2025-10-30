#!/usr/bin/env node

/**
 * Script para generar wallets del sistema y configurar testnet
 */

const StellarSdk = require('stellar-sdk');
const fs = require('fs');
const path = require('path');

// Configurar para testnet
StellarSdk.Network.useTestNetwork();

async function fundAccount(publicKey) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    if (response.ok) {
      console.log(`✅ Cuenta ${publicKey} financiada con 10,000 XLM`);
      return true;
    } else {
      console.log(`⚠️  Error financiando cuenta ${publicKey}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

async function generateSystemWallets() {
  console.log('🚀 Generando wallets del sistema para testnet...\n');

  // Datos del usuario
  const userPublicKey = 'GDZZDMEMJB4EBY3VUYNPYTIXSNXUUIU66JUR3SG6S4G6E5WPKIBXEO2B';
  
  // Generar wallet para el ingenio
  const ingenioKeypair = StellarSdk.Keypair.random();
  console.log('🏭 Wallet del Ingenio:');
  console.log('   Public:', ingenioKeypair.publicKey());
  console.log('   Secret:', ingenioKeypair.secret());
  
  // Generar wallet para el fondo de ahorro
  const fondoKeypair = StellarSdk.Keypair.random();
  console.log('\n💰 Wallet del Fondo de Ahorro:');
  console.log('   Public:', fondoKeypair.publicKey());
  console.log('   Secret:', fondoKeypair.secret());
  
  // Generar wallet del sistema (para operaciones automáticas)
  const systemKeypair = StellarSdk.Keypair.random();
  console.log('\n🤖 Wallet del Sistema:');
  console.log('   Public:', systemKeypair.publicKey());
  console.log('   Secret:', systemKeypair.secret());
  
  console.log('\n📋 Financiando cuentas con Friendbot...');
  
  // Financiar todas las cuentas
  await fundAccount(ingenioKeypair.publicKey());
  await fundAccount(fondoKeypair.publicKey());
  await fundAccount(systemKeypair.publicKey());
  
  // Crear configuración para .env
  const envConfig = `# ============================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================
NODE_ENV=development
PORT=3001
API_VERSION=v1

# ============================================
# BASE DE DATOS
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conocero_db
DB_USER=postgres
DB_PASSWORD=password
DB_DIALECT=postgres

# ============================================
# AUTENTICACIÓN JWT
# ============================================
JWT_SECRET=tu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=tu_refresh_secret_aqui
JWT_REFRESH_EXPIRES_IN=30d

# ============================================
# BLOCKCHAIN - STELLAR/SOROBAN TESTNET
# ============================================
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract IDs (actualizar después del deploy)
CANACERO_CONTRACT_ID=CCONTRATO_PRINCIPAL_AQUI
DAO_CONTRACT_ID=CDAO_TREASURY_AQUI
TCANE_CONTRACT_ID=CTCANE_TOKEN_AQUI
REVENUE_SPLIT_CONTRACT_ID=CREVENUE_SPLIT_AQUI

# ============================================
# WALLETS DEL SISTEMA - TESTNET
# ============================================
# Usuario de prueba (Freighter)
USER_WALLET_PUBLIC=${userPublicKey}

# Wallet del sistema (para operaciones automáticas)
SYSTEM_WALLET_SECRET=${systemKeypair.secret()}
SYSTEM_WALLET_PUBLIC=${systemKeypair.publicKey()}

# Wallet del ingenio
INGENIO_WALLET_SECRET=${ingenioKeypair.secret()}
INGENIO_WALLET_PUBLIC=${ingenioKeypair.publicKey()}

# Wallet del fondo de ahorro
FONDO_AHORRO_WALLET_SECRET=${fondoKeypair.secret()}
FONDO_AHORRO_WALLET_PUBLIC=${fondoKeypair.publicKey()}

# ============================================
# CONVERSIÓN CO2 Y TOKENS
# ============================================
# 1 tonelada de caña = 1 token tCANE
TONELADAS_POR_TOKEN=1
# Precio base por token tCANE (en USD) - valor real del mercado de carbono
TCANE_BASE_PRICE=15.00

# ============================================
# DISTRIBUCIÓN DE PAGOS
# ============================================
# Porcentajes de distribución según especificación
AGRICULTOR_PERCENTAGE=80
INGENIO_PERCENTAGE=10
FONDO_AHORRO_PERCENTAGE=10

# ============================================
# SERVICIOS EXTERNOS
# ============================================
# API para precios de carbono
CARBON_PRICE_API_URL=https://api.carbonprices.com
CARBON_PRICE_API_KEY=tu_api_key_aqui

# Servicio de notificaciones
EMAIL_SERVICE=gmail
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_password_app

# ============================================
# SEGURIDAD
# ============================================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# LOGS
# ============================================
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log`;

  // Guardar configuración
  const envPath = path.join(__dirname, '.env.testnet');
  fs.writeFileSync(envPath, envConfig);
  
  console.log('\n✅ Configuración guardada en backend/.env.testnet');
  console.log('\n📝 Para usar esta configuración:');
  console.log('   cp .env.testnet .env');
  
  // Crear resumen
  const summary = {
    network: 'testnet',
    user: {
      publicKey: userPublicKey,
      balance: '10,000 XLM'
    },
    system: {
      publicKey: systemKeypair.publicKey(),
      secretKey: systemKeypair.secret()
    },
    ingenio: {
      publicKey: ingenioKeypair.publicKey(),
      secretKey: ingenioKeypair.secret()
    },
    fondoAhorro: {
      publicKey: fondoKeypair.publicKey(),
      secretKey: fondoKeypair.secret()
    }
  };
  
  const summaryPath = path.join(__dirname, '../testnet-wallets.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n💾 Resumen guardado en testnet-wallets.json');
  console.log('\n🎉 ¡Listo para hacer pruebas en testnet!');
  
  return summary;
}

// Ejecutar
generateSystemWallets()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });