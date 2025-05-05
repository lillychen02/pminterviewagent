# Interview Agent App

A full stack application for conducting and analyzing mock PM interviews.

[GitHub Repository](https://github.com/lillychen02/pminterviewagent)

## Project Structure

```
interview-agent-app/
├── frontend/          # React/Next.js frontend application
├── backend/           # Python FastAPI backend service
└── infrastructure/    # AWS CDK/Terraform infrastructure definitions
```

## Prerequisites

- Node.js (v18 or later)
- Python (v3.9 or later)
- AWS CLI configured with appropriate profiles (dev, prod)
- AWS CDK or Terraform (depending on chosen IaC tool)
- OpenAI API key for interview prompt generation

## Environment Variables

The following environment variables are required:

```bash
# OpenAI API Key - Required for generating interview prompts
OPENAI_API_KEY=your_openai_api_key_here

# AWS Configuration (optional for local development)
AWS_PROFILE=dev
AWS_REGION=us-west-1
```

## Setup Instructions

### Frontend Setup
```