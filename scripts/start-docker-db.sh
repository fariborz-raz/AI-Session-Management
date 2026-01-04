#!/bin/bash

# Start PostgreSQL in Docker
echo "Starting PostgreSQL database in Docker..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec -T postgres pg_isready -U sessionuser > /dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    exit 0
  fi
  attempt=$((attempt + 1))
  echo "Attempt $attempt/$max_attempts: Waiting for PostgreSQL..."
  sleep 2
done

echo "PostgreSQL failed to start in time"
exit 1

