#!/usr/bin/env node

/**
 * Script de prueba para verificar transferencias en testnet
 */

const StellarSdk = require('stellar-sdk');
const fs = require('fs');
const path = require('path');

// Configurar para testnet
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

async function checkBalance(publicKey, name) {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    console.log(`💰 ${name}: ${xlmBalance.balance} XLM`);
    return parseFloat(xlmBalance.balance);
  } catch (error) {
    console.log(`❌ Error verificando ${name}: ${error.message}`);
    return 0;
  }
}

async function testTransfer(fromSecret, toPublic, amount, description) {
  try {
    console.log(`\n🔄 ${description}...`);
    
    // Crear keypair del remitente
    const sourceKeypair = StellarSdk.Keypair.fromSecret(fromSecret);
    
    // Cargar cuenta del remitente
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    // Crear transacción
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: toPublic,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        })
      )
      .setTimeout(30)
      .build();
    
    // Firmar transacción
    transaction.sign(sourceKeypair);
    
    // Enviar transacción
    const result = await server.submitTransaction(transaction);
    
    console.log(`✅ Transferencia exitosa: ${amount} XLM`);
    console.log(`   Hash: ${result.hash}`);
    
    return result;
    
  } catch (error) {
    console.log(`❌ Error en transferencia: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de transferencias en testnet...\n');
  
  // Cargar configuración de wallets
  const walletsPath = path.join(__dirname, '../testnet-wallets.json');
  const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
  
  console.log('📋 Wallets configuradas:');
  console.log(`   👤 Usuario: ${wallets.user.publicKey}`);
  console.log(`   🏭 Ingenio: ${wallets.ingenio.publicKey}`);
  console.log(`   💰 Fondo: ${wallets.fondoAhorro.publicKey}`);
  console.log(`   🤖 Sistema: ${wallets.system.publicKey}`);
  
  console.log('\n💰 Verificando balances iniciales...');
  await checkBalance(wallets.user.publicKey, 'Usuario (Freighter)');
  await checkBalance(wallets.ingenio.publicKey, 'Ingenio');
  await checkBalance(wallets.fondoAhorro.publicKey, 'Fondo de Ahorro');
  await checkBalance(wallets.system.publicKey, 'Sistema');
  
  // Prueba 1: Sistema → Usuario (simulando pago de tokens)
  console.log('\n🧪 PRUEBA 1: Sistema → Usuario (5 XLM)');
  await testTransfer(
    wallets.system.secretKey,
    wallets.user.publicKey,
    5,
    'Enviando pago de tokens del sistema al usuario'
  );
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Prueba 2: Sistema → Ingenio (simulando pago del 10%)
  console.log('\n🧪 PRUEBA 2: Sistema → Ingenio (1.5 XLM)');
  await testTransfer(
    wallets.system.secretKey,
    wallets.ingenio.publicKey,
    1.5,
    'Enviando 10% al ingenio'
  );
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Prueba 3: Sistema → Fondo de Ahorro (simulando pago del 10%)
  console.log('\n🧪 PRUEBA 3: Sistema → Fondo de Ahorro (1.5 XLM)');
  await testTransfer(
    wallets.system.secretKey,
    wallets.fondoAhorro.publicKey,
    1.5,
    'Enviando 10% al fondo de ahorro'
  );
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n💰 Verificando balances finales...');
  await checkBalance(wallets.user.publicKey, 'Usuario (Freighter)');
  await checkBalance(wallets.ingenio.publicKey, 'Ingenio');
  await checkBalance(wallets.fondoAhorro.publicKey, 'Fondo de Ahorro');
  await checkBalance(wallets.system.publicKey, 'Sistema');
  
  console.log('\n🎉 ¡Pruebas de transferencias completadas!');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Desplegar contratos tCANE en testnet');
  console.log('   2. Probar minteo de tokens');
  console.log('   3. Probar distribución automática de pagos');
  console.log('   4. Probar catálogo y compra de tokens');
}

// Ejecutar pruebas
runTests()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  });