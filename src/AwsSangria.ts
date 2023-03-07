import Sangria from './core.js';

export const SangriaApiHandler = Sangria<
  AWSLambda.APIGatewayProxyEvent,
  AWSLambda.APIGatewayProxyResult
>;
export const SangriaSqsHandler = Sangria<AWSLambda.SQSEvent, void>;
export const SangriaSnsHandler = Sangria<AWSLambda.SNSEvent, void>;
export const SangriaDynamoStreamHandler = Sangria<
  AWSLambda.DynamoDBStreamEvent,
  void
>;
