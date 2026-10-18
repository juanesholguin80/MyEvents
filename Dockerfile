# syntax=docker/dockerfile:1

# ---- Stage 1: build -------------------------------------------------------
# Compila el SPA de React con Vite (build de producción: minificado +
# tree-shaking de esbuild/rollup, más el paso de ofuscación de
# vite-plugin-javascript-obfuscator que solo se activa con mode=production,
# ver vite.config.ts). El resultado estático queda en /app/dist.
FROM node:20-alpine AS build

WORKDIR /app

# Copiar solo los manifiestos primero para aprovechar la cache de capas de
# Docker: si package*.json no cambia, no se repite "npm ci" en el siguiente
# build aunque cambie el código fuente.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite (modo producción por defecto en "vite build") lee VITE_API_URL en
# build time. Se deja vacío a propósito: en producción dockerizada el
# frontend llama rutas relativas "/api/v1/..." y Nginx (stage de runtime,
# nginx.conf) hace proxy_pass hacia el servicio "backend" de la red interna
# de docker-compose — nunca se expone la URL del backend al navegador ni se
# necesita CORS (ver docker-compose.yml raíz y nginx.conf).
RUN npm run build

# ---- Stage 2: runtime ------------------------------------------------------
# Imagen final: solo Nginx sirviendo los estáticos ya compilados. No lleva
# Node ni node_modules ni código fuente — reduce drásticamente el tamaño de
# la imagen de producción frente a servir con "vite preview"/un servidor Node.
FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
