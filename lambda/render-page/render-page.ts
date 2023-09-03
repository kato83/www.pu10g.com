// バンドルしたくないものは require 指定
const aws = require('aws-sdk');

// バンドルしたいものは ESModule 形式で指定
// ※import type は型なのでバンドルされない
import type AWS from 'aws-sdk';
import render from 'preact-render-to-string';
import * as Preact from 'preact';
import { PageDetail } from './page-detail';

const dynamoDB: AWS.DynamoDB = new aws.DynamoDB();

type ApiGatewayEvent = {
  pathParameters: { [key: string]: string };
}

exports.handler = async (event: ApiGatewayEvent) => {

  const createResponse = (statusCode: number, message: string | any) => ({
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(typeof message === 'string' ? { message } : message),
    isBase64Encoded: false
  });

  const getItem = async (tableName: string, ULID: string) => {
    const param = {
      TableName: tableName,
      KeyConditionExpression: 'ULID = :ULID',
      ExpressionAttributeValues: {
        ':ULID': { S: ULID },
      },
      ScanIndexForward: false,
    };

    return dynamoDB.query(param).promise();
  }

  console.log(JSON.stringify(event, null, '  '));

  try {
    const ULID = event.pathParameters?.ULID;

    const result = await getItem('www.pu10g.com-published', ULID);
    console.log(result);
    // @todo reduce の第二引数の型指定 never のやつ
    const responseData = (result.Items ?? []).reduce((acc, current: { [key: string]: any }) => {
      if (acc.Items.length === 0) acc.Items = [{ ULID: current.ULID.S }];
      if (acc.Items[acc.Items.length - 1].ULID === current.ULID.S) {
        acc.Items[acc.Items.length - 1][current.DataType.S] = Object.values(current.DataValue)[0];
      } else {
        acc.Items[acc.Items.length] = { [current.DataType.S]: Object.values(current.DataValue)[0], ULID: current.ULID.S };
      }
      return acc;
    }, { ...result, Items: ([] as Array<any>) });

    // render 処理

    // @ts-ignore
    console.log(Preact.h(PageDetail, { content: responseData }));
    const s3 = new aws.S3();
    try {
      // putObject でフォルダを作成
      await s3.putObject({
        Bucket: 'www.pu10g.com-web',
        Key: `article/${ULID}/index.html`,
        ContentType: 'text/html',
        // @ts-ignore
        Body: `<!doctype html>${render(Preact.h(PageDetail, { content: responseData }))}`,
      }).promise();
    } catch (err) {
      console.log(err);
    }
    return createResponse(200, responseData);
  } catch (error) {
    console.error('Error adding item:', error);
    return createResponse(500, 'ERROR');
  }

  return createResponse(403, 'Request method is invalid.');
};