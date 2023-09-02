exports.handler = function (
  event: { headers?: any; methodArn?: any },
  _context: any,
  callback: (string: string | null, arg?: any) => void) {
  const authorizationHeader = event.headers.Authorization;

  if (!authorizationHeader) return callback('Unauthorized');

  const encodedCreds = authorizationHeader.split(" ")[1];
  const plainCreds = (new Buffer(encodedCreds, 'base64')).toString().split(':');
  const username = plainCreds[0];
  const password = plainCreds[1];

  if (!(username === process.env['USERNAME'] && password === process.env['PASSWORD'])) return callback('Unauthorized');

  const authResponse = buildAllowAllPolicy(event, username);

  callback(null, authResponse);
}

function buildAllowAllPolicy(event: { methodArn?: any }, principalId: string) {
  const policy = {
    principalId: principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }
      ]
    }
  };
  return policy;
}