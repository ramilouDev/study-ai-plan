# EasyStudy AI - PDF to Quiz Generator

EasyStudy AI es una aplicación web que convierte documentos PDF en cuestionarios interactivos utilizando inteligencia artificial. La aplicación permite a los usuarios subir documentos PDF y genera automáticamente preguntas de opción múltiple basadas en el contenido.

## DEMO:
https://study-ai-plan.ksquareluisrh.workers.dev/

## Arquitectura

### Frontend
- **React** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Clerk** para autenticación
- **React Router** para navegación

### Backend
- **Cloudflare Workers** para serverless computing
- **Hono** como framework para el worker
- **Supabase** como base de datos
- **OpenRouter API** para generación de preguntas con IA

### Características Principales
- Arquitectura serverless
- Autenticación segura con Clerk
- Procesamiento de PDF en el cliente
- Generación de preguntas con IA
- Almacenamiento persistente en Supabase
- CORS configurado automáticamente
- CI/CD con GitHub Actions

## Performance

- **Edge Computing**: Utilizando Cloudflare Workers para respuesta rápida global
- **Optimización de PDF**: Procesamiento en el cliente para reducir carga del servidor
- **Caching**: Implementado en Cloudflare Workers
- **Lazy Loading**: Carga diferida de componentes React
- **API Optimizada**: Endpoints eficientes con Hono
- **Base de Datos**: Queries optimizadas en Supabase

## Configuración Local

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio>
cd study-ai-plan
```

2. **Instalar dependencias**
```bash
npm install
```

## Configuración de Base de Datos (Supabase)

1. **Acceder a Supabase**
   - Inicia sesión en [Supabase Dashboard](https://app.supabase.com)
   - Selecciona tu proyecto o crea uno nuevo

2. **Ejecutar Scripts SQL**
   - Ve a la sección "SQL Editor"
   - Crea un nuevo query
   - Copia y pega el contenido del archivo `supabase.sql` que se encuentra en la raíz del proyecto
   - Ejecuta el script

3. **Obtener Credenciales**
   - Ve a Project Settings > API
   - Copia `Project URL` → Este es tu `SUPABASE_URL`
   - Copia `anon public` → Este es tu `SUPABASE_ANON_KEY`
   - Agrega estas credenciales a tu `.dev.vars` y GitHub Secrets

4. **Verificar la Configuración**
   - Asegúrate de que todas las tablas se crearon correctamente
   - Verifica que las políticas de RLS estén activas
   - Prueba la conexión desde tu aplicación:
   ```bash
   # Usando el endpoint de prueba
   curl https://tu-worker-url/api/supabase/test
   ```

### Notas Importantes sobre la Base de Datos
- Las tablas usan UUID como identificadores primarios
- RLS (Row Level Security) está habilitado por defecto
- Los timestamps se actualizan automáticamente
- Las relaciones están configuradas con eliminación en cascada

3. **Configurar variables de entorno**

Crear archivo `.dev.vars` en la raíz:
```env
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
OPENROUTER_API_KEY=tu_openrouter_api_key
```

Crear archivo `.env.local` o (.env) si `.env.local` no lo reconoce:
```env
VITE_CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
```

4. **Iniciar el proyecto en desarrollo**
```bash
npm run dev
```

## Despliegue

### Requisitos Previos
- Cuenta en Cloudflare
- Cuenta en GitHub
- Cuenta en Clerk
- Cuenta en Supabase
- Cuenta en OpenRouter

### Configuración de GitHub Actions

1. **Configurar Secrets en GitHub**
   - Ve a Settings → Secrets and variables → Actions
   - Agrega los siguientes secrets:
   ```
   CLOUDFLARE_API_TOKEN=tu_cloudflare_api_token
   SUPABASE_URL=tu_supabase_url
   SUPABASE_ANON_KEY=tu_supabase_anon_key
   OPENROUTER_API_KEY=tu_openrouter_api_key
   VITE_CLERK_PUBLISHABLE_KEY=tu_clerk_publishable_key
   ```

2. **Obtener Cloudflare API Token**
   - Ve al Dashboard de Cloudflare
   - My Profile → API Tokens
   - Create Token → Edit Cloudflare Workers
   - Configura los permisos necesarios

3. **Configurar Worker**
   - El despliegue se realiza automáticamente al hacer push a main
   - El workflow configura automáticamente:
     - CORS
     - Variables de entorno
     - Secretos del worker

### Comandos de Despliegue

```bash
# Despliegue manual (si es necesario)
npm run deploy

# Verificar configuración
npm run check

# Build local
npm run build
```

## Estructura del Proyecto
