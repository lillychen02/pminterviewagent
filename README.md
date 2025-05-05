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

## Setup Instructions

### Frontend Setup
```bash
cd frontend
npm install
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### Infrastructure Setup
```bash
cd infrastructure
# For CDK:
npm install
cdk synth

# For Terraform:
terraform init
terraform plan
```

## Development

1. Create a new branch from main: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests
4. Submit a pull request

## Environment Variables

Create `.env` files in both frontend and backend directories with appropriate configuration.

## Deployment

Deployment instructions will be added as infrastructure is set up. 