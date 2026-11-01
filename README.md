# GarnachApp — Roll Burrito Hub

Aplicación de pedidos con Next.js 16, React 19, Tailwind CSS 4, NextAuth 4,
MongoDB/Mongoose, Stripe Checkout y almacenamiento de imágenes en S3.

## Entorno local

Usar Node.js 24 LTS (archivo `.nvmrc`) y Yarn 1.22.22. El proyecto conserva
`yarn.lock` como único lockfile; no mezclar instalaciones con npm.

```powershell
npx --yes yarn@1.22.22 install --frozen-lockfile
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Copiar `.env.example` solamente si todavía no existe `.env`. Configurar una base
MongoDB y credenciales de desarrollo propias. Para `SECRET`, generar un valor
aleatorio; no compartir credenciales ni subir `.env` a Git.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx --yes yarn@1.22.22 dev
```

Abrir [localhost:3000](http://localhost:3000). Google requiere configurar su URL
de retorno `/api/auth/callback/google`. Stripe requiere la clave secreta y un
webhook firmado que entregue `checkout.session.completed` a `/api/webhook`.
La app conserva cobros en **USD** y envío fijo de **5 USD**.

## Verificación

```powershell
npx --yes yarn@1.22.22 lint
npx --yes yarn@1.22.22 typecheck
npx --yes yarn@1.22.22 test
npx --yes yarn@1.22.22 build
npx --yes yarn@1.22.22 test:smoke
npx --yes yarn@1.22.22 start
```

El build descarga Roboto desde Google Fonts y requiere acceso a ese servicio.
Las conexiones a MongoDB y Stripe se inicializan al atender solicitudes; las
pruebas automatizadas sustituyen las integraciones por datos en memoria.
No ejecutar pruebas de compra con credenciales de producción.

## Cambios de compatibilidad

- `next lint` fue sustituido por ESLint con configuración plana.
- La autenticación utiliza sesiones JWT para compatibilizar Google y credenciales.
  Las sesiones anteriores pueden requerir volver a iniciar sesión.
- El SDK de Stripe fija la API `2023-10-16`, utilizada previamente por la app.
  Modernizar ese contrato requiere probar pagos y configurar el webhook por separado.
- El driver MongoDB directo permanece en la rama 6 porque el adaptador de Auth
  declara esa compatibilidad; Mongoose administra su propia dependencia del driver.
- La carga de imágenes exige sesión y admite PNG, JPEG y WebP hasta 5 MB.
  Se conserva el uso de ACL pública existente; verificar la política de S3 antes de desplegar.
- Tailwind 4 requiere navegadores modernos: Safari 16.4+, Chrome 111+ y Firefox 128+.
- Las pruebas de `tests/` verifican permisos, precios y regresiones con datos sintéticos.
  Los scripts de `reports/2026-10-31/` son evidencia histórica del diagnóstico anterior.

El reporte inicial está en `reports/2026-10-31/REPORTE-TECNICO.md`.
El resumen de la actualización está en `reports/2026-10-31/ACTUALIZACION.md`.

## Referencias

- [Migración a Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Migración a Tailwind CSS 4](https://tailwindcss.com/docs/upgrade-guide)
- [Migración a Mongoose 9](https://mongoosejs.com/docs/migrating_to_9.html)
