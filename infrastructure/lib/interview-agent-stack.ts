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

    // Create secrets for API keys
    const openaiSecret = new secretsmanager.Secret(this, 'OpenAIAPIKey', {
      secretName: `${id}-openai-api-key`,
      description: 'OpenAI API Key for interview prompt generation',
    });

    const elevenlabsSecret = new secretsmanager.Secret(this, 'ElevenLabsAPIKey', {
      secretName: `${id}-elevenlabs-api-key`,
      description: 'ElevenLabs API Key for speech processing',
    });

    // Create the Lambda functions
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

    const conversationalLambda = new lambda.Function(this, 'ConversationalLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'interviewConversational.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas')),
      environment: {
        ELEVENLABS_API_KEY_SECRET_ARN: elevenlabsSecret.secretArn,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant Lambda functions permission to read secrets
    openaiSecret.grantRead(promptGeneratorLambda);
    elevenlabsSecret.grantRead(conversationalLambda);

    // Create Lambda tasks for Step Function
    const generatePromptTask = new tasks.LambdaInvoke(this, 'GeneratePromptTask', {
      lambdaFunction: promptGeneratorLambda,
      outputPath: '$.Payload',
      resultPath: '$.promptResult',
    });

    const processConversationTask = new tasks.LambdaInvoke(this, 'ProcessConversationTask', {
      lambdaFunction: conversationalLambda,
      outputPath: '$.Payload',
      resultPath: '$.conversationResult',
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
      definitionBody: sfn.DefinitionBody.fromChainable(
        sfn.Chain
          .start(generatePromptTask)
          .next(processConversationTask)
          .next(new sfn.Succeed(this, 'SuccessState'))
      ),
      timeout: cdk.Duration.minutes(5),
    });

    // Add error handlers to the state machine
    stateMachine.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: [promptGeneratorLambda.functionArn, conversationalLambda.functionArn],
    }));

    // Output the secret ARNs for reference
    new cdk.CfnOutput(this, 'OpenAISecretARN', {
      value: openaiSecret.secretArn,
      description: 'ARN of the OpenAI API Key secret',
      exportName: `${id}-openai-secret-arn`,
    });

    new cdk.CfnOutput(this, 'ElevenLabsSecretARN', {
      value: elevenlabsSecret.secretArn,
      description: 'ARN of the ElevenLabs API Key secret',
      exportName: `${id}-elevenlabs-secret-arn`,
    });

    // Output the Lambda function ARNs
    new cdk.CfnOutput(this, 'PromptGeneratorLambdaARN', {
      value: promptGeneratorLambda.functionArn,
      description: 'ARN of the Prompt Generator Lambda function',
      exportName: `${id}-prompt-generator-lambda-arn`,
    });

    new cdk.CfnOutput(this, 'ConversationalLambdaARN', {
      value: conversationalLambda.functionArn,
      description: 'ARN of the Conversational Lambda function',
      exportName: `${id}-conversational-lambda-arn`,
    });

    // Output the Step Function ARN
    new cdk.CfnOutput(this, 'StateMachineARN', {
      value: stateMachine.stateMachineArn,
      description: 'ARN of the Interview Prompt State Machine',
      exportName: `${id}-state-machine-arn`,
    });
  }
} 