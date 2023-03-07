/* eslint-disable max-classes-per-file */
import { JsonObject, Opaque } from 'type-fest';
import { Middleware } from './core.js';

const isOffline = () => process.env?.IS_OFFLINE || false;

enum HttpStatus {
  BAD_REQUEST = 400,
  OK = 200,
  MOVED_PERMANENTLY = 301,
}

export class ApiError extends Error {
  status: number;

  data?: JsonObject;

  constructor(status: number, message: string, data?: JsonObject) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type RedirectCode = 301 | 302 | 303 | 304 | 305 | 307 | 308;
type RedirectHeaders = { location: string } & Record<string, string>;
export class ApiRedirect {
  status: RedirectCode;

  headers: RedirectHeaders;

  constructor(status: RedirectCode, headers: RedirectHeaders) {
    this.headers = headers;
    this.status = status;
  }
}

type SuccessCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 209;
export class ApiSuccess<T> {
  status: SuccessCode;

  headers: Record<string, string>;

  data: T;

  constructor(params: {
    status: SuccessCode;
    data: T;
    headers?: Record<string, string>;
  }) {
    this.status = params.status;
    this.headers = params.headers || {};
    this.data = params.data;
  }
}

type Message = Opaque<any>;
const stringifyMessage = (message: Message) =>
  typeof message === 'string'
    ? JSON.stringify({ message })
    : JSON.stringify(message);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Expose-Headers': '*',
};

const withCors = (headers: Record<string, string>) => ({
  ...headers,
  ...corsHeaders,
});

const success = <T extends Message = Message>(
  _message?: T,
  config?: { headers?: Record<string, string> },
) => {
  const message = _message instanceof ApiSuccess ? _message.data : _message;
  const headers =
    _message instanceof ApiSuccess ? _message.headers : config?.headers;
  const response: AWSLambda.APIGatewayProxyResult = {
    statusCode: HttpStatus.OK,
    body: stringifyMessage(message || 'OK'),
  };
  response.headers = withCors(headers || {});
  return response;
};
const redirect = (location: string) => {
  const response: AWSLambda.APIGatewayProxyResult = {
    statusCode: HttpStatus.MOVED_PERMANENTLY,
    body: '',
  };

  response.headers = withCors({
    Location: location,
  });

  return response;
};
const error = (
  err: Message | Error | ApiError,
  statusCode = HttpStatus.BAD_REQUEST,
) => {
  console.error(err);

  const headers = withCors({});
  if (err instanceof ApiRedirect)
    return { statusCode: err.status, headers: err.headers };

  if (err instanceof ApiError)
    return {
      statusCode: err.status,
      body: JSON.stringify({ message: err.message, data: err?.data }),
      headers,
    };
  if (err instanceof ApiSuccess)
    return { statusCode: err.status, body: err.data, headers: err.headers };

  if (err instanceof Error)
    return { statusCode, body: stringifyMessage(err.message), headers };

  return { statusCode, body: stringifyMessage(err.message), headers };
};

export const ApiGatewayMid = () =>
  ({
    before: async (event) => {
      if (!isOffline()) console.log(JSON.stringify(event));
      return event;
    },
    after: async (value) => success(value),
    onError: async (err) => error(err),
  } as Middleware<
    AWSLambda.APIGatewayProxyEvent,
    AWSLambda.APIGatewayProxyEvent,
    any,
    AWSLambda.APIGatewayProxyResult
  >);

export const ApiGatewayMidWithHeaders = () =>
  ({
    before: async (event) => {
      if (!isOffline()) console.log(JSON.stringify(event));
      return event;
    },
    after: async ({ data, headers }) => {
      JSON.stringify({ data, headers });
      return success(data, { headers });
    },
    onError: async (err) => error(err),
  } as Middleware<
    AWSLambda.APIGatewayProxyEvent,
    AWSLambda.APIGatewayProxyEvent,
    { data: any; headers: Record<string, string> },
    AWSLambda.APIGatewayProxyResult
  >);
export const ApiGatewayMidWithRedirect = () =>
  ({
    before: async (event) => {
      if (!isOffline()) console.log(JSON.stringify(event));
      return event;
    },
    after: async ({ location }) => redirect(location),
    onError: async (err) => error(err),
  } as Middleware<
    AWSLambda.APIGatewayProxyEvent,
    AWSLambda.APIGatewayProxyEvent,
    { location: string },
    AWSLambda.APIGatewayProxyResult
  >);
