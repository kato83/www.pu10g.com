// バンドルしたくないものは require 指定
const aws = require('aws-sdk');

// バンドルしたいものは ESModule 形式で指定
// ※import type は型なのでバンドルされない
import type AWS from 'aws-sdk';
import { factory, detectPrng } from 'ulid';

const dynamoDB: AWS.DynamoDB = new aws.DynamoDB();

type ApiGatewayEvent = {
  pathParameters: { [key: string]: string };
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: string;
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

  const value2Type = (value: any) => {
    if (typeof value === 'string') return 'S';
    if (typeof value === 'number') return 'N';
    if (typeof value === 'boolean') return 'BOOL';
    if (Array.isArray(value) && value.every(k => typeof k === 'string')) return 'SS';
    // @todo 他の型の対応が必要になったら条件分岐を追加する必要がある
    return 'S';
  };

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

  const prng = detectPrng(true);
  const ulid = factory(prng)();

  type Content = {
    ULID: string;
    title: string;
    tags: string[];
    content: string;
    isPublish: boolean;
  }

  const method = event.httpMethod;

  try {
    switch (method) {
      case 'GET': {
        const ULID = event.pathParameters?.ULID;

        const result = await (ULID ? getItem('www.pu10g.com-published', ULID) : dynamoDB.scan({ TableName: 'www.pu10g.com-published' }).promise());
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
        return createResponse(200, responseData);
      }
      case 'PATCH':
      case 'POST': {
        const payload = await new Promise<Content>(resolve => resolve(JSON.parse(event.body)))
          .catch(_ => null);
        if (payload === null) return createResponse(400, 'Request body is invalid.');

        const date = new Date().toISOString();
        payload['updatedAt'] = date;
        payload['createdAt'] = date;
        const createRequestItems = (tableName: string) => [...Object.keys(payload)
          // @todo ホワイトリスト形式にする
          .filter(key => method === 'POST' || key !== 'createdAt')
          .map(key => {
            const data = {
              PutRequest: {
                Item: {
                  ULID: { S: method === 'POST' ? ulid : event.pathParameters.ULID },
                  DataType: { S: key },
                  DataValue: { [value2Type(payload[key])]: payload[key] }
                }
              }
            };
            if (tableName === 'www.pu10g.com-archived') data.PutRequest.Item['DataTypeRevision'] = { S: `${key}#${ulid}` };
            return data;
          })];

        const RequestItems = { 'www.pu10g.com-archived': createRequestItems('www.pu10g.com-archived') };
        if (payload.isPublish) RequestItems['www.pu10g.com-published'] = createRequestItems('www.pu10g.com-published');

        console.debug(JSON.stringify(RequestItems, null, '  '));

        const result = await dynamoDB.batchWriteItem({ RequestItems })
          .promise();
        console.log(result);

        return createResponse(200, 'OK');
      }
      case 'DELETE': {
        const publishedItems = ((await getItem('www.pu10g.com-published', event.pathParameters.ULID)).Items ?? []).map(item => ({
          DeleteRequest: {
            Key: {
              ULID: { S: item.ULID.S },
              DataType: { S: item.DataType.S }
            }
          }
        }));
        const archivedItems = ((await getItem('www.pu10g.com-archived', event.pathParameters.ULID)).Items ?? []).map(item => ({
          DeleteRequest: {
            Key: {
              ULID: { S: item.ULID.S },
              DataTypeRevision: { S: item.DataTypeRevision.S }
            }
          }
        }));

        if ([...publishedItems, ...archivedItems].length === 0) return createResponse(200, 'OK (EMPTY)');

        const params = { RequestItems: {} };
        if (publishedItems.length > 0) params.RequestItems['www.pu10g.com-published'] = publishedItems;
        if (archivedItems.length > 0) params.RequestItems['www.pu10g.com-archived'] = archivedItems;

        const result = await dynamoDB.batchWriteItem(params).promise();
        console.debug(result);

        return createResponse(200, 'OK');
      }
      default:
        return createResponse(403, 'Request method is invalid.');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    return createResponse(500, 'ERROR');
  }

  return createResponse(403, 'Request method is invalid.');
};