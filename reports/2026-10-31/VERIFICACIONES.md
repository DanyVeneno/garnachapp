# Evidencia de verificación — 31 de octubre de 2026

Directorio de ejecución: `C:/Users/YehiiBhii/garnachapp`.

## Resultados finales

| Comando | Salida | Resultado observado |
|---|---|---|
| `npm ls --depth=0` | 0 | Dependencias directas enumeradas. |
| `npm run lint` | 0 | Seis advertencias, sin errores de lint. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | 0 | Validación de tipos bajo la configuración existente. |
| `npm run build`, entorno restringido | 1 | Google Fonts: descarga de Roboto rechazada con `EACCES`. |
| `npm run build`, repetición con red y variables ficticias | 0 | Build completo; errores de conexión al MongoDB ficticio registrados. |
| `node reports/2026-10-31/verify-security.mjs` | 0 | Seis comportamientos inseguros reproducidos. |
| `node reports/2026-10-31/verify-functional.cjs` | 0 | Dos fallas funcionales reproducidas. |

El inventario y el lint fueron ejecutados en lotes con otras consultas; el resultado de inventario se interpreta desde el árbol emitido por npm. El código de salida global de un lote de shell no debe confundirse con el de cada consulta auxiliar. No se instaló ni actualizó ninguna dependencia de la aplicación.

## Lint

- `src/app/menu-items/edit/[id]/page.js:27`: dependencia `id` faltante en efecto.
- `src/app/orders/[id]/page.js:29`: dependencias `clearCart` e `id` faltantes.
- `src/app/users/[id]/page.js:20`: dependencia `id` faltante.
- `src/components/AppContext.js:30`: dependencia `ls` faltante.
- `src/components/layout/Header.js:55`: imagen sin `alt`.
- `src/components/layout/Header.js:89`: imagen sin `alt`.

## Build controlado

Se definieron variables de proceso ficticias para MongoDB, sesión, OAuth, AWS y Stripe. MongoDB apuntó a `127.0.0.1:1`, con tiempos de conexión y selección de servidor limitados. `NEXTAUTH_URL` fue `http://localhost:3000/`. La telemetría de Next.js se deshabilitó para este proceso. Los valores reales de `.env` no se modificaron.

Extractos de la salida de la repetición final:

```text
Next.js 14.0.0
Environments: .env
Compiled successfully
Linting and checking validity of types ...
Collecting page data ...
MongoServerSelectionError: connection timed out
MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:1
Generating static pages (0/24) ...
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:1
Generating static pages (24/24)
Finalizing page optimization ...
Collecting build traces ...
```

El proceso terminó con salida **0** y tabla de rutas estáticas y dinámicas. La tabla reportó First Load JS compartido de **87.7 kB** y **121 kB** para inicio. Son tamaños del artefacto, no métricas de carga en dispositivos, Lighthouse ni rendimiento de producción. Se advirtió que la base de Browserslist/caniuse-lite estaba desactualizada.

El texto `Environments: .env` identifica el archivo descubierto por Next.js; las variables relevantes enumeradas arriba estaban sobreescritas en el proceso. Los errores a localhost son esperados por esta configuración de aislamiento. También evidencian que se inician conexiones durante el build, cuya gestión debe revisarse. No prueban una caída de la base real.

## Comprobaciones aisladas

Los scripts incluidos caracterizan fallas existentes: un resultado satisfactorio significa que lograron reproducir el comportamiento inseguro o incorrecto. Después de corregirlo, las aserciones de caracterización deberán reemplazarse por expectativas de comportamiento seguro.

`verify-security.mjs` carga el código de las rutas en un contexto VM, retira imports y sustituye dependencias por implementaciones en memoria. No verifica el despacho de Next.js, cookies, conectividad, permisos efectivos del bucket ni validación real de Stripe o Mongoose. Los campos y hashes de muestra son sintéticos.

`verify-functional.cjs` transforma JSX con el TypeScript instalado y ejecuta componentes con dependencias simuladas. Comprueba el callback del botón de carrito y el retorno del perfil sin sesión. No abre un navegador ni verifica CSS o accesibilidad visual.

Resultados completos: `security-results.json` y `functional-results.json`.

## Documentación

Se ejecutaron los tres comandos de Context7 autorizados para esta revisión:

```text
npx ctx7@latest library "Next.js" "App Router route handler supported exports and production build validation"
npx ctx7@latest docs /vercel/next.js "Supported named exports in App Router route.js and invalid route export build errors"
npx ctx7@latest docs /vercel/next.js "Authentication and authorization checks inside Route Handlers for user data ownership"
```

Las tres consultas finalizaron con salida 0. Se seleccionó el repositorio oficial `/vercel/next.js`; los resultados recuperados corresponden a documentación actual/canary. Se consultaron además la política de soporte y los avisos oficiales enlazados en el reporte para comprobar información temporal de seguridad.

## Límites pendientes

No se verificaron producción, cuentas reales, compra de prueba con Stripe, webhook real, restauración de respaldos, acceso efectivo a S3, autenticación real ni una instalación limpia desde `yarn.lock`. No se ejecutó auditoría completa de dependencias transitivas. No hay evidencia suficiente para certificar disponibilidad, rendimiento o ausencia de vulnerabilidades adicionales.
