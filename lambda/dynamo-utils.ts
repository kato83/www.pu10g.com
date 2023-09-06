import { DynamoDB } from "aws-sdk";

export type DynamoContent = {
  ULID: string;
} & { [key: string]: any };

export const apply = (items: AWS.DynamoDB.ItemList) => items.reduce<DynamoContent[]>((list, current: { [key: string]: any }) => {
  if (list.length === 0) list = [{ ULID: current.ULID.S }];
  if (list[list.length - 1].ULID === current.ULID.S) {
    list[list.length - 1][current.DataType.S] = Object.values(current.DataValue)[0];
  } else {
    list[list.length] = { [current.DataType.S]: Object.values(current.DataValue)[0], ULID: current.ULID.S };
  }
  return list;
}, []);

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
          } as any
        }
      };
      if (tableName === 'www.pu10g.com-archived') data.PutRequest.Item['DataTypeRevision'] = { S: `${key}#${ulid}` };
      return data;
    })];
};

export const getItem = async (tableName: string, ULID: string) => {
  const dynamoDB: AWS.DynamoDB = new DynamoDB();

  const param = {
    TableName: tableName,
    KeyConditionExpression: 'ULID = :ULID',
    ExpressionAttributeValues: {
      ':ULID': { S: ULID },
    },
    ScanIndexForward: false,
  };

  return dynamoDB.query(param).promise();
};
