# OPTIONAL — for self-hosting (VPS or your own server).
# Not needed if you use Live Server or Netlify.
#
# This just serves the static files using nginx.
FROM nginx:1.27-alpine

# Copy the app (config.js included — the anon key is public/safe thanks to RLS)
COPY index.html /usr/share/nginx/html/
COPY css/  /usr/share/nginx/html/css/
COPY js/   /usr/share/nginx/html/js/

EXPOSE 80
