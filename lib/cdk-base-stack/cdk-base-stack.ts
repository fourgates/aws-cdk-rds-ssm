import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as secretsManager from '@aws-cdk/aws-secretsmanager';
import * as  ssm from'@aws-cdk/aws-ssm';
import * as rds from '@aws-cdk/aws-rds';
import { SecurityGroup, ISecurityGroup } from '@aws-cdk/aws-ec2';
export interface CdkBaseStackProps extends cdk.StackProps {
  stage: string;
  yourIpAddres: string;
}

export class CdkBaseStack extends cdk.Stack {
  public readonly vpc:ec2.Vpc;
  public readonly rdsInstance: rds.DatabaseInstance;
  public readonly defaultSecurityGroup: ISecurityGroup;
  public readonly databaseCredentialsSecret: secretsManager.Secret;
  constructor(scope: cdk.Construct, id: string, props?: CdkBaseStackProps) {
    super(scope, id, props);

    // create a VPC with no private subnets. 
    // this is for our demo purpose as this will be cheaper since you do not need a nat gateway
    this.vpc = new ec2.Vpc(this, `VPC-${props?.stage}`, {
      natGateways:0,
      maxAzs: 2,
    });    

    // first, lets generate a secret to be used as credentials for our database
    this.databaseCredentialsSecret = new secretsManager.Secret(this, `${props?.stage}-DBCredentialsSecret`, {
      secretName: `${props?.stage}-credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'postgres',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });    

    // lets output a few properties to help use find the credentials 
    new cdk.CfnOutput(this, 'Secret Name', { value: this.databaseCredentialsSecret.secretName }); 
    new cdk.CfnOutput(this, 'Secret ARN', { value: this.databaseCredentialsSecret.secretArn }); 
    new cdk.CfnOutput(this, 'Secret Full ARN', { value: this.databaseCredentialsSecret.secretFullArn || '' });     

    // next, create a new string parameter to be use
    new ssm.StringParameter(this, 'DBCredentialsArn', {
      parameterName: `${props?.stage}-credentials-arn`,
      stringValue: this.databaseCredentialsSecret.secretArn,
    });      

    // get the default security group
    this.defaultSecurityGroup = SecurityGroup.fromSecurityGroupId(this, "SG", this.vpc.vpcDefaultSecurityGroup);

    if(props?.yourIpAddres){
      // your to access your RDS instance!
      this.defaultSecurityGroup.addIngressRule(ec2.Peer.ipv4(props.yourIpAddres), ec2.Port.tcp(5432), 'allow 5432 access from my IP');
    }
    // finally, lets configure and create our database!
    const rdsConfig: rds.DatabaseInstanceProps = {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_12_3 }),
      // optional, defaults to m5.large
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
      vpc: this.vpc,
      // make the db publically accessible
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceIdentifier: `${props?.stage}`,
      maxAllocatedStorage: 200,
      securityGroups: [this.defaultSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.databaseCredentialsSecret), // Get both username and password from existing secret
    }

    // create the instance
    this.rdsInstance = new rds.DatabaseInstance(this, `${props?.stage}-instance`, rdsConfig);

    // output the endpoint so we can connect!
    new cdk.CfnOutput(this, 'RDS Endpoint', { value: this.rdsInstance.dbInstanceEndpointAddress });     
  }
}
