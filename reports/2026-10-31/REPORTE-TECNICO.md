# Reporte técnico de GarnachApp / Roll Burrito Hub

> Diagnóstico previo a la actualización. Consultar `ACTUALIZACION.md` para los cambios posteriores y sus verificaciones.

**Fecha:** 31 de octubre de 2026, America/Mexico_City.  
**Dictamen:** el repositorio contiene un MVP de comercio de alimentos con catálogo, carrito y administración. **No se recomienda aprobar su salida a producción en el estado revisado**, por fallas críticas de autorización y exposición de datos. No se verificó la disponibilidad de una aplicación publicada.

## 1. Alcance y evidencia

Se inspeccionó el código local en `C:/Users/YehiiBhii/garnachapp`: 61 archivos en `src`, 14 páginas, 10 módulos de rutas API, cinco modelos de datos, configuración, dependencias instaladas y estado de Git. Se ejecutaron lint, comprobación de tipos, compilación controlada y ocho comprobaciones aisladas de comportamiento.

Referencia de Git: `83929dc`, último commit local observado, fechado el 4 de octubre de 2024. Antes de esta revisión existía una modificación en `src/components/layout/Header.js`; se preservó. La fecha del commit no permite inferir la fecha del último despliegue ni de todos los cambios locales.

Las comprobaciones aisladas utilizan datos sintéticos y sustitutos en memoria para sesiones, MongoDB, S3 y Stripe. Ejecutan la lógica de las rutas y componentes, pero **no equivalen a pruebas HTTP, de navegador ni de integración con los servicios reales**. No se crearon usuarios, pedidos, cobros ni objetos en servicios externos.

Se comprobó exclusivamente la presencia de las variables de `.env`, sin incluir sus valores en este reporte. No se realizó una auditoría del historial de secretos, pentest, auditoría integral de dependencias transitivas, medición de rendimiento ni revisión visual en navegador.

## 2. Estado por área

| Área | Estado | Evidencia y consecuencia |
|---|---|---|
| Arquitectura | Implementada para un MVP | Aplicación monolítica Next.js con interfaz y API en el mismo proyecto. |
| Catálogo y administración | Implementados en código | Categorías, productos, tamaños, extras y pantallas administrativas; faltan validaciones robustas. |
| Carrito | Falla funcional confirmada | El botón de eliminar usa una variable inexistente. |
| Autenticación | Requiere corrección y validación | Google y credenciales configurados; hay una inconsistencia probable en la estrategia de sesión. |
| Autorización y privacidad | Crítico | Modificación de perfiles y privilegios, lectura de pedidos por ID y exposición de hashes. |
| Pagos y pedidos | Integración implementada, no certificada | Checkout y webhook presentes; problemas de integridad del pedido y conexión del webhook. |
| Calidad | Insuficiente para una liberación confiable | Lint pasa con seis advertencias; no hay suite de pruebas de aplicación ni CI detectada. |
| Dependencias | Riesgo alto | Next.js 14.0.0 instalado; rama fuera de soporte y con avisos oficiales posteriores. |
| Despliegue | Build generado; operación no validada | Build completo con salida 0 usando credenciales ficticias; errores de MongoDB durante la generación. Faltan pruebas con servicios de un entorno de prueba. |

## 3. Arquitectura y funcionalidades

El navegador utiliza React, Tailwind y componentes cliente. Next.js App Router sirve las páginas y las rutas `/api/*`. NextAuth gestiona autenticación; MongoDB almacena información mediante Mongoose y también mediante el driver nativo usado por el adaptador. Stripe ofrece Checkout y notificación de pagos. AWS S3 recibe las imágenes.

| Componente | Versión instalada observada |
|---|---|
| Next.js | 14.0.0 |
| React / React DOM | 18.2.0 / 18.2.0 |
| NextAuth | 4.24.5 |
| Adaptador MongoDB de Auth | 2.0.6 |
| Mongoose / MongoDB driver | 7.6.5 / 6.3.0 |
| Stripe SDK | 14.5.0 |
| AWS SDK S3 | 3.454.0 |
| Tailwind CSS | 3.3.5 |
| TypeScript | 5.2.2 |

El entorno de comprobación reportó Node.js `24.22.1` y npm `11.21.0`. El proyecto no declara `engines` ni `packageManager`; existe `yarn.lock`. El árbol de dependencias directas pudo enumerarse sin dependencias directas faltantes o inválidas reportadas.

Funcionalidades presentes:

- Inicio, presentación del negocio, contacto telefónico y enlace a video.
- Menú agrupado por categorías, productos con tamaños y extras.
- Carrito persistido en `localStorage` y cálculo de subtotal y envío.
- Registro, inicio de sesión con contraseña y Google, edición de perfil y dirección.
- Administración de categorías, productos y usuarios.
- Creación de sesión de pago, historial y detalle de pedidos, marca de pago mediante webhook.

No se identificó un flujo de estados de preparación, despacho y entrega; el pedido modela principalmente el indicador `paid`. Tampoco se identificaron flujos propios de recuperación de contraseña, verificación de correo o reembolso. Esto describe el alcance encontrado, no requisitos de negocio previamente acordados.

## 4. Seguridad: hallazgos prioritarios

La prioridad es una evaluación cualitativa del código, no una puntuación CVSS calculada. P0 bloquea la liberación; P1 debe resolverse antes de una validación integral de lanzamiento; P2 corresponde a robustez y mantenimiento.

### SEC-01 — P0 / crítico: modificación de perfiles y privilegios sin autorización suficiente

**Evidencia:** `src/app/api/profile/route.js:7-25` y `src/models/UserInfo.js`.

Cuando el cuerpo de `PUT /api/profile` contiene `_id`, el servidor selecciona al usuario sin consultar la sesión ni exigir privilegios de administrador. Los demás campos se propagan a `UserInfo.findOneAndUpdate`, incluido `admin`. Un usuario autenticado también puede enviar `admin` al actualizar su propio perfil. Ocultar el checkbox en la interfaz no restringe la API.

**Impacto:** con un identificador válido se pueden modificar datos de otro usuario y asignar privilegios administrativos. La lectura de perfiles descrita abajo facilita obtener información del objetivo una vez conocido el ID; no se comprobó enumeración de identificadores.

**Comprobación:** SEC-01b reprodujo la propagación de `admin: true` sin que se consultara una sesión, usando un usuario sintético.

**Acción:** autenticar toda modificación; aplicar propietario o administrador en el servidor; permitir una lista explícita de campos; reservar cambios de rol para una operación administrativa separada. Verificar que los usuarios normales no puedan modificar `admin` ni `email` de autorización.

### SEC-02 — P0 / alto: lectura de pedidos sin comprobar propietario

**Evidencia:** `src/app/api/orders/route.js:17-20`.

La rama con `_id` devuelve `Order.findById` antes de aplicar las restricciones que sí existen para el listado. Una sesión ausente y `isAdmin() === false` no impiden la respuesta del detalle.

**Impacto:** exposición de correo, teléfono, dirección y contenido del pedido a quien conozca un identificador válido.

**Comprobación:** SEC-02 obtuvo un pedido sintético de otro cliente con sesión nula.

**Acción:** exigir propietario o administrador en cada consulta por ID; devolver 401/403 o una respuesta que no revele la existencia de pedidos ajenos. Añadir casos de usuario anónimo, propietario, tercero y administrador.

### SEC-01a / SEC-06 — P0 / alto: perfiles públicos por ID y hashes en respuestas

**Evidencia:** `src/app/api/profile/route.js:30-51`, `src/app/api/register/route.js:17-18`, `src/app/api/users/route.js:8-9` y `src/models/User.js`.

El perfil por `_id` tampoco exige sesión. El modelo `User` incluye `password` y las consultas no lo excluyen. El perfil mezcla el documento completo del usuario con sus datos adicionales. Registro y listado administrativo también serializan documentos sin una proyección segura.

**Impacto:** exposición del hash de contraseña y de información de perfil. El hash no es la contraseña en texto claro, pero su entrega al cliente amplía el riesgo de ataque fuera de línea. El listado de usuarios tiene control administrativo; el perfil por ID carece de él.

**Comprobación:** SEC-01a reprodujo un perfil anónimo por ID cuya respuesta contenía un hash sintético. Registro y listado se confirmaron por inspección del código.

**Acción:** proyectar únicamente campos públicos necesarios; excluir `password` por defecto en el modelo y construir respuestas explícitas; aplicar autorización al perfil por ID.

### SEC-03 — P1 / alto: carga pública a S3 sin controles de entrada

**Evidencia:** `src/app/api/upload/route.js:4-45`.

La API procesa archivos sin autenticación ni autorización, utiliza el tipo declarado por el cliente, no comprueba formato o tamaño y reúne el contenido completo en memoria. Solicita `ACL: public-read` y usa bucket y región fijos.

**Impacto:** posibilidad de abuso del almacenamiento, consumo de memoria, costos y publicación de contenido arbitrario, si las políticas efectivas de S3 permiten la operación.

**Comprobación:** SEC-03 aceptó un archivo HTML sintético y alcanzó el sustituto de S3 sin sesión. **No se comprobó que el bucket real acepte ACL públicas ni se subió contenido real.**

**Acción:** exigir permiso apropiado; limitar tamaño y formatos y comprobar contenido; controlar frecuencia; utilizar permisos mínimos en S3 y un esquema de entrega de archivos compatible con la política real del bucket.

### SEC-04 — P1 / alto: validación de contraseña inefectiva

**Evidencia:** `src/app/api/register/route.js:8-18`.

El código instancia `new Error(...)` pero no hace `throw` ni devuelve una respuesta de rechazo. Una contraseña corta continúa hasta el hash y la creación del usuario. Entradas ausentes o inválidas también pueden terminar como errores internos. No se detectaron controles de frecuencia en las rutas de registro y autorización de credenciales del repositorio; los controles externos no fueron inspeccionados.

**Comprobación:** SEC-04 verificó que una contraseña de un carácter alcanza la persistencia simulada.

**Acción:** validar y rechazar antes de calcular el hash; normalizar correo; manejar duplicados; aplicar controles de abuso. Revisar una política de contraseñas acorde con el producto y evitar trabajo síncrono costoso bajo carga.

## 5. Integridad de pedidos, pagos y datos

### SEC-05 — P1 / alto: identidad y contenido del pedido controlados por el cliente

**Evidencia:** `src/app/api/checkout/route.js:11-20,24-53` y `src/app/orders/[id]/page.js:31-37`.

`...address` se aplica después de `userEmail`, de modo que un campo `address.userEmail` puede reemplazar el propietario de la orden. Se persiste `cartProducts` tal como llega, incluyendo nombres y precios que después usa la vista del pedido. El cobro de Stripe sí recalcula el precio base y las opciones desde `MenuItem`: **no se demostró que alterar `basePrice` en el navegador reduzca el cobro**, pero el historial puede discrepar del importe cobrado.

**Comprobación:** SEC-05 reprodujo el cambio de propietario y la persistencia de un precio sintético manipulado.

**Acción:** permitir únicamente campos de dirección definidos; asignar identidad desde la sesión después de validar entradas; persistir un resumen de compra generado por el servidor, con moneda, cantidades, precios y total en unidades mínimas.

Otros riesgos observados:

- La orden se crea antes de validar todos los productos y antes de que Stripe acepte la sesión. Fallos pueden dejar pedidos incompletos o sin sesión de pago. No se observó clave de idempotencia para reintentos de creación de checkout.
- Productos, tamaños o extras inexistentes pueden producir accesos a `null`/`undefined` y respuestas 500. No hay límites explícitos de cantidad de productos o extras; los extras repetidos no se rechazan.
- Moneda de cobro y envío fijos en USD; envío de 500 centavos. La interfaz muestra `$` sin aclarar moneda. Debe verificarse la moneda de negocio, sin asumir que el contexto mexicano obliga a usar MXN.
- Las URL de retorno se construyen concatenando `NEXTAUTH_URL` con `orders/` y `cart`; dependen de una barra final correcta.
- `Order.cartProducts` se define como `Object`, sin esquema de líneas detallado; faltan restricciones sobre montos, dirección y transiciones de estado. `UserInfo.email` no tiene índice único declarado.
- Las consultas generales de usuarios, pedidos y catálogo no tienen paginación. Esto añade riesgo de crecimiento de latencia y tamaño de respuesta.

### PAY-01 — P1 / alto: webhook depende de una conexión Mongoose no inicializada localmente

**Evidencia:** `src/app/api/webhook/route.js:1-29`.

Se valida la firma de Stripe y se comprueba `payment_status === 'paid'`, dos controles positivos. Sin embargo, el archivo no establece conexión a MongoDB antes de actualizar la orden. No hay inicialización global de Mongoose encontrada que garantice esa conexión en un proceso frío dedicado al webhook. Puede funcionar si comparte un proceso previamente conectado, condición que no debe darse por garantizada.

**Acción:** inicializar y esperar una conexión reutilizable en la ruta; verificar monto y moneda contra la orden; almacenar referencias de Stripe y registrar eventos procesados y resultados. Repetir `paid: true` es idempotente para ese campo, pero no constituye un registro de conciliación. Eliminar el registro del evento completo en consola o redactar datos personales.

**Estado:** riesgo confirmado por inspección de inicialización; no se envió un webhook real ni se validó un despliegue en frío.

### AUTH-01 — P1 / probable: estrategia de sesión inconsistente con credenciales

**Evidencia:** `src/app/api/auth/[...nextauth]/route.js:11-48`; instalación local de NextAuth en `core/init.js`, `core/routes/callback.js` y `core/routes/session.js`.

Se configura un adaptador MongoDB y un proveedor de credenciales sin declarar `session.strategy`. El código instalado elige `database` cuando hay adaptador; el callback de credenciales emite un JWT mientras el lector de sesión toma la rama correspondiente a la estrategia configurada. Esto indica riesgo de inicio de sesión aparente sin sesión persistente utilizable.

**Acción:** definir una estrategia compatible para ambos proveedores y comprobar inicio, lectura de sesión, recarga y cierre con credenciales y Google. Es una inferencia apoyada en el código instalado; no se validó con cuentas reales.

## 6. Fallas funcionales y experiencia

| ID / prioridad | Evidencia | Comportamiento y acción |
|---|---|---|
| FUN-01 / P1 | `src/components/menu/CartProduct.js:35`; `src/app/cart/page.js:95-100` | El botón invoca `onRemove(index)` sin que exista `index` en el componente. `key` no transmite el índice como prop. Se reprodujo `ReferenceError`. Pasar una función de eliminación con identificador o índice explícito y probar productos repetidos. |
| FUN-02 / P1 | `src/app/profile/page.js:54-59` | Para sesión anónima, `!profileFetched` devuelve “Cargando...” antes de alcanzar la redirección. Se reprodujo con estado sintético. Resolver primero el estado no autenticado. |
| UX-01 / P2 | `src/components/UseProfile.js`, páginas de menú y pedidos | Varias solicitudes carecen de tratamiento de fallos de red o JSON y pueden dejar cargas indefinidas. Incorporar estados de error, respuestas no válidas y reintento acotado. |
| UX-02 / P2 | `src/app/layout.js`; `src/components/layout/Header.js:55,89` | `lang='en'` con contenido principalmente español, descripción de plantilla y dos imágenes sin `alt`. Corregir idioma, metadatos y accesibilidad. |
| UX-03 / P2 | `src/app/cart/page.js:20,88` | Mensaje de pago cancelado contradictorio y carrito con dos columnas sin adaptación declarada en ese grid. Corregir texto y verificar disposición móvil en navegador. |
| UX-04 / P2 | `src/components/AppContext.js:28-29` | `JSON.parse` de almacenamiento sin recuperación ante datos corruptos. Validar y restablecer un carrito inválido. |

## 7. Compilación, pruebas y calidad

| Verificación ejecutada | Resultado | Interpretación |
|---|---|---|
| `npm ls --depth=0` | Árbol directo enumerado | Inventario local; no prueba ausencia de vulnerabilidades. |
| `npm run lint` | Código de salida 0; seis advertencias | Cuatro advertencias de dependencias de hooks y dos de texto alternativo. No detectó la variable `index` inexistente del carrito. |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Código de salida 0 | No certifica el código JS: la configuración no habilita `checkJs`, usa `strict: false` y concentra el alcance en TS y una ruta JS explícita. |
| `npm run build` en sandbox, con variables ficticias | Código de salida 1 | `EACCES` al descargar Roboto desde Google Fonts. Es una limitación del entorno observado, no una prueba de fallo lógico de la aplicación. |
| Repetición del build con red habilitada y variables ficticias | Código de salida 0; 24/24 entradas generadas; errores de MongoDB registrados | Compilación, tipos, generación y trazas completados. Intentó conectarse al MongoDB ficticio en `127.0.0.1:1`; este éxito no acredita conectividad ni operación con servicios reales. |
| `node reports/2026-10-31/verify-security.mjs` | Código de salida 0; seis comportamientos inseguros reproducidos | Pruebas de caracterización con sustitutos; el éxito del script confirma los problemas, no la seguridad. |
| `node reports/2026-10-31/verify-functional.cjs` | Código de salida 0; dos fallas reproducidas | Componentes con dependencias y estado sintéticos. |

Las advertencias de hooks corresponden a edición de producto, detalle de pedido, edición de usuario y carrito global. No se encontró script `test`, suite de pruebas de aplicación ni flujos de CI versionados en la inspección. Los dos scripts de este reporte son evidencia puntual y no reemplazan una suite mantenida.

## 8. Dependencias y documentación contrastada

Next.js `14.0.0` pertenece a una rama que la [política oficial de soporte](https://nextjs.org/support-policy) lista como no soportada. La versión local cae en el rango publicado del aviso [GHSA-h25m-26qc-wcjf](https://github.com/vercel/next.js/security/advisories/GHSA-h25m-26qc-wcjf), relativo a denegación de servicio en Server Components. La explotación concreta depende de los endpoints y funcionalidades activados; no se ejecutaron cargas de ataque.

La [actualización oficial del 14 de octubre de 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026) publica correcciones para ramas mantenidas. Sus vulnerabilidades tienen condiciones específicas —Cache Components, optimización SVG en Linux o Server Actions— que no se presuponen presentes en este proyecto. **Actualizar a una rama soportada y al parche vigente es una prioridad; este reporte no certifica una versión objetivo ni sustituye una auditoría del lockfile.**

Se consultó Context7, resolviendo primero `/vercel/next.js`, para contrastar exportaciones de rutas y autorización en Route Handlers. La [guía oficial de autenticación](https://nextjs.org/docs/app/guides/authentication) indica que las rutas requieren comprobaciones de sesión y permisos en el servidor. La colección consultada corresponde a documentación actual/canary, no a una referencia exacta de 14.0.0. La evidencia de ejecución del proyecto prevalece sobre diferencias de comportamiento entre versiones; no se observó un error de exportaciones que impidiera este build.

## 9. Configuración y preparación para despliegue

Variables detectadas con valor en el `.env` local: `MONGO_URL`, `NEXTAUTH_URL`, `SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MY_AWS_ACCESS_KEY`, `MY_AWS_SECRET_KEY`, `STRIPE_SK`, `STRIPE_PK`, `STRIPE_SIGN_SECRET`. Su presencia **no acredita validez, permisos ni vigencia**. `STRIPE_PK` no se encontró referenciada mediante `process.env` en `src`.

`.env` está ignorado y no apareció como archivo rastreado en el estado actual de Git. No se inspeccionó su historial. No se detectó `.env.example`, documentación operativa específica, política de respaldo, prueba de restauración, configuración CI/CD, monitoreo o procedimiento de reversión en los archivos inspeccionados. Pueden existir fuera del repositorio; su estado es desconocido.

Antes de liberar:

1. Cerrar los P0 y ejecutar una matriz de autorización real sobre cada endpoint sensible.
2. Corregir los P1 funcionales y de integridad; validar ambos métodos de inicio de sesión.
3. Actualizar dependencias y fijar runtime y gestor de paquetes; verificar instalación reproducible desde el lockfile.
4. Completar un build limpio en un entorno de prueba con datos y credenciales independientes de producción. Revisar conexiones iniciadas al importar `mongoConnect.js` y cuándo se generan las respuestas del catálogo.
5. Ejecutar compra de prueba, cancelación, notificación firmada, reintento, rechazo de firma inválida y conciliación del importe. Validar moneda, envío y direcciones.
6. Verificar permisos efectivos de S3, MongoDB y proveedores OAuth; configurar HTTPS, URL de retorno y webhook del entorno de destino.
7. Documentar despliegue, respaldo, restauración y reversión; agregar alertas por fallos de API, conexión y webhook con logs que protejan datos personales.

No se proporcionó URL de producción y no se inspeccionó un proveedor de hosting. Disponibilidad, SSL, DNS, tráfico, respaldos, costos, latencia y estado real de pagos quedan pendientes de evidencia externa.

## 10. Plan de atención y criterios de cierre

| Orden | Trabajo | Criterio de aceptación |
|---|---|---|
| 1 — P0 | Autorización de perfil, roles y pedidos; respuestas sin hashes | Usuario anónimo y tercero rechazados; usuario normal no cambia roles; solo propietario/admin acceden a datos permitidos; ninguna respuesta contiene `password`. |
| 2 — P1 | Registro, subida de archivos y controles de abuso | Entradas inválidas retornan 4xx; contraseñas rechazadas según política; archivos no permitidos no alcanzan S3; cargas y solicitudes están acotadas. |
| 3 — P1 | Carrito, perfil y sesiones | Eliminación correcta aun con productos repetidos; perfil anónimo redirige; ambos proveedores conservan sesión tras recargar. |
| 4 — P1 | Integridad de checkout y webhook | Propietario y precios proceden del servidor; importes coinciden; reintentos controlados; webhook funciona con proceso recién iniciado. |
| 5 — P1 | Dependencias y build reproducible | Rama soportada, auditoría de dependencias revisada y build limpio completo en entorno de prueba. |
| 6 — P2 | Validación de esquemas, errores y operación | Esquemas de entrada y datos consistentes; paginación; estados de error; CI con verificaciones útiles y procedimientos operativos probados. |

No se asigna porcentaje de avance porque no hay un alcance de producto ni criterios de aceptación acordados contra los cuales calcularlo. El código demuestra una base funcional amplia; las fallas de autorización, la integridad de datos y la validación operativa impiden considerarlo listo para producción.

## Archivos de evidencia reproducible

- `verify-security.mjs` y `security-results.json`: seis comprobaciones de lógica de rutas.
- `verify-functional.cjs` y `functional-results.json`: dos comprobaciones de componentes.
- `VERIFICACIONES.md`: resultados finales y limitaciones de la ejecución.

La revisión agregó únicamente archivos bajo `reports/2026-10-31`. No corrigió lógica de la aplicación, no modificó `.env` ni cambió el lockfile. La compilación regeneró artefactos ignorados bajo `.next`.
