exports.handler = async (event, context, _callback) => {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'OK' }),
      isBase64Encoded: false
    };
};