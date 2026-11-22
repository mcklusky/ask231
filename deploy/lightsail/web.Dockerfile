# Builds the React site, then serves it with Caddy (which also proxies the API and handles HTTPS).
# Build context is the repository root (see docker-compose.yml).
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
# frontend/.npmrc makes npm use PowerShell (for Windows dev machines); Linux needs sh.
ENV npm_config_script_shell=/bin/sh
RUN npm ci --no-audit --no-fund
COPY frontend/ ./

# Same site for the API, share links and photos.
ARG VITE_API_URL=/api
ARG VITE_SITE_URL
ARG VITE_FACEBOOK_URL=
ARG VITE_INSTAGRAM_URL=
ARG VITE_TIKTOK_URL=
ARG VITE_YOUTUBE_URL=
ARG VITE_WHATSAPP_CHANNEL_URL=
ENV VITE_API_URL=$VITE_API_URL VITE_SITE_URL=$VITE_SITE_URL \
    VITE_FACEBOOK_URL=$VITE_FACEBOOK_URL VITE_INSTAGRAM_URL=$VITE_INSTAGRAM_URL \
    VITE_TIKTOK_URL=$VITE_TIKTOK_URL VITE_YOUTUBE_URL=$VITE_YOUTUBE_URL \
    VITE_WHATSAPP_CHANNEL_URL=$VITE_WHATSAPP_CHANNEL_URL
RUN node_modules/.bin/tsc -b && node_modules/.bin/vite build

FROM caddy:2-alpine
COPY deploy/lightsail/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/site
