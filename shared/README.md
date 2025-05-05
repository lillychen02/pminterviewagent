# Shared Code Structure

This directory contains shared code organized into three layers:

## Model Layer (`model/`)
- Contains core business logic and domain models
- Defines the interview process, prompts, and conversation flow
- Independent of any specific implementation or protocol
- Example: Interview model, Prompt model, Conversation model

## Context Layer (`context/`)
- Contains service-specific implementations
- Handles integration with external services
- Implements the model layer interfaces
- Example: OpenAI service, ElevenLabs service

## Protocol Layer (`protocol/`)
- Contains API and communication protocols
- Handles request/response formats
- Implements specific protocols (HTTP, WebSocket, etc.)
- Example: API handlers, WebSocket handlers

## Usage

1. Model layer should be imported by both Context and Protocol layers
2. Context layer should be imported by Protocol layer
3. Protocol layer should only depend on Model and Context layers

## Example

```typescript
// model/interview.ts
export interface Interview {
  generatePrompt(): string;
  processResponse(response: string): void;
}

// context/openai.ts
import { Interview } from '../model/interview';
export class OpenAIInterview implements Interview {
  // Implementation
}

// protocol/api.ts
import { OpenAIInterview } from '../context/openai';
// API handler implementation
``` 