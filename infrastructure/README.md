# Infrastructure

This directory contains the AWS CDK infrastructure code and Lambda functions.

## Lambda Functions Organization

Lambda functions are organized into three layers:

### Model Layer (`lambdas/model/`)
- Contains core business logic
- Implements domain models
- Example: `interview-model.js`, `prompt-model.js`

### Context Layer (`lambdas/context/`)
- Contains service integrations
- Implements external service clients
- Example: `openai-service.js`, `elevenlabs-service.js`

### Protocol Layer (`lambdas/protocol/`)
- Contains API handlers
- Implements request/response handling
- Example: `generate-prompt.js`, `interview-conversational.js`

## CDK Stack

The CDK stack (`lib/interview-agent-stack.ts`) deploys:
1. Lambda functions for each layer
2. Step Functions state machine for orchestration
3. Secrets Manager for API keys
4. IAM roles and policies

## Development

1. Add new models to the `model` layer
2. Implement services in the `context` layer
3. Create API handlers in the `protocol` layer
4. Update the CDK stack to deploy new resources

## Testing

- Unit tests in `__tests__` directories
- Integration tests for service integrations
- End-to-end tests for API handlers
