import { S3, DynamoDB } from 'aws-sdk';
import render from 'preact-render-to-string';
import { Article } from './Article';
import { apply } from '../../dynamo-crud/src/dynamo-utils';

const dynamoDB = new DynamoDB();

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

  try {
    const ULID = event.pathParameters?.ULID;

    const result = await getItem('www.pu10g.com-published', ULID);
    const responseData = apply(result.Items ?? []);

    const s3 = new S3();
    // putObject でフォルダを作成
    await s3.putObject({
      Bucket: 'www.pu10g.com-web',
      Key: `article/${ULID}/index.html`,
      ContentType: 'text/html',
      Body: `<!doctype html>\n${render(<Article {...responseData[0]} />)}`,
    }).promise();

    return createResponse(200, responseData);
  } catch (error) {
    console.error('Error adding item:', error);
    return createResponse(500, 'ERROR');
  }

  return createResponse(403, 'Request method is invalid.');
};
