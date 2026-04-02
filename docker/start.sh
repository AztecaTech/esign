#!/bin/sh

# Starting Documenso
printf "Starting Documenso...\n\n"

# Certificate check
printf "Checking certificate configuration...\n"

CERT_PATH="${NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH:-/opt/documenso/cert.p12}"

if [ -f "$CERT_PATH" ] && [ -r "$CERT_PATH" ]; then
    printf "Certificate file found and readable - document signing is ready.\n"
else
    printf "Certificate not found or not readable\n"
    printf "Tip: Documenso will still start, but document signing may be unavailable\n"
    printf "Check: http://localhost:3000/api/certificate-status\n"
fi

printf "\nRunning database migrations...\n"
npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma

printf "Starting Documenso server...\n"
HOSTNAME=0.0.0.0 node build/server/main.js
