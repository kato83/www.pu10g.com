import { DynamoDB } from 'aws-sdk';
import { factory, detectPrng } from 'ulid';

const dynamoDB: AWS.DynamoDB = new DynamoDB();

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

  const prng = detectPrng(true);
  const ulid = factory(prng)();

  type Content = {
    ULID: string;
    title: string;
    tags: string[];
    content: string;
    isPublish: boolean;
    updatedAt?: string;
    createdAt?: string;
  }

  const method = event.httpMethod;

  try {
    switch (method) {
      case 'GET': {
        const ULID = event.pathParameters?.ULID;
        const result = await (ULID ? getItem('www.pu10g.com-published', ULID) : dynamoDB.scan({ TableName: 'www.pu10g.com-published' }).promise());
        const responseData = apply(result.Items ?? []);
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

        const RequestItems = {
          'www.pu10g.com-archived': unapply(
            'www.pu10g.com-archived',
            payload,
            method === 'POST' ? ulid : event.pathParameters?.ULID,
            method)
        };
        if (payload.isPublish) RequestItems['www.pu10g.com-published'] = unapply(
          'www.pu10g.com-published',
          payload,
          method === 'POST' ? ulid : event.pathParameters?.ULID,
          method
        );

        await dynamoDB.batchWriteItem({ RequestItems }).promise();
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

        await dynamoDB.batchWriteItem(params).promise();

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

export const unapply = (
  tableName: 'www.pu10g.com-archived' | 'www.pu10g.com-published',
  payload: { [key: string]: any },
  ulid: string,
  method: 'PATCH' | 'POST'
) => {
  const value2Type = (value: any) => {
    if (typeof value === 'string') return 'S';
    if (typeof value === 'number') return 'N';
    if (typeof value === 'boolean') return 'BOOL';
    if (Array.isArray(value) && value.every(k => typeof k === 'string')) return 'SS';
    // @todo 他の型の対応が必要になったら条件分岐を追加する必要がある
    return 'S';
  };

  return [...Object.keys(payload)
    // @todo ホワイトリスト形式にする
    .filter(key => method === 'POST' || key !== 'createdAt')
    .map(key => {
      const data = {
        PutRequest: {
          Item: {
            ULID: { S: ulid },
            DataType: { S: key },
            DataValue: { [value2Type(payload[key])]: payload[key] }
          }
        }
      };
      if (tableName === 'www.pu10g.com-archived') data.PutRequest.Item['DataTypeRevision'] = { S: `${key}#${ulid}` };
      return data;
    })];
};

type DynamoContentList = {
  ULID: string;
} & { [key: string]: any };

export const apply = (items: AWS.DynamoDB.ItemList) => items.reduce<DynamoContentList[]>((list, current) => {
  if (list.length === 0) list = [{ ULID: current.ULID.S! }];
  const offset = list[list.length - 1].ULID === current.ULID.S ? -1 : 0
  list[list.length - offset] = {
    ...list[list.length - 1],
    [current.DataType.S!]: Object.values(current.DataValue)[0],
    ULID: current.ULID.S!
  };
  return list;
}, []);
