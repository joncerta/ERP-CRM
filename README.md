# ERP-CRM

Plataforma modular: un core compartido (tenants, usuarios, roles/permisos,
catálogo de módulos activables, monedas, i18n) sobre el que corren módulos de
negocio independientes. El primer módulo es **CRM comercial**: contactos,
leads, pipeline de oportunidades y cotizaciones con seguimiento.

## Stack

- **Backend**: NestJS + TypeScript + TypeORM + PostgreSQL (`apps/api`)
- **Frontend**: Vue 3 + TypeScript + Vite + Pinia + vue-i18n (`apps/web`)
- **Multi-tenant**: aislamiento row-level (`tenant_id` filtrado explícitamente
  en cada consulta de servicio)
- **Infra objetivo**: Railway (API + Postgres), Netlify (frontend)

## Arranque local con Docker (recomendado)

Levanta todo (Postgres + API + Frontend + visor de base de datos) con un
solo comando, sin instalar Node ni Postgres en tu máquina:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Adminer (ver la base de datos): `http://localhost:8080`

El contenedor de la API corre las migraciones y el seed automáticamente
cada vez que arranca (ambos son idempotentes), así que no hay pasos
manuales adicionales. El código de `apps/api` y `apps/web` está montado
como volumen, así que los cambios que hagas en el host recargan solo
(hot reload) dentro del contenedor.

Para cambiar `JWT_SECRET` o `PLATFORM_ADMIN_KEY` de sus valores por
defecto, crea un archivo `.env` en la raíz del repo (al lado de
`docker-compose.yml`) con:

```
JWT_SECRET=algo-mas-seguro
PLATFORM_ADMIN_KEY=otra-clave-solo-tuya
```

Para apagar todo: `docker compose down` (agrega `-v` si además quieres
borrar los datos de Postgres).

### Ver la base de datos que corre en Docker

**Opción 1 — Adminer (navegador, sin instalar nada):**
Abre `http://localhost:8080` y entra con:
- Sistema: `PostgreSQL`
- Servidor: `postgres`
- Usuario: `erp_crm`
- Contraseña: `erp_crm`
- Base de datos: `erp_crm`

**Opción 2 — psql dentro del contenedor:**

```bash
docker compose exec postgres psql -U erp_crm -d erp_crm
```

**Opción 3 — un cliente gráfico en tu máquina** (TablePlus, DBeaver,
Postico, pgAdmin...): el puerto 5432 de Postgres está publicado al host,
así que te conectas como si fuera una base local:
- Host: `localhost`
- Puerto: `5432`
- Usuario / contraseña / base de datos: `erp_crm` / `erp_crm` / `erp_crm`

## Arranque local sin Docker (alternativa)

### 1. Base de datos

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd apps/api
cp .env.example .env   # ajusta JWT_SECRET y PLATFORM_ADMIN_KEY
npm install
npm run migration:run
npm run seed            # monedas + catálogo de módulos
npm run start:dev
```

La API queda en `http://localhost:3000/api`. `npm run seed` deja además un
tenant administrador listo para entrar (ver siguiente sección).

### 3. Frontend

```bash
cd apps/web
cp .env.example .env
npm install
npm run dev
```

## Tenants por defecto (seed)

`npm run seed` crea, además de monedas y catálogo de módulos, dos tenants
listos para usar si todavía no existen (idempotente, correrlo de nuevo no
los duplica):

**Admin de plataforma** — no es un cliente, es el operador del SaaS: ve
todos los tenants y puede activarles/quitarles módulos desde
`Plataforma` en el menú (permiso `platform.tenants.manage`, que ningún
tenant cliente puede tener aunque su rol sea Administrador con `*`).
- Empresa (slug): `admin`
- Correo: `admin@admin.com`
- Contraseña: `Admin123!`

**Cliente demo** — un tenant normal como cualquier otro, con el módulo
`crm` activo, para probar la app como la vería un cliente real.
- Empresa (slug): `cliente`
- Correo: `admin@cliente.com`
- Contraseña: `Cliente123!`

Para no usar estos valores por defecto (recomendado si vas a desplegar),
define antes de sembrar las variables `SEED_TENANT_*` / `SEED_ADMIN_*`
(admin de plataforma) y `SEED_CLIENT_*` (cliente demo) — ver
`apps/api/.env.example`.

## Alta de un tenant adicional (onboarding manual)

Para crear más clientes además del tenant admin del seed, usa la clave de
`PLATFORM_ADMIN_KEY`:

```bash
curl -X POST http://localhost:3000/api/platform/tenants \
  -H "Content-Type: application/json" \
  -H "x-platform-admin-key: <PLATFORM_ADMIN_KEY>" \
  -d '{
    "name": "Acme SAS",
    "slug": "acme",
    "defaultLocale": "es",
    "defaultCurrencyCode": "COP",
    "adminEmail": "admin@acme.test",
    "adminPassword": "contraseña-segura",
    "adminFullName": "Admin Acme"
  }'
```

Esto crea el tenant, los roles por defecto (Administrador / Vendedor), el
primer usuario y activa el módulo `crm`. Con eso ya se puede hacer login en
`POST /api/auth/login` con `{ tenantSlug, email, password }`.

## Módulos activables

El catálogo vive en `module_definitions` (sembrado por `npm run seed`) y el
estado por tenant en `tenant_modules`. Un `ModuleEnabledGuard` global
bloquea cualquier endpoint marcado con `@RequireModule('crm')` (o
`@RequireModule('inventory')`) si el tenant no lo tiene activo. Dos formas
de activar/desactivar:

- **Un tenant sobre sí mismo** (permiso `core.modules.write`, cualquier
  Administrador de ese tenant): `POST /api/modules/:code { "isEnabled": true }`
- **El admin de plataforma sobre cualquier tenant** (permiso
  `platform.tenants.manage`, ver sección anterior): pantalla `Plataforma`
  en el frontend, o `PATCH /api/platform/tenants/:tenantId/modules/:code`

El sidebar del frontend ahora refleja esto de verdad: `AppLayout.vue`
consulta `GET /api/modules/enabled` al cargar y solo muestra los enlaces
de CRM/Inventario si el módulo correspondiente está activo — antes de
este cambio el nav de CRM se mostraba siempre y un tenant sin el módulo
solo se enteraba al hacer clic y recibir un 403.

## Inventario (segundo módulo del ERP, más allá del CRM)

Multi-bodega desde el diseño inicial — el stock se guarda por
producto **y** bodega, no como un total único. Vive en
`src/inventory/` (`WarehousesModule`, `ProductsModule`, `StockModule`
lógicamente, aunque técnicamente son un solo `InventoryModule` porque
comparten las mismas tablas).

- **Bodegas** (`/api/inventory/warehouses`): CRUD simple. No se puede
  eliminar una bodega con movimientos registrados.
- **Productos** (`/api/inventory/products`): CRUD con SKU único por
  tenant (409 si se repite). Tampoco se puede eliminar uno con
  movimientos registrados. `unitId` y `warehouseId` son obligatorios;
  `categoryId` es opcional. `warehouseId` es la bodega "dueña"/principal
  del producto — un campo aparte del stock multi-bodega, que sigue
  permitiendo saldo en varias bodegas independientemente de esto.
- **Categorías y unidades** (`/api/inventory/categories`,
  `/api/inventory/units`): catálogo simple por tenant (antes eran campos
  de texto libre en el producto). CRUD gateado por los mismos permisos
  `inventory.products.{read,write}`; no se puede eliminar una categoría
  o unidad en uso por algún producto. Pantalla `Categorías y unidades`
  en el nav de Inventario.
- **Stock** (`/api/inventory/stock`):
  - `GET /balances` — saldo actual por producto+bodega (filtrable por
    `productId`/`warehouseId`).
  - `GET /movements` — historial completo, más reciente primero.
  - `POST /movements { productId, warehouseId, type, quantity, direction, note? }`
    — `type` es `purchase`/`sale`/`adjustment`; `direction` (`in`/`out`)
    es independiente del `type` para no necesitar seis tipos distintos
    solo para expresar la dirección. Rechaza con 400 cualquier
    movimiento que deje el saldo en negativo — no se puede vender ni
    ajustar por debajo de cero.
  - `POST /transfers { productId, fromWarehouseId, toWarehouseId, quantity, note? }`
    — mueve stock entre dos bodegas del mismo tenant como una operación
    atómica (dos movimientos `transfer`, uno negativo y uno positivo,
    compartiendo un `transferGroupId`). Si la bodega de origen no tiene
    suficiente stock, no se ejecuta ninguna de las dos partes.

**Detalle de implementación importante**: el saldo (`inventory_stock_balances`)
es una tabla desnormalizada que se actualiza dentro de la misma
transacción de base de datos que cada movimiento — no se recalcula
sumando el historial en cada lectura. Esto es lo que hace posible
bloquear stock negativo de forma confiable (se valida contra el saldo
actual dentro de la transacción, no contra una foto vieja) y mantiene
"¿cuánto stock tengo ahora?" como una consulta barata sin importar
cuántos movimientos se acumulen con el tiempo.

Activado por defecto para el tenant demo `cliente` en el seed. Los
permisos son `inventory.warehouses.{read,write}`,
`inventory.products.{read,write}`, `inventory.stock.{read,write}` — el
rol `Vendedor` sembrado no los incluye por defecto (es un módulo
operativo, no comercial), pero un Administrador puede dárselos a
cualquier rol personalizado desde la pantalla `Roles`.

## Gestión de equipo (Usuarios)

Cualquier Administrador de un tenant puede invitar compañeros de equipo
desde la pantalla `Usuarios` (visible con el permiso `core.users.read`):

- `POST /api/users` (permiso `core.users.write`) — crea el usuario con
  email/contraseña/rol.
- `PATCH /api/users/:id/active` (mismo permiso) — activa/desactiva. Un
  usuario desactivado no puede iniciar sesión (mismo mensaje genérico que
  credenciales inválidas, para no filtrar el estado de la cuenta). Nadie
  puede desactivarse a sí mismo, para no dejar un tenant sin admin activo.
- `GET /api/roles` alimenta el selector de rol al invitar.

## Roles personalizados

Cada tenant arranca con dos roles del sistema (`Administrador` con `'*'`,
`Vendedor` con permisos de CRM) sembrados por el seed — no se pueden
editar ni eliminar. Desde la pantalla `Roles` (permiso `core.roles.read`,
gestión con `core.roles.write`) se pueden crear roles personalizados
eligiendo permisos puntuales de una lista fija.

**Importante — límite de seguridad**: ningún rol de tenant puede incluir
un permiso `platform.*`, ni siquiera escribiéndolo literalmente en el
array de permisos. `RolesService` lo rechaza con 400 al crear/editar —
esto cierra una vía de escalación que existía antes de este cambio: el
`PermissionsGuard` ya bloqueaba el comodín `'*'` para permisos
`platform.*`, pero no verificaba si el permiso venía dado explícitamente
en el array, así que un Administrador de tenant podía crear un rol con
`permissions: ["platform.tenants.manage"]` y asignárselo a un usuario
para verlo y gestionar todos los tenants de la plataforma.

Un rol con usuarios asignados no se puede eliminar (`400`) hasta
reasignarlos.

## Recuperación y cambio de contraseña

- `POST /api/auth/forgot-password { tenantSlug, email }` — siempre
  responde `204`, exista o no la cuenta (para no permitir enumerar
  correos). Si existe y está activa, genera un token de un solo uso
  (vence en 1 hora) y envía el link por correo (`EmailService`, ver
  sección de cotizaciones).
- `POST /api/auth/reset-password { token, newPassword }` — cambia la
  contraseña y revoca **todas** las sesiones activas del usuario en
  tiempo real (mismo mecanismo de `session:revoked` que el single-session).
- `PATCH /api/users/me/password { currentPassword, newPassword }` —
  cualquier usuario autenticado puede cambiar su propia contraseña desde
  `Configuración`. También revoca todas las sesiones (incluida la
  actual), forzando a iniciar sesión de nuevo.

## Branding por tenant

Cada tenant puede tener sus propios colores de marca (primario y
secundario) y un logo, configurados únicamente por el admin de plataforma —
`PATCH /api/platform/tenants/:tenantId/branding { primaryColor, secondaryColor, logoData }`
(colores en hex `#RRGGBB`, o `null` para volver a la paleta por defecto).
Se aplican en el frontend sobreescribiendo variables CSS (`--color-primary`,
`--color-heading`, etc.):

- En el **login**, apenas se escribe el slug de la empresa (con debounce),
  vía el endpoint público `GET /api/platform/tenants/by-slug/:slug/branding`
  — no requiere sesión, ya que hace falta conocer el slug para loguearse
  de todas formas.
- Tras autenticarse, en **toda la app**, leyendo el mismo dato desde
  `GET /api/tenant-settings` (que ya devuelve la config de sesión del
  tenant propio).

**Logo**: `logoData` es un data URI base64 (`data:image/png;base64,...`),
validado en el DTO por tipo (`png`/`jpeg`/`svg+xml`/`webp`) y tamaño
(~350KB) y guardado directamente en la fila del tenant — no en disco,
porque los contenedores de la app son efímeros y perderían cualquier
archivo local en cada redeploy. Se sube desde el panel `Plataforma`
(input de archivo → `FileReader` → base64 en el navegador) y reemplaza la
marca de letra tanto en el login como en el sidebar de la app cuando está
configurado.

## Sesiones

El JWT por sí solo no se puede revocar antes de que expire, así que cada
login crea una fila en `sessions` y el JWT lleva su id (`sid`). Cada
request autenticado valida contra esa sesión, lo que permite:

- **Single-session**: iniciar sesión en un dispositivo/navegador nuevo
  revoca automáticamente cualquier otra sesión activa del mismo usuario.
  El dispositivo anterior se desconecta **de inmediato**, no en su
  siguiente petición HTTP: el login empuja un evento `session:revoked`
  por WebSocket a la sesión revocada, que fuerza el logout en el acto
  (ver "Notificaciones en tiempo real" abajo).
- **Logout real**: `POST /api/auth/logout` revoca la sesión en el
  servidor, no solo borra el token del lado del cliente.
- **Expiración por inactividad, configurable por tenant**: cada tenant
  define sus propios minutos de inactividad (o ninguno) desde
  `Configuración` en el frontend, o `GET`/`PATCH /api/tenant-settings`
  (permiso `core.tenant.settings.write`). Sin configurar, solo aplica la
  expiración fija del JWT (`JWT_EXPIRES_IN`, 8h por defecto).

## Notificaciones en tiempo real

Backend expone un WebSocket (Socket.IO, mismo puerto que la API — no bajo
el prefijo `/api`) autenticado con el mismo JWT del login
(`socket.handshake.auth.token`). Cada notificación también se persiste en
`notifications` y es consultable por REST:

- `GET /api/notifications` — últimas 50 del usuario autenticado.
- `PATCH /api/notifications/:id/read` / `PATCH /api/notifications/read-all`

Disparadores actuales:

- **Cotización aceptada/rechazada**: notifica al dueño de la cotización
  (`ownerUserId`) apenas el cliente responde desde el link público.
- **Sesión revocada por single-session**: ver sección "Sesiones" — no se
  guarda como notificación de bandeja, es un evento de control
  (`session:revoked`) que fuerza el logout inmediato en el dispositivo
  desconectado.

El frontend se conecta desde `AppLayout.vue` (una vez autenticado) y
muestra una campana con contador de no leídas en la barra superior.

## Envío de cotizaciones por correo

Al presionar "Enviar" en una cotización, además de cambiar su estado a
`sent`, el backend intenta emailear el link público al contacto asociado
(si la cotización tiene un `contactId` y ese contacto tiene `email`). Se
envía por SMTP vía `nodemailer`, configurable con `SMTP_HOST`/`SMTP_PORT`/
`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` (ver `.env.example`). Si `SMTP_HOST`
no está configurado, o el envío falla, no rompe la petición — la
cotización queda igual marcada como enviada y el link público sigue
disponible para compartir manualmente. Es decir: correo real es un
"mejor esfuerzo", no un requisito para que el flujo comercial funcione.

## Feedback de acciones (toasts)

Store global `stores/toast.ts` + `<ToastContainer />` (montado una vez en
`App.vue`), usado en todas las pantallas CRUD para éxito/error al
guardar, eliminar o ejecutar acciones de fila (activar/desactivar,
enviar cotización, mover etapa en el pipeline, etc.). Reemplaza un patrón
previo con un bug real: varias pantallas reutilizaban el `ref` de error
de carga de página dentro de acciones de fila, así que una acción fallida
después de cargar la tabla reemplazaba toda la tabla por un mensaje de
error en vez de solo mostrar el error puntual. El interceptor de axios
(`api/client.ts`) también dispara un toast genérico cuando una petición
no obtiene respuesta del servidor (caído, red, CORS).

## Auditoría y logs

Cada creación, edición o eliminación de cualquier entidad tenant-scoped
queda registrada automáticamente en `audit_logs`, con quién la hizo y
qué cambió — sin que cada servicio tenga que acordarse de registrarlo
por su cuenta.

- **`AuditSubscriber`** (`src/audit/audit.subscriber.ts`) es un
  `EntitySubscriberInterface` de TypeORM sin `listenTo()` — TypeORM lo
  invoca en el insert/update/remove de **toda** entidad de la app. El
  subscriber filtra por `tenantId` (si la entidad no lo tiene, como
  `Currency` o `Tenant`, se ignora) y escribe una fila con `entityType`,
  `entityId`, `action`, y `changes` (diff antes/después en updates,
  snapshot completo en creates/deletes). Se registra a sí mismo contra
  el `DataSource` en su constructor en vez de listarse en
  `typeorm.config.ts`, porque necesita inyección de dependencias de Nest.
- **`RequestContext`** (`src/common/context/request-context.ts`) usa
  `AsyncLocalStorage` para que el subscriber sepa qué usuario está detrás
  de un cambio aunque esté varias capas de servicios por debajo de la
  request HTTP. Un interceptor global (`RequestContextInterceptor`,
  registrado después de los guards en `app.module.ts`) abre el contexto
  con `tenantId`/`userId` al inicio de cada request autenticada.
- Un fallo al escribir el log **nunca** rompe la operación de negocio que
  lo disparó — se atrapa y se manda a `Logger.error`, no se relanza.
- `GET /api/audit-logs` (permiso `core.audit.read`) soporta filtros por
  usuario, tipo de entidad y rango de fechas, paginado. Pantalla
  `Auditoría` en el nav (visible solo con ese permiso).

## Editar y eliminar registros

Empresas, Contactos y Leads se pueden editar y eliminar desde su propia
pantalla (botones "Editar"/"Eliminar" por fila). Oportunidades se editan
haciendo clic en su tarjeta del Pipeline (nombre, valor, fecha estimada
de cierre) y desde ahí también se pueden marcar como perdidas — no tienen
eliminación directa porque "perdida" ya es la forma de cerrarlas. Las
Cotizaciones solo se pueden editar mientras están en estado `draft`
(antes de enviarlas); una vez enviadas, el backend rechaza la edición.

## Asignación de dueño, filtros y búsqueda

Leads y Oportunidades tienen un selector de "Dueño" (cualquier usuario
del tenant, vía `GET /api/users`) y un checkbox "Solo mías" que filtra la
lista por el usuario autenticado — útil ahora que un tenant puede tener
varios vendedores. Cotizaciones tiene el mismo filtro (el dueño se asigna
automáticamente a quien la crea, no es editable). Empresas, Contactos,
Leads y Cotizaciones también tienen un buscador de texto simple
(filtrado en el cliente, sin paginación todavía).

Si el usuario logueado no tiene `core.users.read` (p. ej. un Vendedor),
el selector de dueño no se muestra — el listado de usuarios devuelve 403
y el formulario lo absorbe en silencio en vez de romper la pantalla.

## Moneda de cotización

El formulario de Cotizaciones tiene un selector de moneda (`GET
/api/currencies`, catálogo sembrado en `run-seed.ts` — no es
tenant-scoped, es compartido por toda la plataforma) en vez del valor
`USD` fijo que tenía antes. El DTO del backend ya aceptaba cualquier
código de 3 letras; el selector solo lo conecta a datos reales en vez de
dejarlo como texto libre implícito.

## Descarga de cotización en PDF

`GET /api/crm/quotes/:id/pdf` (autenticado) y
`GET /api/public/quotes/:token/pdf` (público, mismo link que usa el
cliente) generan un PDF con `pdfkit` al vuelo — no se guarda en disco ni
en la base de datos, se arma en memoria en cada request. Botón "Descargar
PDF" tanto en la pantalla de Cotizaciones como en la vista pública que ve
el cliente.

## Panel de inicio (dashboard)

`/dashboard` es ahora la pantalla de aterrizaje tras iniciar sesión para
tenants con CRM (el admin de plataforma sigue aterrizando en
`Plataforma`). Se arma en el cliente reutilizando los endpoints de
listado que ya existían (leads, oportunidades, cotizaciones,
recordatorios) — no hay un endpoint de agregación nuevo. Muestra: valor
en pipeline abierto (agrupado por moneda, por si el tenant cotiza en más
de una), oportunidades abiertas, leads nuevos del mes, cotizaciones
pendientes de respuesta, recordatorios vencidos, y un desglose de
oportunidades por etapa.

## Tests (backend)

```bash
cd apps/api
npm run test        # unitarios — guards, servicios (sin DB, todo mockeado)
npm run test:e2e    # contra Postgres real: bootstrap de tenant, aislamiento
                     # multi-tenant, gating de módulos, flujo completo
                     # lead → oportunidad → cotización → seguimiento
```

`test:e2e` necesita una base con las migraciones aplicadas (`npm run
migration:run`). Crea sus propios tenants con slugs únicos por corrida
(`e2e-<timestamp>-...`), así que no toca ni depende de los tenants
`admin`/`cliente` del seed — es seguro correrlo repetidamente sin resetear
la base.

## Estructura

```
apps/
  api/   NestJS — src/core (tenants, users, roles, auth, modules-catalog,
         currencies) y src/crm (companies, contacts, leads,
         pipeline-stages, opportunities, quotes)
  web/   Vue 3 — login, pipeline (kanban), leads, empresas, cotizaciones
         y la vista pública de cotización (/q/:token)
```
