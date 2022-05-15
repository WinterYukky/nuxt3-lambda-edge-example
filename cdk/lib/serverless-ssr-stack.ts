import { spawnSync } from "child_process";
import { copyFileSync } from "fs";
import { CfnOutput, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export class ServerlessSsrStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // build nuxt and copy wrapper to server directory
    spawnSync("yarn", ["build"], {
      stdio: "inherit",
      cwd: "..",
    });
    copyFileSync("./static/wrapper.mjs", "../.output/server/wrapper.mjs");

    // create lambda@edge that handler is wrapper.handler
    const edgeFunction = new cloudfront.experimental.EdgeFunction(
      this,
      "EdgeFunction",
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        handler: "wrapper.handler",
        code: lambda.Code.fromAsset("../.output/server"),
      }
    );

    // Create s3 and CloudFront Distribution
    const bucket = new s3.Bucket(this, "Bucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const s3Origin = new origins.S3Origin(bucket);
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      // default behavior from Lambda@Edge
      defaultBehavior: {
        origin: s3Origin,
        edgeLambdas: [
          {
            functionVersion: edgeFunction.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
      },
      // Only _nuxt (static asset) from S3
      additionalBehaviors: {
        "_nuxt/*": {
          origin: s3Origin,
        },
      },
    });

    // deploy static asset to S3
    new s3deployment.BucketDeployment(this, "Deployment", {
      sources: [s3deployment.Source.asset("../.output/public")],
      destinationBucket: bucket,
      distribution,
    });

    // Output URL for you
    new CfnOutput(this, "URL", {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
