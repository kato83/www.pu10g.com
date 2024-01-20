import * as cdk from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

const FQDN = "www.pu10g.com";

export class WwwPu10GComStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const registerTaskFunc = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "example",
      {
        runtime: Runtime.NODEJS_18_X,
        functionName: "example",
        entry: './lambda/example.ts',
        timeout: cdk.Duration.seconds(25),
        logRetention: 30,
      },
    );

    const restApi = new cdk.aws_apigateway.RestApi(this, FQDN, {
      restApiName: `Rest_API_with_Lambda_auth`,
      deployOptions: {
        stageName: 'v1',
      },
    });


    //API Gatewayにリクエスト先のリソースを追加
    const restApiHelloWorld = restApi.root.addResource('hello_world');

    //リソースにGETメソッド、Lambda統合プロキシを指定
    restApiHelloWorld.addMethod(
      'GET',
      new cdk.aws_apigateway.LambdaIntegration(registerTaskFunc)
    );
  }
}
