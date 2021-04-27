import * as lambda from '@aws-cdk/aws-lambda';
import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2'

export class LambdaStack extends cdk.NestedStack {

    constructor(stack: cdk.Construct, id: string,
        props: cdk.NestedStackProps & {
            s3NameParam: cdk.CfnParameter;
            s3ObjectKeyParam: cdk.CfnParameter;
            vpc: ec2.Vpc
        }) {
        super(stack, id, props);

        const { s3NameParam, s3ObjectKeyParam, vpc } = props;

        const bucket = s3.Bucket.fromBucketName(this, 'app-artifact-bucket', s3NameParam.valueAsString);
        const code = lambda.Code.fromBucket(bucket, s3ObjectKeyParam.valueAsString);

        const lamdaFunction = new lambda.Function(this, `lambda`, {
            code,
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_14_X,
            vpc
        });
    }
}
