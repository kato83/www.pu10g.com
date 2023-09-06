import { DynamoDB, S3 } from 'aws-sdk';
import { factory, detectPrng } from 'ulid';
import { apply, getItem, unapply } from '../dynamo-utils';

const dynamoDB: AWS.DynamoDB = new DynamoDB();
const TABLE = {
  PUBLISHED: 'www.pu10g.com-published',
  ARCHIVED: 'www.pu10g.com-archived'
} as const;
type TABLE = typeof TABLE[keyof typeof TABLE];

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
        const result = await (ULID ? getItem(TABLE.ARCHIVED, ULID) : dynamoDB.scan({ TableName: TABLE.ARCHIVED }).promise());
        return createResponse(200, { ...result, Items: apply(result.Items ?? []) });
      }
      case 'PATCH':
      case 'POST': {
        const date = new Date().toISOString();
        const payload = await new Promise<Content>(resolve => resolve(JSON.parse(event.body)))
          .then(json => ({ ...json, updatedAt: date, createdAt: date }))
          .catch(_ => null);

        if (payload === null) return createResponse(400, 'Request body is invalid.');

        const ULID = method === 'POST' ? ulid : event.pathParameters?.ULID;

        const RequestItems: Partial<Record<TABLE, any>> = { [TABLE.ARCHIVED]: unapply(TABLE.ARCHIVED, payload, ULID, method) };
        if (payload.isPublish) RequestItems[TABLE.PUBLISHED] = unapply(TABLE.PUBLISHED, payload, ULID, method);

        await dynamoDB.batchWriteItem({ RequestItems }).promise();
        return createResponse(200, 'OK');
      }
      case 'DELETE': {
        const publishedItems = ((await getItem(TABLE.PUBLISHED, event.pathParameters.ULID)).Items ?? []).map(item => ({
          DeleteRequest: { Key: { ULID: { S: item.ULID.S }, DataType: { S: item.DataType.S } } }
        }));
        const archivedItems = ((await getItem(TABLE.ARCHIVED, event.pathParameters.ULID)).Items ?? []).map(item => ({
          DeleteRequest: { Key: { ULID: { S: item.ULID.S }, DataTypeRevision: { S: item.DataTypeRevision.S } } }
        }));

        if ([...publishedItems, ...archivedItems].length === 0) return createResponse(200, 'OK (EMPTY)');

        const params: { RequestItems: { [tableName: string]: any } } = { RequestItems: {} };
        if (publishedItems.length > 0) params.RequestItems[TABLE.PUBLISHED] = publishedItems;
        if (archivedItems.length > 0) params.RequestItems[TABLE.ARCHIVED] = archivedItems;

        const s3 = new S3();
        const result = await Promise.all([
          dynamoDB.batchWriteItem(params).promise(),
          s3.deleteObject({
            Bucket: 'www.pu10g.com-web',
            Key: `article/${event.pathParameters.ULID}/index.html`,
          }).promise()
        ]);
        console.log(result);

        return createResponse(200, 'OK');
      }
      default:
        return createResponse(403, 'Request method is invalid.');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    return createResponse(500, 'ERROR');
  }
};
