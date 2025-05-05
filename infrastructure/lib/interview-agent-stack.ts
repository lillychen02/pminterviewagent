import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

export class InterviewAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a secret for the OpenAI API key
    const openaiSecret = new secretsmanager.Secret(this, 'OpenAIAPIKey', {
      secretName: `${id}-openai-api-key`,
      description: 'OpenAI API Key for interview prompt generation',
    });

    // Create the Lambda function
    const promptGeneratorLambda = new lambda.Function(this, 'PromptGeneratorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'generatePrompt.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas')),
      environment: {
        OPENAI_API_KEY: openaiSecret.secretValue.toString(),
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant the Lambda function permission to read the secret
    openaiSecret.grantRead(promptGeneratorLambda);

    // Output the secret ARN for reference
    new cdk.CfnOutput(this, 'OpenAISecretARN', {
      value: openaiSecret.secretArn,
      description: 'ARN of the OpenAI API Key secret',
      exportName: `${id}-openai-secret-arn`,
    });

    // Output the Lambda function ARN
    new cdk.CfnOutput(this, 'PromptGeneratorLambdaARN', {
      value: promptGeneratorLambda.functionArn,
      description: 'ARN of the Prompt Generator Lambda function',
      exportName: `${id}-prompt-generator-lambda-arn`,
    });
  }
} 