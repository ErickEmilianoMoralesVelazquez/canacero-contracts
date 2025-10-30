#!/usr/bin/env node

/**
 * Script simplificado para verificar balances usando la API de Horizon
 */

const fs = require('fs');
const path = require('path');

async function checkBalance(publicKey, name) {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${publicKey}`);
    
    if (response.ok) {
      const account = await response.json();
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      console.log(`💰 ${name}: ${xlmBalance.balance} XLM`);
      return parseFloat(xlmBalance.balance);
    } else {
      console.log(`❌ Error verificando ${name}: ${response.status}`);
      return 0;
    }
  } catch (error) {
    console.log(`❌ Error verificando ${name}: ${error.message}`);
    return 0;
  }
}

async function checkAllBalances() {
  console.log('🚀 Verificando balances de todas las wallets en testnet...\n');
  
  // Cargar configuración de wallets
  const walletsPath = path.join(__dirname, '../testnet-wallets.json');
  const wallets = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
  
  console.log('📋 Wallets configuradas:');
  console.log(`   👤 Usuario: ${wallets.user.publicKey}`);
  console.log(`   🏭 Ingenio: ${wallets.ingenio.publicKey}`);
  console.log(`   💰 Fondo: ${wallets.fondoAhorro.publicKey}`);
  console.log(`   🤖 Sistema: ${wallets.system.publicKey}`);
  
  console.log('\n💰 Balances actuales:');
  
  const userBalance = await checkBalance(wallets.user.publicKey, 'Usuario (Freighter)');
  const ingenioBalance = await checkBalance(wallets.ingenio.publicKey, 'Ingenio');
  const fondoBalance = await checkBalance(wallets.fondoAhorro.publicKey, 'Fondo de Ahorro');
  const systemBalance = await checkBalance(wallets.system.publicKey, 'Sistema');
  
  const totalBalance = userBalance + ingenioBalance + fondoBalance + systemBalance;
  
  console.log('\n📊 Resumen:');
  console.log(`   Total XLM: ${totalBalance.toFixed(2)} XLM`);
  console.log(`   Cuentas activas: ${[userBalance, ingenioBalance, fondoBalance, systemBalance].filter(b => b > 0).length}/4`);
  
  if (totalBalance > 30000) {
    console.log('\n✅ ¡Todas las cuentas están financiadas correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Las wallets están listas para usar');
    console.log('   2. Puedes hacer transferencias desde Freighter');
    console.log('   3. El sistema puede distribuir pagos automáticamente');
    console.log('   4. Listo para desplegar contratos tCANE');
  } else {
    console.log('\n⚠️  Algunas cuentas pueden necesitar más financiamiento');
  }
  
  return {
    user: userBalance,
    ingenio: ingenioBalance,
    fondo: fondoBalance,
    system: systemBalance,
    total: totalBalance
  };
}

// Ejecutar verificación
checkAllBalances()
  .then((balances) => {
    console.log('\n🎉 ¡Verificación completada!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });