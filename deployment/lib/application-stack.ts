import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import { LambdaStack } from './lambda-stack';

export class ApplicationStack extends cdk.Stack {

    vpc: ec2.Vpc;

    // stack parameters
    s3NameParam: cdk.CfnParameter;
    s3ObjectKeyParam: cdk.CfnParameter;

    lambdaStack: LambdaStack;

    constructor(app: cdk.Construct, id: string, props: cdk.StackProps) {

        super(app, id, props);

        this.s3NameParam = new cdk.CfnParameter(this, 'S3ArtifactBucketName', { type: 'String', });
        this.s3ObjectKeyParam = new cdk.CfnParameter(this, 'S3ArtifactBucketObject', { type: 'String', });

        this.vpc = new ec2.Vpc(this, `app-vpc`, {
            cidr: '10.1.0.0/24',
            natGateways: 0,
        });

        this.lambdaStack = new LambdaStack(this, `lambda-stack`, {
            s3NameParam: this.s3NameParam,
            s3ObjectKeyParam: this.s3ObjectKeyParam,
            vpc: this.vpc,
        });

    }
}
