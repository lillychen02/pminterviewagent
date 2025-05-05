#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InterviewAgentStack } from '../lib/interview-agent-stack';

const app = new cdk.App();

// Development environment
new InterviewAgentStack(app, 'InterviewAgentStack-Dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '288761743082',
    region: process.env.CDK_DEFAULT_REGION || 'us-west-1',
  },
  tags: {
    Environment: 'dev',
    Project: 'interview-agent',
  },
});

// Production environment
new InterviewAgentStack(app, 'InterviewAgentStack-Prod', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '288761743082',
    region: process.env.CDK_DEFAULT_REGION || 'us-west-1',
  },
  tags: {
    Environment: 'prod',
    Project: 'interview-agent',
  },
}); 