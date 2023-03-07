type Transform<Input, Output> = (
	input: Input,
/** Unique key of the Sangria invocation. Is defined if Sangria is instanciated with `new Sangria({trace:true})` */
	traceKey?: string,
) => Promise<Output>;

export type Middleware<Input, T, U, Output> = {
	before: Transform<Input, T>;
	after: Transform<U, Output>;
	onError?: Transform<any, Output>; // Should throw if the error is not handled
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
