#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { Pipeline } from '../lib/pipeline-stack';
import { ApplicationStack } from '../lib/application-stack';

const app = new cdk.App();
new Pipeline(app, 'sample-cdk-pipeline');
new ApplicationStack(app, 'application-stack', { env: { region: 'us-east-1' } });