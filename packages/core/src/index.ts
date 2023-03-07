import { nanoid } from 'nanoid';
import pMap, { Options } from 'p-map';

type Transform<Input, Output> = (
  input: Input,
  /** Unique key of the Sangria invocation. Is defined if Sangria is instanciated with `new Sangria({trace:true})` */
  traceKey?: string,
) => Promise<Output>;

export type Middleware<Input, T, U, Output> = {
  before: Transform<Input, T>;
  after: Transform<U, Output>;
  onError?: Transform<any, Output>; // should throw if the error is not handled
};
export type BeforeMiddleware<Input, T, Output> = {
  before: Transform<Input, T>;
  onError?: Transform<any, Output>;
};
export type AfterMiddleware<U, Output> = {
  after: Transform<U, Output>;
  onError?: Transform<any, Output>;
};
export type PassThroughMiddleware<Input, Output> = {
  before: Transform<Input, Input>;
  after: Transform<Output, Output>;
  onError?: Transform<any, never>; // Should raise
};
export type ErrorMiddleware<Output> = {
  onError?: Transform<any, Output>;
};

const defaultMiddleware = <Input, Output>(): Middleware<
  Input,
  Input,
  Output,
  Output
> => ({ before: async (event) => event, after: async (result) => result });

/**
 * Sangria is a typescript middleware (homenade). You can plug-in processes to an async functional to make it functional.
 * Such as:
 * ```
 * const lambdaHandler = new Sangria()
 *     .use(ApiGatewayMid()) // nice input/ouput for apigateway lambdas
 *     .use(ParseMid('body', yupSchema)) // parse the event.body with yup
 *     .handle(async (event) => ...)
 * ```
 * Middlewares are object with keys:
 *  - before: async function that is applied to the input of the handler
 *  - after: async function that is applied to the response of the handler
 *  - onError: an optional function that either can parse an error to a valid response.
 */
export default class Sangria<
  Input = any,
  Output = any,
  ParentInput = any,
  ParentOutput = any,
  FirstParentInput = Input,
  FirstParentOutput = Output,
> {
  private middleware: Middleware<Input, any, any, Output> = defaultMiddleware();

  private Parent:
    | Sangria<
        ParentInput,
        ParentOutput,
        any,
        any,
        FirstParentInput,
        FirstParentOutput
      >
    | undefined;
  // private Parent: Sangria<SuperInput, SuperOutput>=

  constructor(
    Parent?: Sangria<
      ParentInput,
      ParentOutput,
      any,
      any,
      FirstParentInput,
      FirstParentOutput
    >,
  ) {
    if (Parent) this.Parent = Parent;
  }

  /**
   *  Use a new middleware
   * @param middleware A regular middleware
   */
  use<T, U>(
    middleware: Middleware<Input, T, U, Output>,
  ): Sangria<T, U, Input, Output, FirstParentInput, FirstParentOutput>;

  /**
   * Use a new middleware
   * @param middleware A BeforeMiddleware
   */
  use<T>(
    middleware: BeforeMiddleware<Input, T, Output>,
  ): Sangria<T, Output, Input, Output, FirstParentInput, FirstParentOutput>;

  /**
   * Use a new middleware
   * @param middleware An AfterMiddleware
   */
  use<U>(
    middleware: AfterMiddleware<U, Output>,
  ): Sangria<Input, U, Input, Output, FirstParentInput, FirstParentOutput>;

  /**
   * Use a new middleware
   * @param middleware An ErrorMiddleware
   */
  use(
    middleware: ErrorMiddleware<Output>,
  ): Sangria<Input, Output, Input, Output, FirstParentInput, FirstParentOutput>;

  use<T, U>(
    middleware: Middleware<Input, T, U, Output>,
  ): Sangria<T, U, Input, Output, FirstParentInput, FirstParentOutput> {
    if (middleware == null) throw Error('Cannot add an undefined middleware.');
    this.middleware = middleware;
    type SuperInput = Input;
    type SuperOutput = Output;

    return new Sangria<
      T,
      U,
      SuperInput,
      SuperOutput,
      FirstParentInput,
      FirstParentOutput
    >(this);
  }

  /**
   * Run before of the middleware if exists
   * @param event event as input
   */
  private async runThisBefore<T>(event: Input, traceKey?: string): Promise<T> {
    if (this.middleware.before == null) return event as unknown as T; // no before, so we consider the input as not formated

    return this.middleware.before(event, traceKey) as Promise<T>;
  }

  /**
   * Run after of the middleware if exists
   * @param event event as input
   */
  private async runThisAfter<U>(event: U, traceKey?: string): Promise<Output> {
    if (this.middleware.after == null) return event as unknown as Output; // no after, so we consider the output as not formated

    return this.middleware.after(event, traceKey) as Promise<Output>;
  }

  protected async runBefore<T>(
    event: FirstParentInput,
    traceKey?: string,
  ): Promise<T> {
    if (this.Parent == null) {
      const parsedEvent = event as unknown as Input; // we are the first parent

      return this.runThisBefore<T>(parsedEvent, traceKey);
    }
    const parsedEvent = await this.Parent.runBefore<Input>(event, traceKey);

    return this.runThisBefore<T>(parsedEvent, traceKey);
  }

  protected async runAfter<U>(
    result: U,
    traceKey?: string,
  ): Promise<FirstParentOutput> {
    const parsedResult = await this.runThisAfter(result, traceKey);

    if (this.Parent == null)
      return parsedResult as unknown as FirstParentOutput;

    return this.Parent.runAfter(parsedResult, traceKey);
  }

  /**
   * Error caught will run through all middleware onError. Even if it happened at the first middleware.before.
   */
  protected async handleError(
    error: any,
    traceKey?: string,
  ): Promise<FirstParentOutput> {
    let parseError = error;

    if (this.middleware.onError != null)
      try {
        const caughtResult = await this.middleware.onError(error, traceKey);

        if (this.Parent == null)
          // We are the last parent so we return the last output
          return caughtResult as unknown as FirstParentOutput;

        return this.Parent.runAfter(caughtResult, traceKey);
      } catch (subError) {
        // if the middleware fail, we use the new error to be propagated
        parseError = subError;
      }

    if (this.Parent == null)
      // if no parents, there is nothing to do else but crash :/
      throw parseError;

    return this.Parent.handleError(parseError, traceKey); // if there is a parent, we pass the error
  }

  handle(
    fn: (event: Input, traceKey?: string) => Promise<Output>,
  ): (event: FirstParentInput) => Promise<FirstParentOutput> {
    // @ts-ignored
    if (this.Parent == null) return fn;

    return async (event: FirstParentInput) => {
      const traceKey = nanoid(5);

      try {
        if (this.Parent == null)
          throw Error('[Sangria] Parent is not supposed to be null');
        const parsedEvent: Input = await this.Parent.runBefore<Input>(
          event,
          traceKey,
        );
        const result: Output = await fn(parsedEvent, traceKey);
        const parsedResult = await this.Parent.runAfter<Output>(
          result,
          traceKey,
        );

        // @ts-ignore
        return parsedResult as FirstParentOutput;
      } catch (error: any) {
        return this.handleError(error, traceKey);
      }
    };
  }

  handleMap<T>(
    mapper: Output extends void ? (event: Input) => Array<T> : never,
    fn: Parameters<
      Sangria<
        T,
        any,
        ParentInput,
        ParentOutput,
        FirstParentInput,
        FirstParentOutput
      >['handle']
    >[0],
    options: Options = { concurrency: 1 },
  ) {
    // @ts-ignore
    return this.handle(async (event) => {
      await pMap(mapper(event), (item) => fn(item), options);
    });
  }
}
 