#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core';
import { CdkBaseStack } from '../lib/cdk-base-stack/cdk-base-stack';

class DemoApp extends Construct{
    constructor(scope: Construct, id:string){
        super(scope,id);
        const base:CdkBaseStack = new CdkBaseStack(this, 'CdkVpcStack');
    }
}
const app = new cdk.App();
new DemoApp(app, 'dev');