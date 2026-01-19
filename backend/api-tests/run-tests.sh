#!/bin/bash

# Script to run Postman/Newman API tests
# Usage: ./run-tests.sh [dev|prod]

set -e

ENVIRONMENT=${1:-dev}
COLLECTION="transkriber.postman_collection.json"
ENV_FILE="environment.${ENVIRONMENT}.json"

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo "Newman is not installed. Installing..."
    npm install -g newman
fi

# Check if collection file exists
if [ ! -f "$COLLECTION" ]; then
    echo "Error: Collection file $COLLECTION not found"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file $ENV_FILE not found"
    exit 1
fi

echo "Running API tests with $ENVIRONMENT environment..."
echo "Collection: $COLLECTION"
echo "Environment: $ENV_FILE"
echo ""

# Run Newman tests
newman run "$COLLECTION" \
    -e "$ENV_FILE" \
    --reporters cli,json \
    --reporter-json-export "newman-report-${ENVIRONMENT}.json"

echo ""
echo "Tests completed. Report saved to newman-report-${ENVIRONMENT}.json"
