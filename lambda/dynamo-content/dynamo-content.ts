// バンドルしたくないものは require 指定
const aws = require('aws-sdk');

// バンドルしたいものは ESModule 形式で指定
// ※import type は型なのでバンドルされない
import type AWS from 'aws-sdk';
import { factory, detectPrng } from 'ulid';

const dynamoDB: AWS.DynamoDB = new aws.DynamoDB();

type ApiGatewayEvent = {
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: string;
}

const createResponse = (statusCode: number, message: string) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*'
  },
  body: JSON.stringify({ message }),
  isBase64Encoded: false
});

exports.handler = async (event: ApiGatewayEvent) => {

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

  const payload = await new Promise<Content>(resolve => resolve(JSON.parse(event.body)))
    .catch(_ => null);

  const value2Type = (value: any) => {
    if (typeof value === 'string') return 'S';
    if (typeof value === 'number') return 'N';
    if (typeof value === 'boolean') return 'BOOL';
    if (Array.isArray(value) && value.every(k => typeof k === 'string')) return 'SS';
    // @todo 他の型の対応が必要になったら条件分岐を追加する必要がある
    return 'S';
  };

  if (payload === null) return createResponse(400, 'Request body is invalid.');

  const method = event.httpMethod;

  try {
    switch (method) {
      case 'GET':
        break;
      case 'PATCH':
      case 'POST':
        const date = new Date().toISOString();
        payload['updatedAt'] = date;
        payload['createdAt'] = date;
        const createRequestItems = (tableName: string) => [...Object.keys(payload)
          // @todo ホワイトリスト形式にする（ULIDはパスパラメータにするか）
          .filter(key => key !== 'ULID' && (method === 'POST' || key!== 'createdAt'))
          .map(key => {
            const data = {
              PutRequest: {
                Item: {
                  ULID: { S: method === 'POST' ? ulid : payload.ULID },
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

        const result = await dynamoDB.batchWriteItem({ RequestItems: RequestItems })
          .promise();
        console.log(result);

        return createResponse(200, 'OK');
      case 'DELETE': {
        // const result = await dynamoDB.delete({
        //   TableName: 'www.pu10g.com-archived',
        //   Key: payload as any
        // }).promise();
        // console.debug(result);

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