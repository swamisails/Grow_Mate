# GrowMate web image (AD-1, AD-17): the built SPA served by nginx, which also proxies
# /api and /sanctum to the `api` service, so the browser sees one origin.

FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
