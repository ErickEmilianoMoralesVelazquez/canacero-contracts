# 🌱 CANACERO BACKEND API

## 📋 Índice
- [🎯 Overview del Sistema](#-overview-del-sistema)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Instalación y Configuración](#-instalación-y-configuración)
- [🔗 API Endpoints](#-api-endpoints)
- [🔐 Autenticación](#-autenticación)
- [💰 Flujo de Tokens](#-flujo-de-tokens)
- [🌐 Integración Blockchain](#-integración-blockchain)
- [💻 Ejemplos Frontend](#-ejemplos-frontend)
- [🧪 Testing](#-testing)
- [🚀 Deployment](#-deployment)

---

## 🎯 Overview del Sistema

**Canacero** es una plataforma blockchain que tokeniza la captura de CO2 de la industria azucarera, permitiendo a las empresas compensar su huella de carbono comprando tokens tCANE respaldados por producción real de caña de azúcar.

### 🌟 Características Principales

- **🏭 Gestión de Ingenios**: Registro y validación de producción de caña
- **👨‍🌾 Portal de Agricultores**: Seguimiento de producciones y pagos
- **🏢 Marketplace Empresarial**: Compra de tokens para compensación de CO2
- **💰 Distribución Automática**: 80% agricultor, 10% ingenio, 10% fondo de ahorro
- **🔗 Blockchain Stellar**: Transacciones transparentes y verificables
- **📊 Dashboard Analytics**: Métricas en tiempo real

### 💡 Flujo del Negocio

1. **📈 Ingenio registra producción** → Toneladas de caña procesadas
2. **🔄 Sistema convierte a CO2** → 1 ton caña = 1.83 ton CO2 capturado
3. **🪙 Generación de tokens** → 1 token tCANE = 1 ton CO2
4. **🏪 Catálogo público** → Empresas ven tokens disponibles
5. **💳 Compra empresarial** → Pago automático en MXN/XLM
6. **💸 Distribución automática** → Pagos a todos los participantes

---

## 🏗️ Arquitectura

### 🛠️ Stack Tecnológico

```
Frontend (React/Vue/Angular)
         ↓
    Express.js API
         ↓
   PostgreSQL DB
         ↓
   Stellar Blockchain
```

### 📁 Estructura del Proyecto

```
backend/
├── 📁 config/           # Configuraciones (DB, Logger)
├── 📁 controllers/      # Lógica de negocio
├── 📁 middleware/       # Autenticación y validaciones
├── 📁 models/          # Modelos de base de datos
├── 📁 routes/          # Definición de endpoints
├── 📁 services/        # Servicios externos (Stellar)
├── 📄 server.js        # Servidor principal
└── 📄 .env            # Variables de entorno
```

### 🎭 Tipos de Usuario

- **👨‍🌾 Agricultor**: Propietario de la producción
- **🏭 Ingenio**: Procesador que registra producciones
- **🏢 Empresa**: Comprador de tokens para compensación
- **🤖 Sistema**: Operaciones automáticas

---

## 🚀 Instalación y Configuración

### 📋 Prerrequisitos

```bash
# Node.js 18+
node --version

# PostgreSQL 14+
psql --version

# Git
git --version
```

### ⚡ Instalación Rápida

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/canacero-contracts.git
cd canacero-contracts/backend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Configurar base de datos
createdb conocero_db
npm run migrate

# 5. Iniciar servidor
npm run dev
```

### 🔧 Variables de Entorno Críticas

```bash
# Servidor
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Base de datos
DB_HOST=localhost
DB_NAME=conocero_db
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_EXPIRES_IN=7d

# Stellar Testnet
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Wallets del sistema (Testnet)
SYSTEM_WALLET_SECRET=SXXX...
INGENIO_WALLET_SECRET=SXXX...
FONDO_AHORRO_WALLET_SECRET=SXXX...

# Precios y conversión
TCANE_BASE_PRICE_MXN=450.00
CO2_ABSORPTION_FACTOR=1.83
USD_TO_MXN_RATE=18.50

# Distribución de pagos
AGRICULTOR_PERCENTAGE=80
INGENIO_PERCENTAGE=10
FONDO_AHORRO_PERCENTAGE=10
```

---

## 🔗 API Endpoints

### 🌐 Base URL
```
http://localhost:3001/api/v1
```

### 🔐 Autenticación (`/auth`)

#### Registro de Usuario
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "tipo_usuario": "agricultor", // agricultor | ingenio | empresa
  "wallet_address": "GXXX...", // Opcional
  "telefono": "+52 123 456 7890",
  "direccion": "Calle 123, Ciudad"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "tipo_usuario": "agricultor"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Iniciar Sesión
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "password123"
}
```

#### Verificar Token
```http
GET /api/v1/auth/verify
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 📊 Producción (`/produccion`)

#### Registrar Producción (Solo Ingenios)
```http
POST /api/v1/produccion
Authorization: Bearer <token>
Content-Type: application/json

{
  "agricultor_id": 1,
  "toneladas_cana": 150.5,
  "calidad": "A",
  "fecha_cosecha": "2024-01-15",
  "ubicacion": "Campo Norte, Lote 12",
  "notas": "Cosecha de temporada alta"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "produccion": {
      "id": 1,
      "toneladas_cana": 150.5,
      "toneladas_co2_capturado": 275.415, // 150.5 * 1.83
      "tokens_generados": 150, // Redondeado
      "estado": "pendiente_validacion",
      "valor_estimado_mxn": 67500 // 150 * 450
    }
  }
}
```

#### Obtener Producciones
```http
GET /api/v1/produccion?page=1&limit=10&estado=validada
Authorization: Bearer <token>
```

#### Validar Producción (Solo Ingenios)
```http
PUT /api/v1/produccion/1/validar
Authorization: Bearer <token>
Content-Type: application/json

{
  "notas_validacion": "Producción verificada correctamente"
}
```

### 🪙 Tokens (`/token`)

#### Obtener Tokens Disponibles
```http
GET /api/v1/token/disponibles?page=1&limit=10
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "tokens": [
      {
        "id": 1,
        "produccion_id": 1,
        "cantidad_disponible": 150,
        "precio_unitario_mxn": 450,
        "agricultor": "Juan Pérez",
        "ingenio": "Ingenio San Miguel",
        "fecha_produccion": "2024-01-15",
        "calidad": "A"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

#### Comprar Tokens (Solo Empresas)
```http
POST /api/v1/token/comprar
Authorization: Bearer <token>
Content-Type: application/json

{
  "token_id": 1,
  "cantidad": 47,
  "huella_co2_compensar": 47, // Toneladas CO2 a compensar
  "metodo_pago": "stellar" // stellar | fiat
}
```

### 🏪 Catálogo (`/catalogo`)

#### Obtener Catálogo Público
```http
GET /api/v1/catalogo?page=1&limit=10&calidad=A
```

#### Calcular Compensación
```http
POST /api/v1/catalogo/calcular-compensacion
Content-Type: application/json

{
  "toneladas_co2": 47,
  "tipo_empresa": "manufactura", // manufactura | servicios | transporte
  "pais": "MX"
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "toneladas_co2": 47,
    "tokens_necesarios": 47,
    "costo_total_mxn": 21150,
    "costo_total_usd": 1143.24,
    "impacto_ambiental": "Equivale a plantar 1,081 árboles",
    "certificacion": "Certificado de compensación válido por 1 año"
  }
}
```

### 🔗 Blockchain (`/blockchain`)

#### Consultar Balance
```http
GET /api/v1/blockchain/balance
Authorization: Bearer <token>
```

#### Obtener Historial de Transacciones
```http
GET /api/v1/blockchain/transacciones?page=1&limit=10
Authorization: Bearer <token>
```

#### Mintear Tokens (Solo Ingenios)
```http
POST /api/v1/blockchain/mintear
Authorization: Bearer <token>
Content-Type: application/json

{
  "produccion_id": 1,
  "cantidad": 150
}
```

### 📈 Dashboard (`/dashboard`)

#### Estadísticas Generales
```http
GET /api/v1/dashboard/estadisticas
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "resumen": {
      "total_producciones": 25,
      "total_tokens_generados": 3750,
      "total_co2_capturado": 6862.5,
      "total_ventas_mxn": 1687500
    },
    "este_mes": {
      "producciones": 5,
      "tokens_vendidos": 230,
      "ingresos_mxn": 103500
    },
    "distribuciones": {
      "agricultores_mxn": 82800,
      "ingenios_mxn": 10350,
      "fondo_ahorro_mxn": 10350
    }
  }
}
```

---

## 🔐 Autenticación

### 🎫 JWT Token

Todos los endpoints protegidos requieren un token JWT en el header:

```javascript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Content-Type': 'application/json'
}
```

### 👥 Roles y Permisos

| Endpoint | Agricultor | Ingenio | Empresa | Admin |
|----------|------------|---------|---------|-------|
| `GET /produccion` | ✅ (propias) | ✅ (todas) | ❌ | ✅ |
| `POST /produccion` | ❌ | ✅ | ❌ | ✅ |
| `POST /token/comprar` | ❌ | ❌ | ✅ | ✅ |
| `GET /catalogo` | ✅ | ✅ | ✅ | ✅ |
| `POST /blockchain/mintear` | ❌ | ✅ | ❌ | ✅ |

---

## 💰 Flujo de Tokens

### 🔄 Proceso Completo

```mermaid
graph TD
    A[Ingenio registra producción] --> B[Sistema calcula CO2]
    B --> C[Genera tokens tCANE]
    C --> D[Tokens disponibles en catálogo]
    D --> E[Empresa compra tokens]
    E --> F[Pago automático en blockchain]
    F --> G[Distribución 80/10/10]
    G --> H[Certificado de compensación]
```

### 💸 Distribución de Pagos

Para una venta de **47 tokens a $450 MXN c/u = $21,150 MXN**:

```javascript
const distribucion = {
  total: 21150,
  agricultor: 21150 * 0.80, // $16,920 MXN (80%)
  ingenio: 21150 * 0.10,    // $2,115 MXN (10%)
  fondo_ahorro: 21150 * 0.10 // $2,115 MXN (10%)
};
```

### 🔢 Conversiones

```javascript
// Conversión CO2
const toneladas_cana = 150;
const co2_capturado = toneladas_cana * 1.83; // 274.5 ton CO2

// Generación de tokens
const tokens_generados = Math.floor(toneladas_cana); // 150 tokens

// Precio en MXN
const precio_unitario = 450; // MXN por token
const valor_total = tokens_generados * precio_unitario; // $67,500 MXN
```

---

## 🌐 Integración Blockchain

### ⭐ Stellar Network

El sistema utiliza **Stellar Testnet** para todas las operaciones blockchain:

```javascript
// Configuración Stellar
const config = {
  network: 'TESTNET',
  horizon: 'https://horizon-testnet.stellar.org',
  passphrase: 'Test SDF Network ; September 2015'
};
```

### 🏦 Wallets del Sistema

```javascript
// Wallets configuradas (Testnet)
const wallets = {
  sistema: 'GAVJLREQ2JCKDTU7PMDCFX3DWVHUJIZYWA6K4HQ7YGMZEY3AXLHC2V6X',
  ingenio: 'GAE2RPHKKE3FODLZQMTRYDF6ZF5UMUCQ3336X3PQMQZBSVUFX5EOK7YD',
  fondo_ahorro: 'GAYD6EE47NUDQD7UTDYMKXJ7YRXOCVHD7TDZTMXB6Q7J5PRHCN4TSIFM'
};
```

### 🔗 Operaciones Blockchain

#### Transferencia de Pago
```javascript
// Ejemplo de transferencia automática
const transferencia = {
  from: 'SISTEMA_WALLET',
  to: 'AGRICULTOR_WALLET',
  amount: '1880', // XLM (equivalente a $16,920 MXN)
  memo: 'Pago por venta de 47 tokens tCANE'
};
```

---

## 💻 Ejemplos Frontend

### ⚛️ React/Next.js

#### Hook para Autenticación
```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        setUser(data.data.user);
        return { success: true };
      }
      
      return { success: false, error: data.message };
    } catch (error) {
      return { success: false, error: 'Error de conexión' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, login, logout, loading };
};
```

#### Componente de Catálogo
```javascript
// components/CatalogoTokens.jsx
import { useState, useEffect } from 'react';

const CatalogoTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/v1/catalogo');
      const data = await response.json();
      
      if (data.success) {
        setTokens(data.data.tokens);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const comprarTokens = async (tokenId, cantidad) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/v1/token/comprar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          token_id: tokenId,
          cantidad: cantidad,
          huella_co2_compensar: cantidad
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert('¡Compra exitosa! Transacción: ' + data.data.transaction_hash);
        fetchTokens(); // Actualizar catálogo
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  if (loading) return <div>Cargando tokens...</div>;

  return (
    <div className="catalogo-tokens">
      <h2>🌱 Tokens tCANE Disponibles</h2>
      
      {tokens.map(token => (
        <div key={token.id} className="token-card">
          <h3>Producción #{token.produccion_id}</h3>
          <p><strong>Agricultor:</strong> {token.agricultor}</p>
          <p><strong>Ingenio:</strong> {token.ingenio}</p>
          <p><strong>Disponibles:</strong> {token.cantidad_disponible} tokens</p>
          <p><strong>Precio:</strong> ${token.precio_unitario_mxn} MXN c/u</p>
          <p><strong>Calidad:</strong> {token.calidad}</p>
          
          <button 
            onClick={() => comprarTokens(token.id, 10)}
            className="btn-comprar"
          >
            Comprar 10 tokens (${token.precio_unitario_mxn * 10} MXN)
          </button>
        </div>
      ))}
    </div>
  );
};

export default CatalogoTokens;
```

### 🖼️ Vue.js

#### Servicio API
```javascript
// services/api.js
class CanaceroAPI {
  constructor() {
    this.baseURL = 'http://localhost:3001/api/v1';
  }

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...options
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    return await response.json();
  }

  // Autenticación
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  // Catálogo
  async getCatalogo(page = 1, limit = 10) {
    return this.request(`/catalogo?page=${page}&limit=${limit}`);
  }

  // Comprar tokens
  async comprarTokens(tokenId, cantidad) {
    return this.request('/token/comprar', {
      method: 'POST',
      body: JSON.stringify({
        token_id: tokenId,
        cantidad: cantidad,
        huella_co2_compensar: cantidad
      })
    });
  }

  // Dashboard
  async getEstadisticas() {
    return this.request('/dashboard/estadisticas');
  }
}

export default new CanaceroAPI();
```

### 📱 React Native

#### Configuración Axios
```javascript
// services/apiClient.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  timeout: 10000,
});

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      AsyncStorage.removeItem('token');
      // Redirigir a login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🧪 Testing

### 🔬 Scripts de Prueba Disponibles

```bash
# Verificar balances de wallets
node check-balances.js

# Probar flujo completo de tokens
node test-flujo-completo.js

# Ejecutar transferencia real en testnet
node test-transferencia-real.js

# Simular distribución de pagos
node test-transferencias-reales.js
```

### 🧪 Ejemplo de Test de Integración

```javascript
// tests/integration/token-flow.test.js
const request = require('supertest');
const app = require('../../server');

describe('Token Flow Integration', () => {
  let authToken;
  let produccionId;

  beforeAll(async () => {
    // Login como ingenio
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'ingenio@test.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });

  test('Flujo completo: Producción → Tokens → Venta', async () => {
    // 1. Registrar producción
    const produccionResponse = await request(app)
      .post('/api/v1/produccion')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        agricultor_id: 1,
        toneladas_cana: 100,
        calidad: 'A',
        fecha_cosecha: '2024-01-15'
      });

    expect(produccionResponse.status).toBe(201);
    produccionId = produccionResponse.body.data.produccion.id;

    // 2. Validar producción
    await request(app)
      .put(`/api/v1/produccion/${produccionId}/validar`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ notas_validacion: 'Test validation' });

    // 3. Verificar tokens en catálogo
    const catalogoResponse = await request(app)
      .get('/api/v1/catalogo');

    expect(catalogoResponse.status).toBe(200);
    expect(catalogoResponse.body.data.tokens).toHaveLength(1);

    // 4. Comprar tokens (como empresa)
    const empresaLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'empresa@test.com',
        password: 'password123'
      });

    const compraResponse = await request(app)
      .post('/api/v1/token/comprar')
      .set('Authorization', `Bearer ${empresaLogin.body.data.token}`)
      .send({
        token_id: 1,
        cantidad: 50,
        huella_co2_compensar: 50
      });

    expect(compraResponse.status).toBe(200);
    expect(compraResponse.body.data.transaction_hash).toBeDefined();
  });
});
```

---

## 🚀 Deployment

### 🐳 Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      - postgres
    
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: conocero_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### ☁️ Deployment en la Nube

#### Heroku
```bash
# Instalar Heroku CLI
npm install -g heroku

# Login y crear app
heroku login
heroku create canacero-api

# Configurar variables de entorno
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=tu_jwt_secret_produccion
heroku config:set DATABASE_URL=postgres://...

# Deploy
git push heroku main
```

#### Vercel
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 🔒 Configuración de Producción

```bash
# Variables críticas para producción
NODE_ENV=production
JWT_SECRET=jwt_secret_super_seguro_256_bits
DB_SSL=true
STELLAR_NETWORK=PUBLIC
STELLAR_HORIZON_URL=https://horizon.stellar.org

# Rate limiting más estricto
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Logs
LOG_LEVEL=warn
LOG_FILE_PATH=/var/log/canacero/app.log
```

---

## 📚 Recursos Adicionales

### 🔗 Enlaces Útiles

- **Stellar Documentation**: https://developers.stellar.org/
- **Freighter Wallet**: https://freighter.app/
- **Stellar Laboratory**: https://laboratory.stellar.org/
- **Testnet Explorer**: https://stellar.expert/explorer/testnet

### 📞 Soporte

- **Issues**: GitHub Issues
- **Documentación**: `/docs` folder
- **API Status**: `GET /health`

### 🏷️ Versioning

- **Actual**: v1.0.0
- **API Version**: v1
- **Compatibilidad**: Node.js 18+

---

## 🎉 ¡Listo para Integrar!

Con esta documentación tienes todo lo necesario para:

1. **🚀 Configurar el backend** localmente
2. **🔗 Integrar con tu frontend** favorito
3. **🧪 Probar el flujo completo** de tokens
4. **🌐 Conectar con Stellar** blockchain
5. **📊 Implementar dashboards** y analytics

**¿Necesitas ayuda?** Revisa los scripts de prueba en `/backend/test-*.js` para ver ejemplos funcionando.

---

*Documentación generada para Canacero v1.0.0 - Sistema de Tokenización de CO2 Azucarero* 🌱