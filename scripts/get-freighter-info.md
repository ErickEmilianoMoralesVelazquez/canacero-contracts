# 🔑 Guía: Obtener datos de Freighter para Testnet

## Paso 1: Instalar Freighter
1. Ve a https://freighter.app/
2. Instala la extensión en tu navegador
3. Crea una nueva wallet o importa una existente

## Paso 2: Configurar Testnet
1. Abre Freighter (haz clic en el ícono de la extensión)
2. Haz clic en el menú hamburguesa (☰) o configuración
3. Selecciona **"Switch to Testnet"** o **"Testnet"**
4. Confirma el cambio

## Paso 3: Copiar tu Public Key
1. En la pantalla principal de Freighter
2. Verás tu dirección que empieza con `G...`
3. Haz clic en **"Copy"** o copia manualmente
4. **Esta es tu Public Key** - guárdala

## Paso 4: Obtener XLM de testnet (GRATIS)
Tienes 2 opciones:

### Opción A: Usar nuestro script automático
```bash
# En la terminal, desde la carpeta del proyecto:
cd /Users/aldairjsx/Documents/Hack/canacero-contracts
npm install stellar-sdk node-fetch
node scripts/setup-testnet.js TU_PUBLIC_KEY_AQUI
```

### Opción B: Manual
1. Ve a https://laboratory.stellar.org/#account-creator?network=test
2. Pega tu Public Key
3. Haz clic en "Create Account"
4. ¡Recibirás 10,000 XLM gratis!

## Paso 5: Verificar
1. En Freighter deberías ver tu balance de XLM
2. Si no aparece, espera unos segundos y refresca

## ✅ Información que necesito:
- **Public Key**: `G...` (56 caracteres)
- **Confirmación**: "Tengo XLM en testnet"

## 🚨 Importante:
- Usa SOLO testnet (no mainnet)
- El XLM de testnet es gratis y no tiene valor real
- Guarda tu seed phrase en un lugar seguro

---

**¿Ya tienes tu Public Key? ¡Compártela conmigo para continuar!**