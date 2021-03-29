#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { Construct } from '@aws-cdk/core';
import { CdkBaseStack, CdkBaseStackProps } from '../lib/cdk-base-stack/cdk-base-stack';

class DemoApp extends Construct{
    constructor(scope: cdk.App, id:string){
        super(scope,id);
        // create a small vpc for the demo
        const vpcProps: CdkBaseStackProps = {
            stage: id, 
            description: "Base VPC for AWS Cloud Application",
            tags: {env: id},
            stackName: `PublicVpcStack-${id}` // used in cloudformation for naming stack
        }        

        const base:CdkBaseStack = new CdkBaseStack(this, `CdkVpcStack-${id}`,
            vpcProps);
    }
}
const app = new cdk.App();
new DemoApp(app, 'dev');