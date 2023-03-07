import {describe, it, expect} from 'vitest';
import Sangria from './index.js';
import type {Middleware} from './index.js';

describe('Sangria', () => {
	const middleware1: Middleware<string, string[], number[], number> = {
		before: async string_ => string_.split(''),
		after: async array => array.reduce((acc, value) => acc + value, 0),
	};
	const middleware2: Middleware<
	string[],
	{hello: string[]},
	{hello: number[]},
	number[]
	> = {
		before: async array => ({hello: array}),
		after: async object => object.hello,
	};
	const middleware3: Middleware<
	{hello: string[]},
	{batman: string[]},
	{batman: number[]},
	{hello: number[]}
	> = {
		before: async array => ({batman: array.hello}),
		after: async object => ({hello: object.batman}),
	};

	describe('middleware', () => {
		it('should work without middleware', async () => {
			const handler = new Sangria().handle(async () => 'hello');

			expect(await handler({})).toEqual('hello');
		});
		it('should work without middleware with types', async () => {
			const handler = new Sangria<string, number>().handle(async string_ =>
				Number(string_),
			);

			expect(await handler('141')).toEqual(141);
		});
		it('should work with a before middleware', async () => {
			const middleware: Middleware<string, string[], number, number> = {
				before: async string_ => string_.split(''),
				after: async number_ => number_,
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async array => array.length);

			expect(await handler('141')).toEqual(3);
		});
		it('should work with an after middleware', async () => {
			const middleware: Middleware<string, string, string[], number> = {
				before: async string_ => string_,
				after: async array => array.length,
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async string_ => string_.split(''));

			expect(await handler('abc')).toEqual(3);
		});
		it('should work with a full middleware', async () => {
			const middleware: Middleware<string, string[], number[], number> = {
				before: async string_ => string_.split(''),
				after: async array => array.reduce((acc, value) => acc + value, 0),
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async string_ => string_.map((_value, index) => index));

			expect(await handler('abcd')).toEqual(0 + 1 + 2 + 3);
		});
		it('should work with several middleware', async () => {
			const handler = new Sangria<string, number>()
				.use(middleware1)
				.use(middleware2)
				.use(middleware3)
				.handle(async object => ({
					batman: object.batman.map((_value, index) => index),
				}));

			expect(await handler('abcd')).toEqual(0 + 1 + 2 + 3);
		});
	});

	describe('error handling', () => {
		it('should catch errors', async () => {
			const middleware: Middleware<string, string[], number, number> = {
				before: async string_ => string_.split(''),
				after: async number_ => number_,
				onError: async error => 12,
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async () => {
					throw new Error('Oooups !');
				});

			expect(await handler('141')).toEqual(12);
		});
		it('should let through uncaught errors', async () => {
			const middleware: Middleware<string, string[], number, number> = {
				before: async string_ => string_.split(''),
				after: async number_ => number_,
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async () => {
					throw new Error('Oooups !');
				});

			await expect(handler('141')).rejects.toEqual(new Error('Oooups !'));
		});
		it('should let through uncaught errors and it should be caught later', async () => {
			const middleware2bis: typeof middleware2 = {
				...middleware2,
				onError: async error => [error.message.length, 5, 5],
			};
			const handler = new Sangria<string, number>()
				.use(middleware1)
				.use(middleware2bis)
				.use(middleware3)
				.handle(async () => {
					throw new Error('Oooups !');
				});

			expect(await handler('141')).toEqual('Oooups !'.length + 5 + 5);
		});
	});

	describe('partial middleware', () => {
		it('should return the same value with an empty middleware', async () => {
			const handler = new Sangria().use({}).handle(async () => 'hello');

			expect(await handler({})).toEqual('hello');
		});
		it('should return with after middleware', async () => {
			const handler = new Sangria()
				.use({after: async string_ => `${string_} you`})
				.handle(async () => 'hello');

			expect(await handler({})).toEqual('hello you');
		});
		it('should return with before middleware', async () => {
			const handler = new Sangria()
				.use({before: async string_ => `${string_} you`})
				.handle(async string_ => string_);

			expect(await handler('hello')).toEqual('hello you');
		});
		it('should return with onError middleware', async () => {
			const handler = new Sangria()
				.use({onError: async () => 'Caught!'})
				.handle(async () => {
					throw new Error('Ooups !');
				});

			expect(await handler('hello')).toEqual('Caught!');
		});
		it('should reraise with onError middleware', async () => {
			const handler = new Sangria()
				.use({
					async onError() {
						throw new Error('Not caught :(');
					},
				})
				.handle(async () => {
					throw new Error('Ooups !');
				});

			await expect(handler('hello')).rejects.toEqual(
				new Error('Not caught :('),
			);
		});
	});

	describe('traceKey', () => {
		it.skip('should keep the trace', async () => {
			const TRACE_KEY = '12345';

			// SHOULD WORK BUT WE CAN'T MOCK USING esbuild-jest https://github.com/aelbore/esbuild-jest/issues/57#issuecomment-1011994211
			// mockNanoid.mockReturnValueOnce(TRACE_KEY);
			const middleware: Middleware<string, string[], number, number> = {
				async before(string_, key) {
					expect(key).toEqual(TRACE_KEY);

					return string_.split('');
				},
				async after(number_, key) {
					expect(key).toEqual(TRACE_KEY);

					return number_;
				},
				async onError(error, key) {
					expect(key).toEqual(TRACE_KEY);

					return 12;
				},
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async () => {
					throw new Error('Oooups !');
				});

			expect(await handler('141')).toEqual(12);
		});
		it('should have different keys everytime', async () => {
			const keys: Array<string | undefined> = [];
			const middleware: Middleware<string, string[], number, number> = {
				async before(string_, key) {
					console.log('BEFORE', {str: string_, key});
					keys.push(key);

					return string_.split('');
				},
				after: async number_ => number_,
			};
			const handler = new Sangria<string, number>()
				.use(middleware)
				.handle(async input => input.length);

			await Promise.all([handler('123'), handler('456')]);
			expect(keys[0]).toBeTruthy();
			expect(keys[1]).toBeTruthy();
			expect(keys[0]).not.toEqual(keys[1]);
		});
	});
});
