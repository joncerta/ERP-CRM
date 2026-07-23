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

### Datos mock para demo (`npm run seed:demo`)

`npm run seed` solo crea infraestructura (tenants, monedas, catálogo de
módulos) — el tenant `cliente` queda con todos sus módulos activos pero
sin ningún registro de negocio. `npm run seed:demo` (correrlo *después* de
`npm run seed`) llena ese tenant con un set de datos mock coherente y
enlazado entre sí, tocando los 14 módulos: 6 empresas y 12 contactos, 6
leads (uno de ellos capturado a través de un formulario público de
Marketing), 6 oportunidades repartidas en el pipeline (una ganada, una
perdida), 4 cotizaciones en distintos estados (borrador/enviada/aceptada/
rechazada), 2 bodegas con 8 productos y su stock inicial, 3 proveedores y
3 órdenes de compra (borrador/enviada/recibida — la recepción sí mueve
stock), una cuenta bancaria con un depósito y un asiento manual, 3
facturas (una con abono parcial, una nacida de la cotización aceptada), 3
activos fijos, 2 artículos de base de conocimiento y 4 tickets, y 2
campañas de marketing (una enviada) más una secuencia de nutrición con un
contacto inscrito.

Es **idempotente por conteo**: si el tenant ya tiene alguna empresa
registrada, no hace nada (no duplica ni sobreescribe). Bootstrapea el
contexto completo de Nest (`NestFactory.createApplicationContext`) y crea
todo a través de los mismos servicios que usa la API — no inserta filas a
mano — así que numeración de documentos, totales, saldos de stock y
asientos contables quedan tan consistentes como si un usuario real los
hubiera creado uno por uno. También crea dos usuarios adicionales con rol
Vendedor (`laura.gomez@cliente.com` / `carlos.ramirez@cliente.com`,
clave `Vendedor123!`) para que los registros no queden todos a nombre del
Administrador.

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

## Paginación, búsqueda y orden server-side

Los 11 listados del sistema (Empresas, Contactos, Leads, Cotizaciones,
Productos, Bodegas, Categorías, Unidades, Roles, Usuarios, Stock
—balances y movimientos—) usan paginación real en el servidor en vez de
traer todas las filas y filtrar en el navegador.

- **Backend**: `TenantScopedService.findPaginatedForTenant(tenantId,
  query, options)` (`src/common/services/tenant-scoped.service.ts`) es el
  método compartido — arma un `SelectQueryBuilder` con scoping por
  tenant, búsqueda `ILIKE` opcional sobre columnas configurables, un
  callback opcional de filtros extra, y orden con **lista blanca de
  columnas permitidas** (nunca se confía en el nombre de columna que
  llega por query param, para evitar inyección SQL vía `ORDER BY`).
  `UsersService` y `StockService` no heredan de `TenantScopedService`
  (tienen su propio repo), así que implementan la misma lógica a mano.
  Cada endpoint de listado acepta un parámetro `page` **opcional**: si no
  viene, responde igual que antes (un array plano), así que los
  selectores de formularios (`listCompanies()`, `listUsers()`, etc.) que
  ya llamaban a estos mismos endpoints sin paginar siguen funcionando sin
  cambios. Solo cuando la pantalla pide `page` explícitamente, la
  respuesta cambia a `{ items, total, page, pageSize }`.
- **DTOs de query** (`ListQueryDto` en `src/common/dto/list-query.dto.ts`
  y subclases por entidad) son obligatorios porque el `ValidationPipe`
  global tiene `forbidNonWhitelisted: true` — cualquier filtro extra
  (`companyId`, `status`, `categoryId`...) tiene que declararse como
  propiedad real del DTO o la petición se rechaza con 400.
- **Frontend**: `usePaginatedList()` (`src/composables/usePaginatedList.ts`)
  es el estado compartido de página/búsqueda/orden/filtros/loading/error
  detrás de cada grilla — la vista solo aporta la función de fetch. El
  componente `Pagination.vue` renderiza el control "‹ Página X de Y ›" y
  solo aparece si hay más de una página. La búsqueda tiene debounce de
  300ms para no disparar una petición por cada tecla.

## Estructura organizacional

Módulo `core/org` (`GET/POST/PATCH/DELETE /api/org/*`, permisos
`core.org.read` / `core.org.write`): sucursales, centros de costo,
departamentos, cargos, numeración de documentos y jerarquía de reporte
entre usuarios. Pantalla `Estructura organizacional` en el nav.

- **Sucursales, centros de costo, departamentos, cargos** son catálogos
  tenant-scoped normales (`BranchesService`, `CostCentersService`, etc.,
  todos sobre `TenantScopedService`), con el mismo patrón CRUD que
  bodegas/categorías. Una sucursal solo puede eliminarse si no tiene
  departamentos; un departamento si no tiene cargos ni usuarios; un cargo
  si no tiene usuarios.
- **Jerarquía de reporte**: `User` gana `managerId`, `branchId`,
  `departmentId`, `positionId` (columnas nullable, sin relación tipada
  para evitar un eager-load circular). Se asignan vía
  `PATCH /api/users/:id/org`. `UsersService.assignOrg()` rechaza que un
  usuario sea su propio líder y camina la cadena de `managerId` hacia
  arriba para rechazar cualquier asignación que cerraría un ciclo. La
  pantalla de Organigrama lista cada usuario con selectores para su líder,
  sucursal, departamento y cargo, más un árbol simple de quién reporta a
  quién — es la base sobre la que el módulo de notificaciones (próxima
  fase) escala una notificación al líder de quien la disparó.
- **Numeración de documentos** (`DocumentSeries`, tabla
  `org_document_series`): una secuencia por tipo de documento
  (`documentType`, hoy solo `'quote'`) opcionalmente por sucursal —
  `branchId` nulo es la serie por defecto de todo el tenant.
  `DocumentSeriesService.consumeNext()` reclama el siguiente número
  dentro de una transacción (lee, incrementa, guarda) y **auto-provisiona**
  la serie por defecto la primera vez que se usa, así que no hace falta
  configurar nada para que un tenant nuevo empiece a numerar. La migración
  `AddOrgStructure` hace el backfill de la serie de cotizaciones de cada
  tenant existente a partir de su conteo actual, para que la numeración
  siga donde iba en vez de reiniciar en `COT-000001`.
  `QuotesService.nextQuoteNumber()` ahora delega aquí en vez de contar
  filas de `crm_quotes`.
- **Zona horaria por tenant**: `Tenant.timezone` — valor de referencia que
  una sucursal puede sobreescribir con la suya propia. Se edita en
  `Configuración` vía `PATCH /api/tenant-settings/org` (mismo permiso que
  la configuración de sesión, `core.tenant.settings.write`), con un
  desplegable poblado desde `Intl.supportedValuesOf('timeZone')` (la base
  de datos IANA completa del navegador) en vez de un campo de texto libre
  — así no hay que mantener a mano una lista de zonas horarias válidas.
- **Catálogo de impuestos** (`core/taxes`, `GET/POST/PATCH /api/taxes`,
  permisos `core.taxes.read` / `core.taxes.write`): reemplaza el antiguo
  par `Tenant.taxLabel`/`taxRatePercent` (un solo impuesto por tenant) por
  una tabla `Tax` (nombre, tasa, activo, y un flag `isDefault` — solo uno
  puede ser el de por defecto, `TaxesService` desmarca cualquier otro al
  fijar uno nuevo). Administración simple en `Configuración` → "Impuestos"
  (crear, editar, activar/desactivar, marcar por defecto). No está detrás
  de `@RequireModule` — es compartido por Cotizaciones (CRM) y Facturas
  (Facturación), que son módulos activables por separado, igual que
  Monedas.
  - `Quote`/`Invoice` ganan `taxId` (nullable): al crear o editar, si se
    selecciona un impuesto del catálogo su tasa gana sobre cualquier
    número escrito a mano (`taxRate` sigue existiendo en el DTO como
    respaldo manual — "Otro" en el desplegable — para tasas puntuales que
    no ameritan estar en el catálogo). Si el `taxId` no resuelve a un
    impuesto activo del tenant (borrado/desactivado después de creado el
    documento), se usa `taxRate` en su lugar en vez de fallar la petición.
    `QuotesService.createRevision()` y
    `InvoicesService.createFromQuote()` propagan el `taxId` original.

## Notificaciones con escalamiento por jerarquía

El motor de notificaciones en tiempo real (WebSocket + campana, ya
existente) ahora conoce la jerarquía de reporte del módulo 8: cuando un
evento le notifica a un usuario, su líder directo recibe la misma
notificación además.

- **`NotificationEscalationService`** (`src/core/users/notification-escalation.service.ts`)
  envuelve `NotificationsService.notify()`: primero notifica al usuario
  que disparó el evento, y si tiene un `managerId` asignado (módulo 8),
  también notifica a ese líder — con el mensaje prefijado por el nombre
  de quien lo generó y el `type` sufijado en `.escalated`, para que se
  pueda distinguir en el histórico. Solo escala **un nivel**, no toda la
  cadena: es "alguien de mi equipo hizo X", no una notificación para cada
  ancestro en el organigrama.
  Vive en `UsersModule` (no en `NotificationsModule`) a propósito:
  `NotificationsModule` se mantiene como módulo hoja sin dependencias
  (`SessionsModule` lo necesita, y `UsersModule` ya depende de
  `SessionsModule` — si `NotificationsModule` importara `UsersModule` de
  vuelta se cerraría un ciclo).
- **Disparadores conectados**: cotización aceptada/rechazada por el
  cliente (ya existía, ahora escala) y oportunidad cerrada como ganada o
  perdida (`OpportunitiesService.moveStage()` / `closeLost()`, nuevo). El
  catálogo de eventos queda abierto para seguir ampliándose por módulo.
- **Pendiente**: preferencias por usuario de qué notificar en la app vs.
  también por correo — el catálogo de eventos hoy es fijo por tipo de
  evento, no configurable por usuario.

## Seguimiento avanzado de leads y cotizaciones

Sube de nivel lo que ya existía: de un estado plano a un embudo medible.

- **Historial de cambios de un lead**: `GET /api/crm/leads/:id/history`
  reutiliza el motor de auditoría genérico (módulo 5) en vez de construir
  un log paralelo — filtra `audit_logs` por `entityType='Lead'` y
  `entityId`, así que cualquier cambio de estado, dueño o cualquier otro
  campo ya queda ahí sin trabajo adicional. Pantalla "Historial" por lead
  en `LeadsView`.
- **Campaña de origen y prioridad**: `Lead` gana `campaign`; `priority`
  ya existía en el backend pero no estaba expuesto en el formulario —
  ahora se edita y se muestra como badge en la lista.
- **Alerta de inactividad**: un lead abierto (`new`/`contacted`/`qualified`)
  sin cambios en 5+ días se marca con un badge "Inactivo" en la lista —
  calculado en el cliente a partir de `updatedAt`, sin necesidad de un job
  en segundo plano. **Pendiente**: no dispara una notificación push real
  todavía (necesitaría un scheduler, que el backend no tiene instalado).
- **Embudo de conversión y motivos de pérdida**:
  `GET /api/crm/opportunities/funnel` cuenta oportunidades abiertas por
  etapa, total ganadas/perdidas, y agrupa `lostReason` para las perdidas.
  Panel plegable "Ver embudo de conversión" en `PipelineView`.
- **Versiones de cotización**: `POST /api/crm/quotes/:id/revise` clona una
  cotización que ya no está en borrador (enviada, vista, aceptada,
  rechazada) en un nuevo borrador — mismo cliente/ítems, número nuevo,
  `version` incrementada y `previousVersionId` apuntando a la anterior.
  `GET /api/crm/quotes/:id/versions` devuelve la cadena completa, de la
  más antigua a la más nueva. Botón "Nueva versión" en `QuotesView` para
  cotizaciones que ya salieron. **Pendiente**: flujo de aprobación interna
  antes de reenviar una versión renegociada.
- **Estado "expirada"**: `QuoteStatus` incluye `expired`, pero como no hay
  scheduler, nada lo persiste en la base de datos — se calcula al vuelo
  comparando `validUntil` contra hoy (mismo patrón que "vencida" en
  Facturas), tanto en `QuotesView` como en la página pública. El backend
  además refuerza la regla en `QuotesService.respond()`: aunque el estado
  siga siendo `sent`/`viewed`, rechaza aceptar o rechazar una cotización
  cuyo `validUntil` ya pasó.

## Actividades, visitas y agenda

Módulo `crm/activities` (`GET/POST/PATCH/DELETE /api/crm/activities`,
permisos `crm.activities.read` / `crm.activities.write`): lo que antes no
existía en absoluto — ningún registro de qué pasó con un lead o cliente
fuera de una cotización, ni calendario.

- **`Activity`** (tabla `crm_activities`) es genérica por tipo (`call`,
  `meeting`, `email`, `note`, `visit`, `task`) y se puede enlazar a un
  contacto, un lead y/o una oportunidad al mismo tiempo (todas las
  columnas son nullable e independientes) — una visita puede quedar
  atada al lead y a la oportunidad que generó, por ejemplo.
  `scheduledAt` es cuándo está planeada (reuniones, visitas, tareas);
  `completedAt` se llena al marcarla como hecha; `outcome` y
  `nextAction` capturan el resultado y el siguiente paso.
- **Agenda**: `GET /api/crm/activities/agenda` devuelve las actividades
  con `scheduledAt` futuro y `completedAt` nulo, ordenadas por fecha —
  la vista "Agenda" de `ActivitiesView`, filtrable a "solo mías".
- **Notifica en tiempo real**: agendar o completar una actividad de tipo
  `visit` dispara `NotificationEscalationService.notifyWithEscalation()`
  — el dueño y su líder directo (módulo 8) se enteran. Otros tipos de
  actividad no notifican, para no saturar la campana.
- **Pendiente**: sincronización con Google Calendar/Outlook, videollamadas
  y WhatsApp como canal registrado (hoy WhatsApp solo es un campo de
  contacto, no una actividad) — quedan fuera de este alcance porque
  requieren integraciones con APIs externas.

## Facturación

Módulo activable `sales_invoicing` (`GET/POST/PATCH /api/finance/invoices/*`,
permisos `finance.invoices.read` / `finance.invoices.write`) — facturación
ligera, deliberadamente **no electrónica ni compatible con DIAN**, para
mantener el alcance manejable.

- **`Invoice`** sigue el mismo patrón que `Quote` (ítems eager,
  numeración vía `DocumentSeriesService` con el tipo de documento
  `'invoice'` y prefijo `FAC`). Se puede crear a mano o convertir desde
  una cotización **aceptada** (`POST /finance/invoices/from-quote/:quoteId`,
  botón "Facturar" en `QuotesView`) — recalcula la tasa de impuesto
  implícita de la cotización en vez de copiar subtotal/impuesto tal cual,
  por si ha cambiado algo desde entonces.
- **Ciclo de estados**: `draft → issued → partially_paid/paid`, o
  `cancelled` en cualquier punto antes de estar pagada. Solo se edita en
  `draft`; solo se cancela si no está pagada.
- **Notas crédito/débito** (`InvoiceAdjustment`) no tocan los ítems de la
  factura — se acumulan en `adjustmentsTotal` (crédito resta, débito
  suma), y el saldo pendiente real es `total + adjustmentsTotal -
  amountPaid`.
- **Pagos y abonos** (`InvoicePayment`): cada pago registrado recalcula el
  saldo y el estado (`partially_paid` si queda saldo, `paid` si llega a
  cero), y escala una notificación al dueño de la factura y a su líder
  (módulo 8) vía `NotificationEscalationService`.
- **Recordatorios de cobro con tono escalante**: `POST
  /finance/invoices/:id/send-reminder` usa una plantilla más firme cada
  vez según `reminderCount` (amable la primera vez, directa después),
  como notificación in-app al dueño — no hay envío de correo real todavía,
  a diferencia de `QuotesService.emailQuoteToCustomer()`.
- **Facturas recurrentes** (`RecurringInvoiceTemplate`): una "receta"
  reutilizable (empresa, ítems, frecuencia) que genera una nueva factura
  en borrador con `POST .../recurring-templates/:id/generate` — es una
  acción **manual** que la persona dispara cada ciclo, no una tarea
  programada automática, porque este backend no tiene un scheduler
  instalado (`@nestjs/schedule` no es una dependencia del proyecto).
- **Pendiente**: "vencida" se calcula al vuelo en el frontend comparando
  `dueDate` contra hoy — no hay un job que marque `status = 'overdue'` en
  la base de datos ni que notifique automáticamente al vencer, por la
  misma razón de no tener scheduler.

## Compras y proveedores

Módulo activable `purchasing` (`GET/POST/PATCH /api/finance/suppliers/*`,
`/api/finance/purchase-orders/*`, `/api/finance/supplier-invoices/*`,
permisos `finance.purchases.read` / `finance.purchases.write`) — el
espejo de Facturación mirando hacia el proveedor, con recepción de
mercancía integrada a Inventario.

- **`Supplier`**: ficha simple (nombre, NIT/RUT, contacto, activo/inactivo)
  sin lógica propia más allá de CRUD estándar.
- **`PurchaseOrder`** sigue el mismo patrón que `Invoice`/`Quote` (ítems
  eager, numeración vía `DocumentSeriesService` con el tipo de documento
  `'purchase_order'` y prefijo `OC`). Ciclo de estados: `draft → sent →
  partially_received/received`, o `cancelled` en cualquier punto antes de
  estar recibida por completo. Solo se edita en `draft`.
- **Recepción de mercancía** (`POST
  /finance/purchase-orders/:id/receive`): cada `PurchaseOrderItem` lleva
  su propio `quantityReceived` para soportar recepciones parciales en
  varias entregas. Por cada línea recibida que tenga un `productId`
  enlazado (las líneas de solo servicio no lo tienen), se llama a
  `StockService.recordMovement()` para registrar el ingreso real al
  inventario en la bodega indicada — es el punto de integración entre
  Compras e Inventario. La orden pasa a `received` solo cuando **todas**
  sus líneas están completas; si queda algo pendiente, a
  `partially_received`. Cada recepción escala una notificación al dueño
  de la orden y a su líder (módulo 8) vía `NotificationEscalationService`.
- **`SupplierInvoice`**: a diferencia de `Invoice.invoiceNumber`, el
  campo `supplierInvoiceNumber` es texto libre — es el número que el
  proveedor le puso a su propia factura, no algo que nosotros generamos,
  así que deliberadamente no pasa por `DocumentSeriesService`. Puede
  enlazarse opcionalmente a la orden de compra que la originó
  (`purchaseOrderId`).
- **Pagos a proveedor** (`SupplierPayment`): mismo patrón que
  `InvoicePayment` — cada pago recalcula `amountPaid` y el estado
  (`partially_paid`/`paid`), y escala una notificación al dueño de la
  factura.
- **Pendiente**: no hay conciliación automática entre la factura del
  proveedor y la orden de compra (comparar cantidades/montos) — queda a
  criterio de quien la registra.

## Contabilidad y tesorería

Módulo activable `accounting` (`GET/POST/PATCH /api/accounting/*`,
permisos `accounting.entries.read` / `accounting.entries.write`) — un
sistema de partida doble ligero, deliberadamente **no NIIF-completo**
(plan de cuentas plano, sin jerarquía de cuentas padre/hija), la misma
decisión de alcance manejable que ya se tomó para Facturación.

- **`Account`** (plan de cuentas): código + nombre + tipo
  (activo/pasivo/patrimonio/ingreso/gasto), único por `(tenantId, code)`.
  `POST /accounting/accounts/seed-defaults` carga un plan básico de ~11
  cuentas (idempotente — solo agrega los códigos que falten), y el tenant
  demo ya lo trae cargado desde el seed.
- **`JournalEntry`/`JournalEntryLine`**: todo asiento pasa por un único
  primitivo interno (`postEntry()`) que exige que la suma de débitos sea
  igual a la de créditos y que ninguna línea tenga débito y crédito a la
  vez — ya sea un asiento manual (`POST /accounting/journal-entries`) o
  uno automático. Numerados vía `DocumentSeriesService` (tipo
  `journal_entry`, prefijo `AST`).
- **Asientos automáticos desde Facturación y Compras**: `AccountingModule`
  es una hoja del árbol de dependencias — no importa `InvoicesModule` ni
  `PurchasesModule`, son ellos quienes lo importan a él, evitando una
  dependencia circular. Se contabiliza automáticamente: emisión de
  factura (`Dr` Clientes, `Cr` Ingresos por ventas + `Cr` Impuestos por
  pagar), pago de factura (`Dr` Caja, `Cr` Clientes), factura de
  proveedor (`Dr` Gastos/costo, `Cr` Proveedores) y pago a proveedor
  (`Dr` Proveedores, `Cr` Caja). Busca las cuentas por su código conocido
  (`1305`, `4135`, `2408`, `1105`, `2205`, `6135`); si el tenant no tiene
  el plan de cuentas básico cargado, el asiento simplemente se omite con
  una advertencia en el log — **Facturación y Compras nunca deben
  romperse porque Contabilidad no esté configurada**. **Pendiente**:
  deliberadamente no se contabiliza nada al recibir mercancía de una
  orden de compra (solo al crear la factura del proveedor), para no
  duplicar el reconocimiento del pasivo.
- **Caja y bancos** (`CashAccount`/`CashTransaction`): cada cuenta de
  caja/banco está enlazada a su cuenta contable de activo correspondiente
  y mantiene un `balance` desnormalizado (mismo patrón que
  `StockBalance` en Inventario). Depósitos y retiros piden una "cuenta
  contrapartida" del plan de cuentas; una transferencia entre dos cuentas
  de caja/banco genera dos filas de `CashTransaction` con el mismo
  `transferGroupId` (mismo patrón que las transferencias de stock entre
  bodegas) y un único asiento contable balanceado. Ninguna operación deja
  el saldo en negativo.
- **Reportes**: balance de comprobación (`GET
  .../reports/trial-balance`, suma de débitos/créditos por cuenta),
  balance general (`GET .../reports/balance-sheet`, activos vs.
  pasivo+patrimonio) y estado de resultados por rango de fechas (`GET
  .../reports/income-statement?from=&to=`, ingresos menos gastos).
- **Cartera CxC/CxP**: deliberadamente **no** se duplicó como
  subsistema aparte dentro de Contabilidad — las listas ya existentes de
  Facturas (módulo 9) y Facturas de proveedor (módulo 10), filtradas por
  saldo pendiente y ordenadas por fecha de vencimiento, ya cumplen ese
  propósito sin acoplar `AccountingModule` a `InvoicesModule`/
  `PurchasesModule` (lo que sí crearía una dependencia circular, dado que
  esos módulos ya dependen de Contabilidad para contabilizar).

## Activos fijos

Módulo activable `fixed_assets` (`GET/POST/PATCH /api/finance/fixed-assets/*`,
permisos `fixed_assets.read` / `fixed_assets.write`) — registro,
depreciación, mantenimiento, traslado y baja de activos. Depreciación
**lineal únicamente** (sin métodos acelerados), la misma decisión de
alcance manejable de siempre.

- **`FixedAsset`**: costo, vida útil en meses y valor residual son
  **inmutables después de crear el activo** (`UpdateFixedAssetDto`
  deliberadamente no los incluye) — ya alimentan la matemática de
  depreciación y, potencialmente, asientos ya contabilizados; solo
  nombre, descripción, ubicación (`locationBranchId`, sucursal del
  módulo 8) y responsable se pueden editar después.
- **Depreciación** (`POST /finance/fixed-assets/run-depreciation`): acción
  manual (sin scheduler, igual que la generación de facturas recurrentes)
  que el usuario dispara por período. `depreciación mensual = (costo −
  valor residual) / vida útil en meses`. Cada activo recuerda
  `lastDepreciatedPeriod`, así que **volver a ejecutar el mismo período no
  duplica el monto** — los activos ya procesados simplemente se saltan.
  Un solo asiento contable consolida la depreciación de todos los activos
  del período (`Dr` Gasto por depreciación, `Cr` Depreciación acumulada),
  en vez de un asiento por activo.
- **Mantenimiento** (`POST .../:id/maintenance`): queda registrado como
  historial (`FixedAssetMovement`) con un costo opcional puramente
  informativo. **Pendiente**: no contabiliza ese costo automáticamente —
  no hay forma de saber si se pagó de caja o quedó como cuenta por pagar,
  así que se deja a criterio de quien lo registre (vía un asiento manual
  en Contabilidad si aplica).
- **Traslado** (`POST .../:id/transfer`): cambia `locationBranchId` y
  registra el movimiento con sucursal de origen y destino.
- **Baja** (`POST .../:id/dispose`): calcula el valor en libros (costo −
  depreciación acumulada) y contabiliza automáticamente el retiro (`Dr`
  Depreciación acumulada por lo ya depreciado, `Dr` Pérdida en baja de
  activos por el valor en libros restante si no llegó a depreciarse del
  todo, `Cr` Activos fijos por el costo completo) — mismo patrón de
  "se omite con advertencia si falta el plan de cuentas" que el resto de
  las integraciones con Contabilidad.

## Servicio al cliente

Módulo activable `customer_service` (`support/tickets/*`,
`support/knowledge/*`, permisos `support.tickets.read/write` y
`support.knowledge.read/write`) — soporte post-venta: tickets con SLA,
base de conocimiento, y un "chatbot" deliberadamente simple.

- **`Ticket`**: numerado vía `DocumentSeriesService` (tipo `ticket`,
  prefijo `TK`). El SLA es **reloj de pared, sin calendario de horario
  laboral** (`SLA_HOURS_BY_PRIORITY`: urgente 4h, alta 8h, media 24h, baja
  72h) — la misma decisión de alcance manejable que ya se tomó en otros
  módulos. El incumplimiento de SLA no se marca con un job; se calcula al
  vuelo en el frontend comparando `slaDueAt` contra hoy, igual que
  "vencida" en Facturas y Cotizaciones.
- **Asignar y escalar**: `PATCH .../:id/assign` notifica al agente
  asignado y a su líder (módulo 8) vía `NotificationEscalationService`.
  `PATCH .../:id/escalate` sube la prioridad un nivel y recalcula el SLA
  desde ahora — solo se puede usar mientras no esté ya en `urgent`.
- **Canal público (PQRS)**: `POST /public/support/:tenantSlug/tickets`
  permite radicar un ticket sin cuenta (nombre + correo del reportante en
  vez de un `contactId`), con un `accessToken` propio para hacer
  seguimiento después (`GET /public/support/tickets/:accessToken`) —
  mismo patrón que el enlace público de Cotizaciones. Prioridad siempre
  `medium` al entrar por este canal: un reportante externo no puede
  autodeclararse "urgente".
- **Comentarios** (`TicketComment`): pueden marcarse `isInternal` (nota
  interna del equipo, nunca visible en el seguimiento público) o
  visibles para el cliente.
- **Base de conocimiento** (`KnowledgeArticle`): título, contenido,
  categoría, publicado/borrador, con `slug` único por tenant
  auto-generado (y desambiguado con un sufijo numérico si ya existe).
- **"Chatbot"**: `GET /support/knowledge-articles/suggest?q=` — **no hay
  integración con un LLM**; es coincidencia simple de palabras clave
  contra título/contenido de artículos publicados, ordenado por cuántas
  palabras de la búsqueda aparecen. Suficiente para sugerirle un artículo
  a un agente (o a un futuro widget público); entender intención real
  necesitaría una integración de IA, fuera de alcance aquí.

## Marketing

Módulo activable `marketing` (`marketing/campaigns/*`,
`marketing/landing-forms/*`, `marketing/nurture-sequences/*`,
`marketing/segments/*`, permisos `marketing.campaigns.read/write`,
`marketing.landing_forms.read/write`, `marketing.nurture.read/write`,
`marketing.segments.read`) — campañas, captura de leads, segmentación y
nutrición, con el mismo criterio de alcance manejable que el resto del
proyecto: cada simplificación queda documentada aquí en vez de fingirse.

- **Campañas** (`Campaign` + `CampaignRecipient`): email, SMS o WhatsApp,
  con destinatarios elegidos entre los contactos existentes al momento de
  enviar (`POST .../:id/send`). **El email es un envío real** vía el mismo
  `EmailService` (SMTP) que usan las Cotizaciones. **SMS y WhatsApp no
  tienen pasarela configurada** (no hay credenciales de Twilio/Meta en este
  proyecto) — en vez de fingir la entrega, el destinatario queda marcado
  con un estado propio `simulated` (distinto de `sent`), y queda un
  `logger.warn` en el servidor. Solo se puede editar/cancelar/enviar una
  campaña en `draft`.
- **Formularios de captura** (`LandingForm`): cada formulario tiene un
  `slug` único por tenant y un endpoint público real,
  `POST /public/marketing/:tenantSlug/forms/:formSlug`, al que puede
  apuntar el `action` de cualquier formulario externo (landing page propia,
  o embebida en redes) — cada envío crea un `Lead` reutilizando sus campos
  existentes `source` (fijo en `landing_page`) y `campaign` (el nombre de
  campaña del formulario), en vez de añadir un `campaignId` nuevo al
  esquema. El frontend además sirve una página propia en `/lp/:tenantSlug/
  :formSlug` (`PublicLandingFormView`) por si el tenant no tiene su propia
  landing page. **Conectar directamente los lead-ads de Meta/LinkedIn
  requeriría sus credenciales de API**, que este proyecto no tiene — el
  endpoint es real y funcional para cualquier formulario externo, pero esa
  integración específica queda pendiente.
- **Segmentación** (`GET /marketing/segments/contacts`): no es un esquema
  nuevo, es una consulta filtrada sobre `Contact`/`Company` existentes —
  por industria, ciudad, tamaño de empresa (`Company.employeeCount`, campo
  nuevo) y cargo (`Contact.position`). Un segmento se calcula al vuelo, no
  se guarda como entidad.
- **Nutrición** (`NurtureSequence` + `NurtureEnrollment`): una secuencia
  guarda sus pasos como `jsonb` (`{delayDays, subject, content}[]`) en vez
  de una tabla hija, porque se edita como un todo. Al inscribir contactos
  (`POST .../:id/enroll`) se agenda `nextStepDueAt` para el primer paso.
  **No hay scheduler en este proyecto** (mismo límite que depreciación o
  facturación recurrente) — `POST /marketing/nurture-sequences/process` es
  un disparador manual que una persona, o un cron externo, debe llamar
  periódicamente; envía por email cada paso vencido, avanza al siguiente, y
  marca `completed` al llegar al último. Un contacto sin correo se salta
  ese ciclo y se reintenta en la próxima corrida (nunca se marca `failed`
  ni se pierde).

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
