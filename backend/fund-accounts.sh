#!/bin/bash

echo "🚀 Financiando cuentas del sistema en testnet..."

# Wallets generadas
INGENIO_PUBLIC="GAE2RPHKKE3FODLZQMTRYDF6ZF5UMUCQ3336X3PQMQZBSVUFX5EOK7YD"
FONDO_PUBLIC="GAYD6EE47NUDQD7UTDYMKXJ7YRXOCVHD7TDZTMXB6Q7J5PRHCN4TSIFM"
SYSTEM_PUBLIC="GAVJLREQ2JCKDTU7PMDCFX3DWVHUJIZYWA6K4HQ7YGMZEY3AXLHC2V6X"

echo ""
echo "🏭 Financiando wallet del Ingenio..."
curl -s "https://friendbot.stellar.org?addr=${INGENIO_PUBLIC}" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Ingenio financiado: ${INGENIO_PUBLIC}"
else
    echo "❌ Error financiando Ingenio"
fi

echo ""
echo "💰 Financiando wallet del Fondo de Ahorro..."
curl -s "https://friendbot.stellar.org?addr=${FONDO_PUBLIC}" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Fondo de Ahorro financiado: ${FONDO_PUBLIC}"
else
    echo "❌ Error financiando Fondo de Ahorro"
fi

echo ""
echo "🤖 Financiando wallet del Sistema..."
curl -s "https://friendbot.stellar.org?addr=${SYSTEM_PUBLIC}" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Sistema financiado: ${SYSTEM_PUBLIC}"
else
    echo "❌ Error financiando Sistema"
fi

echo ""
echo "🎉 ¡Todas las cuentas han sido financiadas con 10,000 XLM cada una!"
echo ""
echo "📋 Resumen de wallets:"
echo "   👤 Usuario (Freighter): GDZZDMEMJB4EBY3VUYNPYTIXSNXUUIU66JUR3SG6S4G6E5WPKIBXEO2B"
echo "   🏭 Ingenio: ${INGENIO_PUBLIC}"
echo "   💰 Fondo de Ahorro: ${FONDO_PUBLIC}"
echo "   🤖 Sistema: ${SYSTEM_PUBLIC}"
echo ""
echo "✅ ¡Listo para hacer pruebas!"