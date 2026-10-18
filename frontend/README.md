# Mis Eventos — Frontend

SPA de React + TypeScript para la plataforma de gestión de eventos "Mis Eventos": listado y detalle de eventos, creación/edición de eventos con máquina de estados, programación de sesiones y ponentes, registro de asistentes, perfil propio ("mis eventos registrados") y administración de usuarios (bonus). Consume la API REST del backend (FastAPI) incluido en `../backend`.

## Stack técnico

- **React 18 + TypeScript**, compilado con **Vite**.
- **React Router v6** (`createBrowserRouter`), todas las páginas cargadas de forma perezosa (`React.lazy`) para code-splitting real por ruta.
- **TanStack Query v5** para todo el estado remoto (listas, detalle, mutaciones), con `staleTime` ajustado por tipo de dato y caching real como estrategia (ver "Estado y datos").
- **Zustand** (con middleware `persist`) para el estado de autenticación (usuario, tokens), persistido en `localStorage`.
- **Axios** con interceptores de request (adjunta `Authorization: Bearer <token>`) y de response (refresh automático de token en 401).
- **React Hook Form + Zod** para formularios, con esquemas de validación que replican las reglas del backend (ver "Formularios y validación").
- **Tailwind CSS** para estilos y responsividad.
- **Radix UI** (Dialog, Select, Toast) como primitivos accesibles de bajo nivel, estilados con Tailwind.
- **Vitest + React Testing Library + MSW** para testing (MSW intercepta HTTP real contra el mismo contrato JSON/códigos que expone el backend, sin necesidad de levantar Postgres).
- **ESLint + Prettier** para linting y formato.

## Ubicación dentro del repositorio

Este proyecto es parte de un repositorio único que contiene backend y frontend en carpetas separadas (ver el [README raíz](../README.md)):

```
mis-eventos/        (raíz del repo)
├── backend/         # API REST (FastAPI)
└── frontend/         # este proyecto
```

El `docker-compose.yml` que orquesta todo el stack vive en la **raíz del repositorio** (no dentro de esta carpeta ni de `backend/`), precisamente porque necesita construir ambas imágenes a partir de esa estructura de carpetas hermanas — ver el [README raíz](../README.md). El proxy de desarrollo de Vite (`vite.config.ts`) asume igualmente que el backend corre accesible en `localhost:8000`, sin depender de dónde viva el compose.

## Requisitos previos

- Node.js 20.x (recomendado usar la misma versión que corre en el contenedor de producción, ver `Dockerfile`).
- npm (viene con Node).
- Para el flujo de desarrollo normal, el backend corriendo localmente en `http://localhost:8000` (ver el README de `../backend`) — no es necesario Docker para desarrollar el frontend.

## Instalación y arranque en desarrollo

```bash
npm install
npm run dev
```

Esto levanta el servidor de desarrollo de Vite en `http://localhost:5173`. En desarrollo, `vite.config.ts` configura un proxy (`server.proxy`) que reenvía cualquier request a `/api/*` hacia `http://localhost:8000` (el backend corriendo localmente). Gracias a esto, el navegador ve siempre el mismo origen (`localhost:5173`) y nunca dispara una petición cross-origin: **no hace falta configurar CORS en el backend para desarrollar**, ni en desarrollo ni en producción (ver "Docker y despliegue" más abajo, donde el mismo principio se resuelve con un proxy de Nginx en vez del proxy de Vite).

## Variables de entorno

Copiar `.env.example` a `.env` y ajustar si es necesario:

```bash
cp .env.example .env
```

| Variable | Significado | Valor recomendado |
|---|---|---|
| `VITE_API_URL` | Prefijo de origen para las llamadas a la API. El cliente HTTP siempre construye la URL final como `${VITE_API_URL}/api/v1/...` (ver `src/lib/env.ts`). | **Vacío** en desarrollo (el proxy de Vite resuelve el origen) y en producción dockerizada (el proxy de Nginx resuelve el origen, ver más abajo). Solo se define, p. ej. a `http://localhost:8000`, si se corre el frontend compilado/servido **fuera** de Docker contra un backend local sin ningún proxy intermedio — en ese caso sí haría falta CORS en el backend, un escenario fuera del alcance de esta entrega. |

No hay ninguna otra variable de entorno que el frontend necesite: no se usan claves de terceros ni URLs de servicios adicionales.

## Tests y cobertura

```bash
npm run test              # modo watch (Vitest)
npx vitest run             # una sola corrida, sin watch
npm run test:coverage      # una corrida con reporte de cobertura (v8)
```

El reporte de cobertura se genera en `coverage/` (HTML navegable en `coverage/index.html`, además de un resumen en texto en la terminal). La carpeta `src/test/` (helpers de MSW y setup de Vitest) está excluida del cálculo de cobertura por configuración explícita en `vite.config.ts` (`test.coverage.exclude`): es infraestructura de pruebas, no código de la aplicación, igual que un `conftest.py` no cuenta contra la cobertura del backend.

Los tests usan **MSW** (Mock Service Worker) para interceptar las llamadas HTTP reales hechas por Axios y responder con el mismo contrato JSON (mismos campos, mismos códigos de error) que expone el backend real — no son mocks de las funciones de `api.ts`, sino de la capa de red, así que ejercitan el código de verdad (hooks de TanStack Query, interceptores de Axios, manejo de errores) sin necesitar una base de datos.

## Build de producción

```bash
npm run build
```

Internamente corre `tsc -b && vite build` (falla si hay errores de tipos) y deja el resultado estático en `dist/`. El build de producción incluye:

- Minificación y tree-shaking por defecto de esbuild/Rollup (Vite).
- Un paso adicional de **ofuscación** (`vite-plugin-javascript-obfuscator`, activo solo cuando `mode === "production"`, nunca en desarrollo) sobre el código fuente antes de que Rollup arme los chunks finales: cifra los literales de string en un array decodificado en runtime y renombra identificadores locales a hexadecimal. Se deja fuera `src/app/router.tsx` de este paso porque el plugin solo reescribe en la fase de transformación de cada módulo (no sobre el bundle ya ensamblado) y, si se ofuscara ese archivo en particular, el `import()` dinámico de cada página (la base del lazy-loading por ruta) dejaría de ser estáticamente analizable por Rollup y todas las páginas colapsarían en un solo chunk — se prefiere mantener el code-splitting real y no ofuscar ese único archivo, que no contiene lógica de negocio ni nada sensible.
- Generación de imágenes responsivas: ver "Imágenes de portada" más abajo.

```bash
npm run preview   # sirve dist/ localmente para verificar el build (no es el servidor de producción real, ver Docker)
```

## Linting y formato

```bash
npm run lint      # ESLint (typescript-eslint + eslint-plugin-react-hooks)
npm run format     # Prettier --write
```

## Docker y despliegue

El frontend se empaqueta con un `Dockerfile` multi-stage:

1. **Stage `build`** (`node:20-alpine`): instala dependencias con `npm ci` y corre `npm run build`, generando `dist/`.
2. **Stage `runtime`** (`nginx:alpine`): copia únicamente `dist/` y `nginx.conf` — la imagen final no contiene Node, `node_modules` ni código fuente, solo los estáticos compilados servidos por Nginx.

`nginx.conf` resuelve, en producción, el mismo problema de origen que el proxy de Vite resuelve en desarrollo (el backend **no tiene `CORSMiddleware` configurado**, verificado leyendo `backend/app/main.py`, y esa decisión no se toca porque el backend ya está completo y verificado): Nginx sirve el SPA y además hace `proxy_pass` de todo lo que llega a `/api/` hacia `http://backend:8000/api/` (el servicio `backend` de la red interna de Docker Compose). El navegador solo habla con el origen del frontend; nunca ve ni necesita conocer la URL real del backend. Además:

- Todo archivo bajo `/assets/*` (los bundles de JS/CSS y las imágenes de portada que emite Vite, todos con un hash de contenido en el nombre) se sirve con `Cache-Control: public, immutable` y expiración a un año — es seguro porque un cambio de contenido siempre produce un nombre de archivo distinto.
- `index.html` se sirve siempre con `Cache-Control: no-cache`, porque es el único archivo que referencia los nombres con hash vigentes del último build; cachearlo podría dejar a un usuario pidiendo assets de un deploy anterior que ya no existen.
- `location / { try_files $uri /index.html; }` es el fallback de SPA: cualquier ruta que no sea un archivo estático real (p. ej. `/events/42` recargada directamente, o compartida como link) se resuelve devolviendo `index.html`, y React Router toma el control en el cliente a partir de la URL.

### Levantar el stack completo (backend + frontend + base de datos)

El `docker-compose.yml` que orquesta los tres servicios pedidos por el enunciado (base de datos, backend y frontend) en un solo comando vive en la **raíz del repositorio**, no dentro de esta carpeta — ver el [README raíz](../README.md) para el detalle completo:

```bash
# desde la raíz del repo
docker compose up --build
```

Esto levanta:

- `db` (Postgres 16).
- `backend`, construido con contexto `./backend` usando el `Dockerfile` de esa carpeta, con el healthcheck definido en su propio `Dockerfile` contra `GET /health` (ya expuesto por el backend sin el prefijo `/api/v1`).
- `frontend` (esta carpeta, contexto `./frontend`), construido con el `Dockerfile` descrito arriba, expuesto en el puerto `80`, que solo arranca una vez que `backend` reporta estar saludable (`depends_on: backend: condition: service_healthy`).

Con el stack arriba, la aplicación completa queda disponible en `http://localhost`. El mismo `docker-compose.yml` de la raíz define además un servicio `db_test`, usado solo por la suite de tests del backend (ver `backend/README.md`) — no es necesario para levantar la aplicación.

## Estructura de carpetas

```
frontend/
  src/
    app/
      App.tsx            # Providers: QueryClientProvider, RouterProvider, Toaster
      RootLayout.tsx      # Navbar + <Outlet/> + Suspense con PageSkeleton como fallback
      router.tsx          # createBrowserRouter + todas las rutas vía React.lazy
      queryClient.ts       # QueryClient con defaults (retry, refetchOnWindowFocus)
    pages/                 # 1 archivo = 1 ruta
      EventsListPage.tsx
      EventDetailPage.tsx
      EventFormPage.tsx    # crear y editar (mismo componente, distinta query/modo)
      LoginPage.tsx
      RegisterPage.tsx
      ProfilePage.tsx
      AdminUsersPage.tsx   # bonus, ver "Administración de usuarios" más abajo
      NotFoundPage.tsx
    features/              # un folder autocontenido por dominio: api.ts (Axios),
                            # hooks.ts (TanStack Query), types.ts (contrato con el
                            # backend), schemas.ts (validación Zod), keys.ts
                            # (factory de query keys)
      auth/                # register/login/refresh/me + useAuthStore (Zustand)
      events/
      sessions/
      speakers/
      registrations/
      admin/               # bonus — gestión de usuarios
    components/
      ui/                  # Button, Input, Textarea, Select, FormField, Modal,
                            # Spinner, Skeleton, Pagination, Toaster — primitivos
                            # presentacionales, sin fetch de datos
      layout/              # Navbar, ProtectedRoute, RoleGuard, PageSkeleton
      events/               # EventCard, EventForm, EventFilters, EventStatusBadge,
                            # EventCover, EventActions, EventRegistrationAction
      sessions/             # SessionList, SessionFormDialog
      speakers/             # SpeakerSelect, SpeakerFormDialog
    lib/
      http.ts               # instancia de Axios + interceptores (auth, refresh)
      env.ts                 # import.meta.env tipado (VITE_API_URL)
      errors.ts              # normalizeApiError(): mapea cualquier error de Axios
                             # a {detail, code, fields} + mensajes legibles por código
      cn.ts                  # helper de combinación de clases Tailwind
    types/
      api.ts                 # tipos genéricos compartidos: ApiError, Paginated<T>
    test/
      setup.ts               # jest-dom + arranque de MSW
      msw/handlers.ts         # handlers que replican el contrato real del backend
      msw/server.ts
    assets/covers/           # 3 imágenes SVG placeholder, ver "Imágenes de portada"
    main.tsx
  public/
    favicon.svg
  index.html
  vite.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  .eslintrc.cjs
  .prettierrc
  .env.example
  Dockerfile
  nginx.conf
  package.json
```

**Convenciones de arquitectura:**

- Cada `features/*` es autocontenido y expone su propia API pública (`api.ts`, `hooks.ts`, `types.ts`, `schemas.ts`, `keys.ts`); `pages/` y `components/` importan de ahí, nunca al revés.
- Ningún componente de `pages/` llama a Axios/fetch directamente — siempre a través de un hook de `features/*`.
- Los componentes puramente presentacionales de `components/*` (p. ej. `EventFilters`) no invocan hooks de datos: solo exponen callbacks (`onChange(filters)`) y dejan que la página dueña del estado (`EventsListPage`) haga la query. El estado de fetch vive en los hooks de `features/*`, nunca en un componente de presentación.
- No hay barrel files (`index.ts` que re-exporta todo) en `features/*` ni en `components/ui/*` — todos los imports son directos al archivo.

## Rutas

| Ruta | Página | Acceso | Notas |
|---|---|---|---|
| `/` | `EventsListPage` | Público | Listado con filtros (nombre, estado, rango de fechas) y paginación |
| `/events/:id` | `EventDetailPage` | Público | Detalle del evento + sus sesiones + botón "Registrarme" (si autenticado) + acciones de gestión (si es el dueño o admin) |
| `/events/new` | `EventFormPage` | Protegido: rol `organizador` o `admin` | Modo "crear" |
| `/events/:id/edit` | `EventFormPage` | Protegido: dueño del evento o `admin` (se valida contra los datos ya cargados del evento, no solo contra el rol) | Modo "editar", mismo componente que `/events/new` |
| `/login` | `LoginPage` | Público (si ya hay sesión, redirige a `/`) | — |
| `/register` | `RegisterPage` | Público (idem) | — |
| `/profile` | `ProfilePage` | Protegido: cualquier usuario autenticado | Perfil propio + "mis eventos registrados" (paginado) |
| `/admin/users` | `AdminUsersPage` | Protegido: rol `admin` | Ver "Administración de usuarios" |
| `*` | `NotFoundPage` | Público | — |

Todas las páginas se cargan de forma perezosa (`React.lazy` + `Suspense`, con `PageSkeleton` como fallback) a nivel de `router.tsx`, con code-splitting real por ruta (verificable en `dist/assets/`: cada página termina en su propio archivo `.js`).

`ProtectedRoute` redirige a `/login?redirect=<ruta>` si no hay sesión. `RoleGuard` además valida el rol contra una lista permitida; si el usuario está autenticado pero no tiene el rol requerido, muestra una página de "no autorizado" en vez de redirigir a login (es un caso distinto de "no autenticado").

## Estado y datos

- **TanStack Query** gestiona todo el estado remoto: listas de eventos/sesiones/ponentes/usuarios, el evento/sesión actual, "mis registros". Cada feature define su propia factory de query keys (`eventKeys.list(filters)`, `eventKeys.detail(id)`, etc.) para evitar invalidaciones que fallen por un key escrito a mano con un typo.
- `staleTime` se ajusta por tipo de dato en vez de usar un único default: eventos (30s, porque cambian con cierta frecuencia), ponentes (5 minutos, catálogo que cambia poco), `GET /me` y `GET /me/registrations` (siempre frescos tras login o una mutación propia, pero sin refetch automático al volver a enfocar la ventana).
- Cada mutación invalida explícitamente solo las queries afectadas (nunca un `invalidateQueries()` global): crear/editar/borrar un evento invalida su listado y, si aplica, su detalle; publicar/cancelar/finalizar invalida detalle + listado; registrarse/cancelar un registro invalida "mis registros" y el detalle del evento (el cupo visible puede cambiar); cambiar el rol/estado de un usuario (bonus admin) invalida el listado de usuarios.
- **Zustand** (con `persist`) gestiona el estado de autenticación: usuario actual, `accessToken`, `refreshToken`, persistidos en `localStorage` bajo la clave `mis-eventos-auth`. El rol autoritativo del usuario viene siempre de `GET /me` (nunca se decodifica el JWT en el cliente para leerlo), porque es el backend quien decide el rol vigente en cada momento — p. ej. si un admin desactivó a ese usuario después de que inició sesión.
- El cliente Axios (`lib/http.ts`) adjunta `Authorization: Bearer <token>` a toda request salvo `/auth/register`, `/auth/login` y `/auth/refresh`. Ante un 401, intenta un refresh automático una sola vez (con un mutex a nivel de módulo para que N requests en paralelo que reciben 401 simultáneamente no disparen N refresh redundantes); si el refresh también falla, se fuerza logout y redirección a `/login?redirect=<ruta actual>`.

## Formularios y validación

Los esquemas de Zod replican, campo por campo, las validaciones reales del backend (revisadas en los schemas Pydantic y los `model_validator` del servicio correspondiente), de modo que el usuario ve el mismo mensaje de error en el cliente que generaría un 422 del servidor, sin esperar el round-trip. Ejemplo (creación/edición de evento): `end_date` debe ser estrictamente posterior a `start_date`, y `capacity` debe ser un entero positivo.

Los errores que sí llegan del servidor (422 con `fields`, 409 con un código de negocio, etc.) se normalizan en `lib/errors.ts` y se muestran de dos formas a la vez: un toast con el mensaje general, y — cuando el error trae `fields` — el error específico mapeado al campo correspondiente del formulario activo (los nombres de campo que devuelve el backend coinciden exactamente con los `name` de los inputs, por diseño).

## Limitaciones de datos conocidas (heredadas del backend, compensadas en la UI)

Estas dos limitaciones no son errores del frontend: son comportamientos reales y documentados del backend que el frontend debe tener en cuenta en la capa de presentación, en vez de ocultarlos o intentar "arreglarlos" silenciosamente.

1. **`registration.status` puede quedar desactualizado frente al evento.** Cancelar un evento **no** cambia el `status` de los `Registration` ya confirmados a él: en `GET /me/registrations`, un registro puede seguir mostrando `registration.status: "confirmed"` aunque `registration.event.status` ya sea `"cancelled"` o `"finished"`. Por eso, en todo lugar donde se muestra el estado de un registro (hoy, `ProfilePage`), la UI deriva el estado visual siempre de `registration.event.status` (el evento embebido), nunca de `registration.status` directamente — así nunca se le informa a un asistente que sigue "confirmado" en un evento que en realidad ya fue cancelado. La función que centraliza esta regla es `getDisplayStatus()` en `src/features/registrations/utils.ts`.
2. **No existe un campo de cupo restante en `EventRead`.** El backend no expone `registered_count` ni `available_capacity` en la respuesta de un evento — solo `capacity` (el cupo total). Agregar ese campo requeriría modificar `backend/app/services/event_service.py` y el schema de salida, fuera del alcance de un frontend que no toca el backend ya completado y verificado. La decisión tomada es que la UI no simula ni estima un cupo restante: muestra la capacidad total del evento y descubre si ya está lleno al intentar registrarse (el backend responde `400 EVENT_FULL` en ese caso, con su propio mensaje).
3. **"Solo mis eventos" filtra solo dentro de la página cargada.** No existe un endpoint separado para que un organizador liste específicamente "mis eventos" — `GET /events` siempre devuelve el total paginado de todos los eventos visibles. El toggle "Solo mis eventos" de `EventFilters` (visible únicamente si hay sesión) filtra del lado del cliente, sobre los `items` ya devueltos para la página actual, comparando `event.organizer_id` contra el usuario autenticado. Esto significa que el toggle no re-pagina sobre el total real de eventos del organizador — si un organizador tiene eventos repartidos en varias páginas del listado general, el toggle solo muestra los que caen en la página que ya se había cargado. Resolverlo de forma completa requeriría un parámetro de filtro nuevo en el backend, fuera de alcance aquí; se documenta la limitación en vez de ocultarla.

## Imágenes de portada

El dominio `Event` del backend no tiene ninguna columna de imagen (ni una tabla de archivos asociada) — no existe un endpoint real de subida de portadas para eventos. En vez de simular un feature de backend que no existe, cada `EventCard`/`EventDetailPage` muestra una imagen de portada puramente **decorativa y determinística**: la misma imagen para el mismo `event.id` en cada carga (un `seed` derivado del id elige entre 3 ilustraciones SVG propias en `src/assets/covers/`). En build time, `vite-imagetools` genera a partir de esos SVG las variantes WebP en varios anchos (320w/640w/960w) servidas con `srcset`, cubriendo el bonus de optimización de imágenes de forma honesta, sin inventar datos que el backend no tiene. Si en el futuro el backend agrega un campo real de imagen de portada (p. ej. `Event.cover_image_url`), el único punto de cambio es el componente `EventCover`.

## Administración de usuarios (`/admin/users`)

Esta pantalla **no** es un requisito de la sección "Frontend" del enunciado original de la prueba técnica. El enunciado lista "Roles de usuarios", "Permisos de acceso por rol" y "Gestión de perfiles por parte del administrador" explícitamente bajo **"Bonus backend"**, no bajo "Bonus frontend" ni bajo los requisitos obligatorios de frontend. `AdminUsersPage` es la **extensión de interfaz** que consume ese bonus de backend (los endpoints `GET /admin/users` y `PATCH /admin/users/{id}`, que ya existían en el backend sin una UI que los usara): una tabla paginada de usuarios con cambio de rol y de estado (activo/inactivo) inline. Se documenta así explícitamente para que quien evalúe esta entrega entienda que es alcance añadido por decisión propia — una forma de dar utilidad real a un bonus de backend que de otro modo solo sería accesible vía Swagger/curl — y no un intento de cubrir algún hueco de los requisitos obligatorios de frontend (que están cubiertos por el resto de la aplicación, sin depender de esta pantalla).

Un detalle de UX relevante: el backend responde `403 CANNOT_MODIFY_SELF` si un admin intenta editar su propio rol o estado vía `PATCH /admin/users/{id}`. La UI anticipa esta regla deshabilitando directamente los controles de edición en la fila del propio admin autenticado dentro de la tabla, en vez de dejar que el usuario intente el cambio y reciba el error del servidor.
