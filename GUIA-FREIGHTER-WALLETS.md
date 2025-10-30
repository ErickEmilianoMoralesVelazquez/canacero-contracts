# 🔗 GUÍA: Conectar y Ver Movimientos en Freighter

## 🎯 Objetivo
Conectarte a todas las wallets del sistema Canacero para ver transacciones y movimientos en tiempo real.

---

## 🏦 Wallets del Sistema Disponibles

### 1. 👨‍🌾 Tu Wallet Principal (Ya tienes acceso)
```
Public Key: GDZZDMEMJB4EBY3VUYNPYTIXSNXUUIU66JUR3SG6S4G6E5WPKIBXEO2B
Status: ✅ Ya conectada en tu Freighter
Balance: 10,000 XLM
```

### 2. 🏭 Wallet del Ingenio
```
Public Key: GAE2RPHKKE3FODLZQMTRYDF6ZF5UMUCQ3336X3PQMQZBSVUFX5EOK7YD
Secret Key: SCFMCVOLJVFPEMNTQ7ISOP7TZ5ZFUGPLJYHM6UC3M35LHX7LKX5BDIX6
Balance: 10,000 XLM
```

### 3. 🏦 Wallet del Fondo de Ahorro
```
Public Key: GAYD6EE47NUDQD7UTDYMKXJ7YRXOCVHD7TDZTMXB6Q7J5PRHCN4TSIFM
Secret Key: SAVVMTLJRWDBA5E7DQVGCNWVUU6KBSF6A5QJPL4536MQXCLSD6WQZTUB
Balance: 10,000 XLM
```

### 4. 🤖 Wallet del Sistema
```
Public Key: GAVJLREQ2JCKDTU7PMDCFX3DWVHUJIZYWA6K4HQ7YGMZEY3AXLHC2V6X
Secret Key: SDFWI4EDZZ43PNUKKJKSCVJVFCBHGXKGQ6RUYGJWYHKF4ZSB2J5QKZV5
Balance: 10,000 XLM
```

---

## 🔧 Cómo Importar Wallets en Freighter

### Método 1: Importar por Secret Key (Recomendado)

1. **Abrir Freighter**
   - Haz clic en la extensión de Freighter
   - Ve a "Settings" (⚙️)

2. **Agregar Nueva Cuenta**
   - Clic en "Add Account"
   - Selecciona "Import using secret key"

3. **Importar Wallet del Ingenio**
   ```
   Secret Key: SCFMCVOLJVFPEMNTQ7ISOP7TZ5ZFUGPLJYHM6UC3M35LHX7LKX5BDIX6
   Account Name: "Ingenio San Miguel"
   ```

4. **Importar Wallet del Fondo**
   ```
   Secret Key: SAVVMTLJRWDBA5E7DQVGCNWVUU6KBSF6A5QJPL4536MQXCLSD6WQZTUB
   Account Name: "Fondo de Ahorro"
   ```

5. **Importar Wallet del Sistema**
   ```
   Secret Key: SDFWI4EDZZ43PNUKKJKSCVJVFCBHGXKGQ6RUYGJWYHKF4ZSB2J5QKZV5
   Account Name: "Sistema Canacero"
   ```

### Método 2: Solo Observar (Watch-only)

Si solo quieres ver movimientos sin poder enviar:

1. **En Freighter**
   - Settings → Add Account
   - Selecciona "Watch account"
   - Pega la Public Key
   - Asigna un nombre

---

## 👀 Cómo Ver Movimientos y Transacciones

### En Freighter
1. **Cambiar entre cuentas**
   - Clic en el dropdown de cuentas
   - Selecciona la wallet que quieres ver

2. **Ver historial**
   - En la cuenta seleccionada
   - Scroll hacia abajo para ver transacciones
   - Clic en cualquier transacción para detalles

### En Stellar Laboratory (Más detallado)
1. **Ir a**: https://laboratory.stellar.org/
2. **Account Viewer**
   - Pega cualquier Public Key
   - Ve historial completo de transacciones
   - Detalles técnicos de cada operación

---

## 🧪 Probar Transferencias Entre Wallets

### Script para Transferencia Real
Voy a crear un script que haga una transferencia real entre las wallets:

```bash
# Ejecutar transferencia de prueba
node backend/test-transferencia-real.js
```

### Ver la Transferencia en Tiempo Real
1. **Antes de ejecutar**: Abre Freighter en ambas cuentas
2. **Ejecuta el script**: La transferencia aparecerá inmediatamente
3. **Verifica**: Ambas wallets mostrarán el movimiento

---

## 📱 Monitoreo en Tiempo Real

### Opción 1: Stellar Expert (Recomendado)
```
https://stellar.expert/explorer/testnet/account/[PUBLIC_KEY]
```

Reemplaza `[PUBLIC_KEY]` con cualquiera de las public keys del sistema.

### Opción 2: StellarChain
```
https://testnet.stellarchain.io/accounts/[PUBLIC_KEY]
```

### Opción 3: Horizon API Directo
```bash
# Ver transacciones de una cuenta
curl "https://horizon-testnet.stellar.org/accounts/GDZZDMEMJB4EBY3VUYNPYTIXSNXUUIU66JUR3SG6S4G6E5WPKIBXEO2B/transactions"
```

---

## 🔄 Flujo de Prueba Completo

### 1. Preparación
```bash
# Importar todas las wallets en Freighter
# Abrir múltiples pestañas del explorador
# Tener Stellar Expert abierto para cada wallet
```

### 2. Ejecutar Transferencia
```bash
cd backend
node test-transferencia-real.js
```

### 3. Observar en Tiempo Real
- **Freighter**: Cambiar entre cuentas para ver balances
- **Stellar Expert**: Refresh para ver nuevas transacciones
- **Terminal**: Ver confirmaciones del script

---

## 🚨 Importante: Seguridad

### ⚠️ Solo para Testnet
- Estas claves son SOLO para testnet
- NUNCA uses estas claves en mainnet
- Los XLM de testnet no tienen valor real

### 🔐 En Producción
- Generar nuevas claves para mainnet
- Usar hardware wallets para fondos importantes
- Implementar multi-sig para wallets del sistema

---

## 🛠️ Comandos Útiles

### Ver Balances Actuales
```bash
node backend/check-balances.js
```

### Hacer Transferencia de Prueba
```bash
node backend/test-transferencia-real.js
```

### Ver Configuración de Wallets
```bash
cat testnet-wallets.json
```

---

## 📞 Soporte

Si tienes problemas:

1. **Verificar Red**: Asegúrate que Freighter esté en "Testnet"
2. **Verificar Fondos**: Todas las wallets deben tener 10,000 XLM
3. **Verificar Claves**: Usa exactamente las claves proporcionadas
4. **Contacto**: Si algo no funciona, avísame inmediatamente

---

## 🎯 Próximo Paso

¿Quieres que cree un script que haga una transferencia real entre las wallets para que puedas verla en vivo en Freighter?