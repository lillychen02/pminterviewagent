require('dotenv').config();
const { handler } = require('./generatePrompt');

// Mock AWS Secrets Manager
const AWS = require('aws-sdk');
jest.mock('aws-sdk', () => {
  const mockSecretsManager = {
    getSecretValue: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({ apiKey: 'test-api-key' })
    })
  };
  return {
    SecretsManager: jest.fn(() => mockSecretsManager)
  };
});

async function testStepFunction() {
  // Test cases
  const testCases = [
    {
      name: 'Valid Input',
      input: {
        interviewType: 'product',
        roleContext: 'Senior Product Manager for a B2B SaaS company focusing on AI/ML solutions'
      }
    },
    {
      name: 'Invalid Interview Type',
      input: {
        interviewType: 'invalid',
        roleContext: 'Senior Product Manager for a B2B SaaS company focusing on AI/ML solutions'
      }
    },
    {
      name: 'Invalid Role Context',
      input: {
        interviewType: 'product',
        roleContext: 'too short'
      }
    }
  ];

  console.log('Testing Step Function Input/Output...\n');
  
  for (const testCase of testCases) {
    console.log(`=== ${testCase.name} ===`);
    console.log('Input:', JSON.stringify(testCase.input, null, 2));
    
    try {
      const result = await handler(testCase.input);
      console.log('Output:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
  }
}

testStepFunction(); 