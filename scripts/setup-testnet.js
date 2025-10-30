#!/usr/bin/env node

/**
 * Script para configurar testnet y obtener XLM gratis
 * Uso: node scripts/setup-testnet.js <PUBLIC_KEY>
 */

const StellarSdk = require('stellar-sdk');
const fetch = require('node-fetch');

async function setupTestnet(publicKey) {
  try {
    console.log('🚀 Configurando testnet para:', publicKey);
    
    // Configurar servidor de testnet
    const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
    
    // 1. Verificar si la cuenta ya existe
    console.log('\n📋 Verificando cuenta...');
    try {
      const account = await server.loadAccount(publicKey);
      console.log('✅ Cuenta ya existe');
      console.log('💰 Balance actual:', account.balances[0].balance, 'XLM');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('⚠️  Cuenta no existe, creando con Friendbot...');
        
        // 2. Crear cuenta con Friendbot
        const friendbotUrl = `https://friendbot.stellar.org?addr=${publicKey}`;
        const response = await fetch(friendbotUrl);
        
        if (response.ok) {
          console.log('✅ Cuenta creada exitosamente');
          console.log('💰 Se han agregado 10,000 XLM de testnet');
        } else {
          throw new Error('Error creando cuenta con Friendbot');
        }
      } else {
        throw error;
      }
    }
    
    // 3. Verificar balance final
    console.log('\n🔍 Verificando balance final...');
    const finalAccount = await server.loadAccount(publicKey);
    const xlmBalance = finalAccount.balances.find(b => b.asset_type === 'native');
    
    console.log('✅ Configuración completada');
    console.log('📊 Balance final:', xlmBalance.balance, 'XLM');
    console.log('🔑 Public Key:', publicKey);
    console.log('🌐 Red: Testnet');
    
    // 4. Generar configuración para .env
    console.log('\n📝 Configuración para tu .env:');
    console.log('FREIGHTER_PUBLIC_KEY=' + publicKey);
    console.log('STELLAR_NETWORK=testnet');
    console.log('STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org');
    console.log('SOROBAN_RPC_URL=https://soroban-testnet.stellar.org');
    
    return {
      success: true,
      publicKey,
      balance: xlmBalance.balance,
      network: 'testnet'
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const publicKey = process.argv[2];
  
  if (!publicKey) {
    console.log('❌ Uso: node scripts/setup-testnet.js <PUBLIC_KEY>');
    console.log('📝 Ejemplo: node scripts/setup-testnet.js GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    process.exit(1);
  }
  
  if (!publicKey.startsWith('G') || publicKey.length !== 56) {
    console.log('❌ Public Key inválida. Debe empezar con G y tener 56 caracteres');
    process.exit(1);
  }
  
  setupTestnet(publicKey)
    .then(result => {
      if (result.success) {
        console.log('\n🎉 ¡Listo para usar testnet!');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error inesperado:', error);
      process.exit(1);
    });
}

module.exports = { setupTestnet };