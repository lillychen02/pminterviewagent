#!/bin/bash

# Exit on error
set -e

cd "$(dirname "$0")/.."  # Change to infrastructure directory

echo "Starting DynamoDB Local..."
npm run dynamodb:local:up

echo "Waiting for DynamoDB Local to be ready..."
sleep 5

echo "Setting up local tables..."
npm run dynamodb:local:setup

echo "Running integration tests..."
npm run test:integration

echo "Cleaning up..."
npm run dynamodb:local:down 