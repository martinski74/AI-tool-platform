#!/bin/bash

# Stop and remove any existing containers
if [ "$(docker-compose ps -q)" ]; then
  docker-compose down
fi

# Build the Docker images
docker-compose build

# Start the Docker containers
docker-compose up -d
