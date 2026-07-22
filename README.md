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
bloquea cualquier endpoint marcado con `@RequireModule('crm')` si el
tenant no lo tiene activo. Dos formas de activar/desactivar:

- **Un tenant sobre sí mismo** (permiso `core.modules.write`, cualquier
  Administrador de ese tenant): `POST /api/modules/:code { "isEnabled": true }`
- **El admin de plataforma sobre cualquier tenant** (permiso
  `platform.tenants.manage`, ver sección anterior): pantalla `Plataforma`
  en el frontend, o `PATCH /api/platform/tenants/:tenantId/modules/:code`

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

## Branding por tenant

Cada tenant puede tener sus propios colores de marca (primario y
secundario), configurados únicamente por el admin de plataforma —
`PATCH /api/platform/tenants/:tenantId/branding { primaryColor, secondaryColor }`
(hex `#RRGGBB`, o `null` para volver a la paleta por defecto). Se aplican
en el frontend sobreescribiendo variables CSS (`--color-primary`,
`--color-heading`, etc.):

- En el **login**, apenas se escribe el slug de la empresa (con debounce),
  vía el endpoint público `GET /api/platform/tenants/by-slug/:slug/branding`
  — no requiere sesión, ya que hace falta conocer el slug para loguearse
  de todas formas.
- Tras autenticarse, en **toda la app**, leyendo el mismo dato desde
  `GET /api/tenant-settings` (que ya devuelve la config de sesión del
  tenant propio).

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

## Editar y eliminar registros

Empresas, Contactos y Leads se pueden editar y eliminar desde su propia
pantalla (botones "Editar"/"Eliminar" por fila). Oportunidades se editan
haciendo clic en su tarjeta del Pipeline (nombre, valor, fecha estimada
de cierre) y desde ahí también se pueden marcar como perdidas — no tienen
eliminación directa porque "perdida" ya es la forma de cerrarlas. Las
Cotizaciones solo se pueden editar mientras están en estado `draft`
(antes de enviarlas); una vez enviadas, el backend rechaza la edición.

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
