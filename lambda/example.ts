exports.handler = async (event: any) => ({
  "isBase64Encoded": false,
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  },
  "body": `{ "result": "OK" }`
});
