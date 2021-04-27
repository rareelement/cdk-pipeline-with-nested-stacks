import * as cdk from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as s3 from '@aws-cdk/aws-s3';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as ssm from '@aws-cdk/aws-ssm';
import * as iam from '@aws-cdk/aws-iam';

export class Pipeline extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const codestarConnection = ssm.StringParameter.fromStringParameterName(this, 'GitHubConnection', '/cdk-pipeline-with-nested-stacks/codestar-connection-arn');

    const sourceArtifact = new codepipeline.Artifact('source');
    const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub',
      output: sourceArtifact,
      connectionArn: codestarConnection.stringValue,
      owner: 'rareelement',
      repo: 'cdk-pipeline-with-nested-stacks',
      branch: 'master',
    });

    const artifactBucket = new s3.Bucket(this, 'pipeline-artifacts', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const pipeline = new codepipeline.Pipeline(this, 'cdk-pipeline-nested-stacks', {
      pipelineName: 'cdk-pipeline-nested-stacks',
      stages: [
        {
          stageName: 'source',
          actions: [
            sourceAction
          ],
        },
      ],
      artifactBucket,
      crossAccountKeys: false
    });

    const buildStage = pipeline.addStage({
      stageName: 'build',
    });

    const synthProject = new codebuild.Project(
      this,
      'CDKSynth',
      {
        buildSpec: codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            pre_build: {
              commands: [
                'cd deployment',
                'npm install -g npm@7.10.0',
                'npm run tsc -v',
                'npm ci'
              ]
            },
            build: {
              commands: [
                'npm run build',
                'npx cdk synth'
              ]
            },
          },
          artifacts: {
            'base-directory': 'deployment/cdk.out',
            'files': '**/*'
          },
        }),
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          computeType: codebuild.ComputeType.SMALL,
        },
      });


    const synthArtifacts = new codepipeline.Artifact();
    const synthAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'cdk-synth',
      input: sourceArtifact,
      project: synthProject,
      outputs: [synthArtifacts],
      type: codepipeline_actions.CodeBuildActionType.BUILD,
      runOrder: 1,
    });
    buildStage.addAction(synthAction);

    const buildAppProject = new codebuild.PipelineProject(this, 'build-app', {
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          pre_build: {
            commands: [
              'npm install -g npm@7.10.0',
              'cd application',
              'npm install',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm install --only=production',
              'mv node_modules dist',
            ]
          },
        },
        artifacts: {
          'base-directory': 'application/dist',
          files: [
            '*',
            'node_modules/**/*',
          ],
        },
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        computeType: codebuild.ComputeType.SMALL,
      },
    });


    const appArtifacts = new codepipeline.Artifact('lambda');

    const buildAppAction = new codepipeline_actions.CodeBuildAction({
      actionName: 'build-app',
      input: sourceArtifact,
      project: buildAppProject,
      outputs: [appArtifacts],
      type: codepipeline_actions.CodeBuildActionType.BUILD,
      runOrder: 1,
    });
    buildStage.addAction(buildAppAction);

    // Stage 2: Deploy to Dev environment
    const deployStage = pipeline.addStage({
      stageName: 'deploy',
    });

    // Action 1: deploy to dev
    const deployDevAction = new codepipeline_actions.CloudFormationCreateUpdateStackAction({
      actionName: 'deploy-app-stack',
      templatePath: synthArtifacts.atPath('application-stack.template.json'),
      stackName: 'application-stack',
      adminPermissions: true,
      parameterOverrides: {
        S3ArtifactBucketName: appArtifacts.s3Location.bucketName,
        S3ArtifactBucketObject: appArtifacts.s3Location.objectKey
      },
      extraInputs: [appArtifacts],
    });

    deployStage.addAction(
      deployDevAction
    );

    artifactBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [
          deployDevAction.deploymentRole
        ],
        effect: iam.Effect.ALLOW,
        resources: [
          `${artifactBucket.bucketArn}`,
          `${artifactBucket.bucketArn}/*`
        ],
        actions: [
          's3:GetObject*',
          's3:GetBucket*',
          's3:List*'
        ],
      })
    );
  }
}
