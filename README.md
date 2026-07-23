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
- **Zona horaria e impuestos por tenant**: `Tenant` gana `timezone`,
  `taxLabel` y `taxRatePercent` — valores de referencia que una sucursal
  puede sobreescribir con su propio `timezone`. Se editan en
  `Configuración` vía `PATCH /api/tenant-settings/org` (mismo permiso que
  la configuración de sesión, `core.tenant.settings.write`).

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
