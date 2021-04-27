import { Context, APIGatewayProxyEvent } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {

    console.log(JSON.stringify(event));

    return {
        statusCode: 200,
        body: JSON.stringify({
            status: 'healthy'
        }),
        headers: {
            'content-type': 'application/json'
        },
        isBase64Encoded: false
    };
};
