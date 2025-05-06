import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  CreateTableCommand,
  ListTablesCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';

const LOCAL_ENDPOINT = 'http://localhost:8000';
const client = new DynamoDBClient({ endpoint: LOCAL_ENDPOINT });

// Table definitions based on CDK stack
const tableDefinitions = [
  {
    TableName: 'InterviewAgentStack-Dev-sessions',
    KeySchema: [
      { AttributeName: 'sessionId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'sessionId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userId-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    StreamSpecification: {
      StreamEnabled: false,
    },
  },
  {
    TableName: 'InterviewAgentStack-Dev-scores',
    KeySchema: [
      { AttributeName: 'scoreId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'scoreId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
      { AttributeName: 'sessionId', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'sessionId-index',
        KeySchema: [
          { AttributeName: 'sessionId', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: 'userId-index',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    StreamSpecification: {
      StreamEnabled: false,
    },
  },
];

async function deleteExistingTables() {
  try {
    const { TableNames } = await client.send(new ListTablesCommand({}));
    if (TableNames) {
      for (const tableName of TableNames) {
        console.log(`Deleting table: ${tableName}`);
        await client.send(new DeleteTableCommand({ TableName: tableName }));
      }
    }
  } catch (error) {
    console.error('Error deleting tables:', error);
  }
}

async function createTables() {
  try {
    for (const tableDef of tableDefinitions) {
      console.log(`Creating table: ${tableDef.TableName}`);
      await client.send(new CreateTableCommand(tableDef));
      console.log(`Table ${tableDef.TableName} created successfully`);
    }
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('Setting up local DynamoDB tables...');
  await deleteExistingTables();
  await createTables();
  console.log('Local DynamoDB tables setup complete!');
}

main().catch(console.error); 