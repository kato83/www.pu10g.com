export type PublilshedDynamoDBItemList = {
  ULID: { S: string };
  DataType: { S: string };
  DataValue: {
    S?: string,
    B?: BinaryData,
    N?: number,
    SS?: string[],
    NS?: number[],
    BS?: BinaryData[],
    M?: { [key: string | number]: any },
    L?: Array<any>,
    BOOL?: boolean,
    NULL: null
  };
}

export type ArchivedDynamoDBItemList = PublilshedDynamoDBItemList & {
  DataTypeRevision: { S: string };
}
