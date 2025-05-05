import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
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
        OPENAI_API_KEY_SECRET_ARN: openaiSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant the Lambda function permission to read the secret
    openaiSecret.grantRead(promptGeneratorLambda);

    // Create Lambda task for Step Function
    const generatePromptTask = new tasks.LambdaInvoke(this, 'GeneratePromptTask', {
      lambdaFunction: promptGeneratorLambda,
      outputPath: '$.Payload',
      resultPath: '$.promptResult',
    });

    // Define error handling
    const handleValidationError = new sfn.Pass(this, 'HandleValidationError', {
      parameters: {
        'statusCode': 400,
        'body.$': 'States.StringToJson($.error)',
      },
      resultPath: '$.error',
    });

    const handleApiError = new sfn.Pass(this, 'HandleApiError', {
      parameters: {
        'statusCode': 500,
        'body.$': 'States.StringToJson($.error)',
      },
      resultPath: '$.error',
    });

    // Create the state machine
    const stateMachine = new sfn.StateMachine(this, 'InterviewPromptStateMachine', {
      definition: generatePromptTask
        .addCatch(handleValidationError, {
          errors: ['Lambda.ValidationError'],
          resultPath: '$.error',
        })
        .addCatch(handleApiError, {
          errors: ['Lambda.ApiError'],
          resultPath: '$.error',
        }),
      timeout: cdk.Duration.minutes(5),
    });

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

    // Output the Step Function ARN
    new cdk.CfnOutput(this, 'StateMachineARN', {
      value: stateMachine.stateMachineArn,
      description: 'ARN of the Interview Prompt State Machine',
      exportName: `${id}-state-machine-arn`,
    });
  }
} 