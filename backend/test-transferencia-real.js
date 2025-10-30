const fs = require('fs');

// Cargar wallets de testnet
const walletsData = JSON.parse(fs.readFileSync('../testnet-wallets.json', 'utf8'));

console.log('🚀 ===== TRANSFERENCIA REAL EN TESTNET =====\n');

async function ejecutarTransferenciaReal() {
    console.log('📋 PREPARACIÓN PARA TRANSFERENCIA REAL\n');
    
    // Mostrar información de las wallets
    console.log('💰 WALLETS DISPONIBLES:');
    console.log(`👨‍🌾 Tu Freighter: ${walletsData.user.publicKey}`);
    console.log(`🏭 Ingenio: ${walletsData.ingenio.publicKey}`);
    console.log(`🏦 Fondo de Ahorro: ${walletsData.fondoAhorro.publicKey}`);
    console.log(`🤖 Sistema: ${walletsData.system.publicKey}\n`);
    
    // Transferencia simulada que haremos
    const transferencia = {
        de: 'Sistema',
        dePublicKey: walletsData.system.publicKey,
        deSecretKey: walletsData.system.secretKey,
        a: 'Tu Freighter (Agricultor)',
        aPublicKey: walletsData.user.publicKey,
        monto: '100', // 100 XLM
        concepto: 'Pago por 1 token tCANE vendido'
    };
    
    console.log('📤 TRANSFERENCIA A EJECUTAR:');
    console.log(`De: ${transferencia.de}`);
    console.log(`A: ${transferencia.a}`);
    console.log(`Monto: ${transferencia.monto} XLM`);
    console.log(`Concepto: ${transferencia.concepto}\n`);
    
    console.log('🔧 INSTRUCCIONES PARA VER LA TRANSFERENCIA:\n');
    
    console.log('1️⃣ PREPARAR FREIGHTER:');
    console.log('   • Abre Freighter en tu navegador');
    console.log('   • Asegúrate de estar en TESTNET');
    console.log('   • Importa las wallets del sistema usando las secret keys\n');
    
    console.log('2️⃣ IMPORTAR WALLETS EN FREIGHTER:');
    console.log('   🏭 INGENIO:');
    console.log(`   Secret Key: ${walletsData.ingenio.secretKey}`);
    console.log(`   Nombre sugerido: "Ingenio San Miguel"\n`);
    
    console.log('   🏦 FONDO DE AHORRO:');
    console.log(`   Secret Key: ${walletsData.fondoAhorro.secretKey}`);
    console.log(`   Nombre sugerido: "Fondo de Ahorro"\n`);
    
    console.log('   🤖 SISTEMA:');
    console.log(`   Secret Key: ${walletsData.system.secretKey}`);
    console.log(`   Nombre sugerido: "Sistema Canacero"\n`);
    
    console.log('3️⃣ ABRIR EXPLORADORES (Opcional pero recomendado):');
    console.log('   • Stellar Expert para tu wallet:');
    console.log(`   https://stellar.expert/explorer/testnet/account/${walletsData.user.publicKey}\n`);
    console.log('   • Stellar Expert para wallet del sistema:');
    console.log(`   https://stellar.expert/explorer/testnet/account/${walletsData.system.publicKey}\n`);
    
    console.log('4️⃣ EJECUTAR TRANSFERENCIA REAL:');
    console.log('   ⚠️  IMPORTANTE: Esta será una transferencia REAL en testnet');
    console.log('   📱 La verás aparecer inmediatamente en Freighter');
    console.log('   🔗 También aparecerá en los exploradores de blockchain\n');
    
    // Simular el comando que ejecutaría la transferencia real
    console.log('💻 COMANDO PARA TRANSFERENCIA REAL:');
    console.log('   (Requiere stellar-sdk instalado y configurado)');
    console.log(`   
const StellarSdk = require('stellar-sdk');
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

async function transferir() {
    const sourceKeypair = StellarSdk.Keypair.fromSecret('${walletsData.system.secretKey}');
    const destinationId = '${walletsData.user.publicKey}';
    
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
    
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
    })
    .addOperation(StellarSdk.Operation.payment({
        destination: destinationId,
        asset: StellarSdk.Asset.native(),
        amount: '${transferencia.monto}',
    }))
    .addMemo(StellarSdk.Memo.text('${transferencia.concepto}'))
    .setTimeout(180)
    .build();
    
    transaction.sign(sourceKeypair);
    const result = await server.submitTransaction(transaction);
    console.log('✅ Transferencia exitosa:', result.hash);
}
`);
    
    console.log('\n🎯 RESULTADO ESPERADO:');
    console.log('   • Tu wallet Freighter recibirá +100 XLM');
    console.log('   • Wallet del sistema enviará -100 XLM');
    console.log('   • Verás la transacción en el historial de ambas wallets');
    console.log('   • El memo dirá: "Pago por 1 token tCANE vendido"\n');
    
    console.log('🔍 CÓMO VERIFICAR:');
    console.log('   1. En Freighter: Cambia entre las cuentas importadas');
    console.log('   2. En Stellar Expert: Refresh la página para ver nuevas transacciones');
    console.log('   3. En el explorador: Busca el hash de la transacción\n');
    
    console.log('⚡ ¿LISTO PARA EJECUTAR LA TRANSFERENCIA REAL?');
    console.log('   Si quieres proceder, necesito instalar stellar-sdk y ejecutar el código real.');
    console.log('   ¿Te parece bien que proceda con la transferencia de 100 XLM?\n');
    
    console.log('🛠️  COMANDOS ALTERNATIVOS:');
    console.log('   • Ver balances actuales: node check-balances.js');
    console.log('   • Simular flujo completo: node test-flujo-completo.js');
    console.log('   • Esta guía: node test-transferencia-real.js\n');
    
    console.log('📞 Si tienes algún problema importando las wallets, avísame!');
}

// Ejecutar la guía
ejecutarTransferenciaReal().catch(console.error);