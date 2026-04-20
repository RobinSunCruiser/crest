# Basis-Image mit NodeJS
# use to build linux compatible 
# docker buildx build --platform linux/amd64 -t your-image-name .

FROM node:23 AS build

# Arbeitsverzeichnis festlegen
WORKDIR /app

# Kopiere beide Ordner (ohne vorhandene node_modules, wenn diese in .dockerignore stehen)
COPY client ./client
COPY server ./server

# Abhängigkeiten im server installieren (zuerst, weil client shared interfaces braucht)
WORKDIR /app/server
RUN npm install

# Abhängigkeiten im client installieren
WORKDIR /app/client
RUN npm install
RUN npm run build

# Server bauen
WORKDIR /app/server
RUN npm run build

FROM node:lts-alpine AS production
WORKDIR /app
COPY --from=build /app/server/dist .
COPY deploy/docker/compose/crest/config.json ./config.json

# Port 3000 freigeben
EXPOSE 3000

# Startbefehl
CMD ["node", "/app/server.bundle.js"]