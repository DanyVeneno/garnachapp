# Actualización de GarnachApp — 31 de octubre de 2026

La actualización moderniza el proyecto local y corrige bloqueos de compatibilidad,
seguridad y funcionamiento detectados durante el diagnóstico. No se desplegó a
producción ni se modificaron credenciales, configuraciones de proveedores o datos reales.

## Tecnologías

| Componente | Antes | Actualización |
|---|---|---|
| Next.js | 14.0.0 | 16.4.3, Turbopack |
| React / React DOM | 18.2.0 | 19.3.1 |
| Tailwind CSS | 3.3.5 | 4.3.3 y plugin PostCSS dedicado |
| NextAuth | 4.24.5 | 4.24.15, compatible con las API asíncronas de Next.js |
| Adaptador MongoDB de Auth | 2.0.6 | 3.11.3 |
| Mongoose | 7.6.5 | 9.11.4 |
| Driver MongoDB directo | 6.3.0 | 6.21.0, conservando la compatibilidad declarada por el adaptador |
| bcrypt | 5.1.1 | 6.0.0 |
| Stripe SDK | 14.5.0 | 23.1.0 |
| AWS SDK S3 | 3.454.0 | 3.1161.0 |
| ESLint | 8.53.0 | 10.14.0 y configuración plana |
| TypeScript | 5.2.2 | 5.9.3, rama compatible con el código y las herramientas actuales |

Se declara Node.js 22.13 o 24, con Node.js 24 recomendado en `.nvmrc`, y Yarn
1.22.22 en `packageManager`. Se conserva `yarn.lock` como único lockfile.
La elección de TypeScript 5 evita introducir además una migración al compilador 7;
el proyecto sigue siendo principalmente JavaScript y no se afirma cobertura estática completa.

## Cambios de aplicación

- La ruta de NextAuth exporta únicamente sus manejadores HTTP; la configuración
  compartida vive en `src/libs/auth.js`.
- Las sesiones JWT compatibilizan credenciales y Google. Se actualizaron las
  comprobaciones de sesión, propietario y rol en perfiles y pedidos.
- Las respuestas de perfiles y registro usan campos explícitos; el modelo excluye
  el hash de contraseña por defecto. El login lo solicita únicamente al verificar credenciales.
- MongoDB se conecta de forma diferida y reutilizable, esperando la conexión antes
  de consultar. El webhook puede inicializarse en un proceso recién iniciado.
- Los precios y la identidad del pedido proceden del servidor. Las direcciones
  no pueden reemplazar `userEmail`; los precios se convierten a centavos enteros.
- El webhook verifica firma y, para pedidos nuevos, importe, moneda y sesión esperados.
  Los pedidos anteriores sin esos campos conservan la compatibilidad de lectura.
- Las contraseñas nuevas se validan antes de persistir; se usa bcrypt asíncrono.
- Las cargas a S3 exigen sesión y verifican cabeceras de PNG/JPEG/WebP, tipo y límite
  de archivo de 5 MB. Se conserva la ACL existente; no se cambia la política del bucket.
- Se sustituye `react-flying-item`, incompatible según sus peer dependencies con
  React 19, por una animación local que respeta la preferencia de movimiento reducido.
- Se corrige la eliminación del carrito, su recuperación ante almacenamiento corrupto,
  la redirección del perfil sin sesión y la carga del formulario de edición de productos.
- Se migra Tailwind a su plugin PostCSS nuevo y se carga explícitamente la configuración
  existente, preservando colores y algunos valores base de la versión anterior.
- Se actualizan idioma, descripción, textos alternativos y disposición móvil del carrito.
- Se agregan `.env.example`, instrucciones locales y pruebas automatizadas.

## Compatibilidad externa

El SDK de Stripe mantiene explícitamente la API **2023-10-16**, que usaba el SDK
anterior. Se conservan **USD** y **5 USD** de envío. La actualización del SDK no
actualiza la versión de los webhooks configurados en la cuenta ni cambia la moneda.
Cambiar ese contrato requiere una validación de pagos independiente.

El cambio a JWT puede requerir que los usuarios vuelvan a iniciar sesión. No se
migran registros existentes ni se cambian automáticamente roles de usuarios.
El checkout ahora exige una sesión para asociar cada pedido a su propietario.

Tailwind 4 requiere navegadores modernos: Safari 16.4+, Chrome 111+ y Firefox 128+.
Debe comprobarse la versión real del servidor MongoDB antes de desplegar Mongoose 9.

## Verificación final

| Verificación | Resultado |
|---|---|
| Instalación y renovación del lockfile | Completadas con Yarn 1.22.22. |
| `npm run lint` | Salida 0, sin errores ni advertencias de lint. |
| `npm run typecheck` | Salida 0; el build final volvió a completar TypeScript. |
| `npm test` | 17 pruebas aprobadas. |
| `npm run build` | Salida 0 con Next.js 16.4.3/Turbopack; 23/23 entradas generadas, sin errores de conexión a MongoDB. |
| `npm run test:smoke` | 11 comprobaciones HTTP aprobadas sobre el build de producción con credenciales ficticias. |
| `yarn audit --json` | 0 altos, 0 críticos, 0 bajos; 9 moderados. Salida 4 porque existen avisos moderados. |
| `git diff --check` | Sin errores de espacios; Git informó conversión habitual LF/CRLF. |

Las comprobaciones HTTP verificaron inicio, menú y carrito con respuesta 200,
proveedores de autenticación y sesión con respuesta 200, rechazo 401 a perfil,
pedidos, carga y checkout anónimos, y rechazo 400 a un registro con contraseña débil.
No crearon registros, sesiones de pago ni objetos en S3. El servidor temporal de
estas pruebas se cerró al terminar.

Las pruebas unitarias ejecutan lógica con sustitutos de sesiones, MongoDB, S3 y
Stripe. Incluyen permisos de perfiles y pedidos, omisión de hashes, rechazo de
escalamiento de privilegios, precios canónicos, firma e importe del webhook,
eliminación del carrito y recuperación de almacenamiento corrupto. No certifican
los servicios reales ni sustituyen una revisión visual en navegador. El intento
de abrir el navegador automatizado agotó su tiempo de espera; no se afirma QA visual.

### Avisos de dependencias restantes

El primer audit tras actualizar las dependencias directas registró 26 avisos altos,
19 moderados y 3 bajos en dependencias heredadas del lockfile. La renovación de
dependencias compatibles redujo el resultado a **9 moderados, sin altos ni críticos**.
El resultado final completo está en `dependency-audit.jsonl`.

Los nueve corresponden a rutas de una misma alerta de `minimatch`,
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249),
bajo ESLint y `eslint-config-next`, ambos declarados en `devDependencies`.
El aviso indica corrección en 11.0.1; varias herramientas aún requieren ramas
anteriores. No se impuso una resolución mayor incompatible con esas herramientas.
Debe seguirse la corrección de sus dependencias. Este audit no prueba ausencia
de vulnerabilidades en todo el producto o código incorporado dentro de paquetes.

Yarn también informa peer dependencies de tres plugins que todavía declaran ESLint
hasta la rama 9. Se usa ESLint 10 con la configuración oficial de Next.js 16.4.3,
que incorpora adaptadores de compatibilidad para plugins; el lint completo terminó
correctamente. Estas advertencias de metadatos quedan pendientes de actualización
por los mantenedores. Yarn Classic emite además un aviso de `url.parse()` en Node 24.

## Pendientes operativos

Validar inicio y cierre de sesión con cuentas de prueba, compra y cancelación,
webhook firmado real, permisos de S3 y datos existentes en un entorno de prueba.
También quedan fuera de esta actualización una política de rate limiting,
respaldos y restauración, observabilidad y la conciliación operativa completa de pagos.
La clave de idempotencia de Stripe evita duplicar una sesión para la misma orden,
pero reenviar todo el checkout puede crear otra orden; no se afirma idempotencia
del flujo completo ni atomicidad entre MongoDB y Stripe.

El servidor de desarrollo local que mantenía cargado Next.js 14 fue detenido para
liberar su módulo nativo. Se reinició con Next.js 16 en `127.0.0.1:3000` y se comprobó
una respuesta HTTP 200 con la marca del negocio. La evidencia resumida se registra
en `update-verification.json`. Next.js generó además su `AGENTS.md` de orientación
para herramientas de desarrollo; no contiene credenciales.

## Referencias consultadas

- [Migración a Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16),
  consultada mediante Context7 junto con la migración de API asíncronas.
- [Tailwind CSS 4](https://tailwindcss.com/docs/upgrade-guide).
- [Mongoose 8](https://mongoosejs.com/docs/migrating_to_8.html) y
  [Mongoose 9](https://mongoosejs.com/docs/migrating_to_9.html).
- [Versionado de la API de Stripe](https://docs.stripe.com/sdks/set-version).
- [Adaptador MongoDB de Auth](https://authjs.dev/getting-started/adapters/mongodb),
  contrastado con la implementación instalada para la conexión diferida.

El reporte `REPORTE-TECNICO.md` describe el estado **anterior** a esta actualización.
Los scripts de caracterización incluidos con aquel reporte esperan fallas históricas;
las pruebas mantenidas de la versión actual están en `tests/`.
