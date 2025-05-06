const { execSync } = require('child_process');
const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');

const DYNAMODB_ENDPOINT = 'http://localhost:8000';
const client = new DynamoDBClient({ endpoint: DYNAMODB_ENDPOINT });

async function waitForDynamoDB() {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.send(new ListTablesCommand({}));
      console.log('DynamoDB Local is ready');
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Failed to connect to DynamoDB Local');
      }
      console.log(`Waiting for DynamoDB Local to start... (attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

// Start DynamoDB Local if not running
try {
  execSync('docker ps | grep dynamodb-local', { stdio: 'ignore' });
  console.log('DynamoDB Local is already running');
} catch (error) {
  console.log('Starting DynamoDB Local...');
  execSync('npm run dynamodb:local:up', { stdio: 'inherit' });
}

// Wait for DynamoDB to be ready
beforeAll(async () => {
  await waitForDynamoDB();
  // Create tables
  execSync('npm run dynamodb:local:setup', { stdio: 'inherit' });
});

// Clean up after all tests
afterAll(async () => {
  execSync('npm run dynamodb:local:down', { stdio: 'inherit' });
}); 