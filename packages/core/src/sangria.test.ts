import { describe, it, expect } from 'vitest';
import Sangria from './sangria.js';
import type { Middleware } from './types.js';

describe('Sangria', () => {
  const middleware1: Middleware<string, string[], number[], number> = {
    before: async (str) => str.split(''),
    after: async (arr) => arr.reduce((acc, val) => acc + val, 0),
  };
  const middleware2: Middleware<
    string[],
    { hello: string[] },
    { hello: number[] },
    number[]
  > = {
    before: async (arr) => ({ hello: arr }),
    after: async (obj) => obj.hello,
  };
  const middleware3: Middleware<
    { hello: string[] },
    { batman: string[] },
    { batman: number[] },
    { hello: number[] }
  > = {
    before: async (arr) => ({ batman: arr.hello }),
    after: async (obj) => ({ hello: obj.batman }),
  };

  describe('middleware', () => {
    it('should work without middleware', async () => {
      const handler = new Sangria().handle(async () => 'hello');

      expect(await handler({})).toEqual('hello');
    });
    it('should work without middleware with types', async () => {
      const handler = new Sangria<string, number>().handle(async (str) =>
        Number(str),
      );

      expect(await handler('141')).toEqual(141);
    });
    it('should work with a before middleware', async () => {
      const middleware: Middleware<string, string[], number, number> = {
        before: async (str) => str.split(''),
        after: async (num) => num,
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async (arr) => arr.length);

      expect(await handler('141')).toEqual(3);
    });
    it('should work with an after middleware', async () => {
      const middleware: Middleware<string, string, string[], number> = {
        before: async (str) => str,
        after: async (arr) => arr.length,
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async (str) => str.split(''));

      expect(await handler('abc')).toEqual(3);
    });
    it('should work with a full middleware', async () => {
      const middleware: Middleware<string, string[], number[], number> = {
        before: async (str) => str.split(''),
        after: async (arr) => arr.reduce((acc, val) => acc + val, 0),
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async (str) => str.map((_val, index) => index));

      expect(await handler('abcd')).toEqual(0 + 1 + 2 + 3);
    });
    it('should work with several middleware', async () => {
      const handler = new Sangria<string, number>()
        .use(middleware1)
        .use(middleware2)
        .use(middleware3)
        .handle(async (obj) => ({
          batman: obj.batman.map((_val, index) => index),
        }));

      expect(await handler('abcd')).toEqual(0 + 1 + 2 + 3);
    });
  });

  describe('error handling', () => {
    it('should catch errors', async () => {
      const middleware: Middleware<string, string[], number, number> = {
        before: async (str) => str.split(''),
        after: async (num) => num,
        onError: async (error) => 12,
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async () => {
          throw Error('Oooups !');
        });

      expect(await handler('141')).toEqual(12);
    });
    it('should let through uncaught errors', async () => {
      const middleware: Middleware<string, string[], number, number> = {
        before: async (str) => str.split(''),
        after: async (num) => num,
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async () => {
          throw Error('Oooups !');
        });

      await expect(handler('141')).rejects.toEqual(new Error('Oooups !'));
    });
    it('should let through uncaught errors and it should be caught later', async () => {
      const middleware2bis: typeof middleware2 = {
        ...middleware2,
        onError: async (error) => [error.message.length, 5, 5],
      };
      const handler = new Sangria<string, number>()
        .use(middleware1)
        .use(middleware2bis)
        .use(middleware3)
        .handle(async () => {
          throw Error('Oooups !');
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
        .use({ after: async (str) => `${str} you` })
        .handle(async () => 'hello');

      expect(await handler({})).toEqual('hello you');
    });
    it('should return with before middleware', async () => {
      const handler = new Sangria()
        .use({ before: async (str) => `${str} you` })
        .handle(async (str) => str);

      expect(await handler('hello')).toEqual('hello you');
    });
    it('should return with onError middleware', async () => {
      const handler = new Sangria()
        .use({ onError: async () => 'Caught!' })
        .handle(async () => {
          throw Error('Ooups !');
        });

      expect(await handler('hello')).toEqual('Caught!');
    });
    it('should reraise with onError middleware', async () => {
      const handler = new Sangria()
        .use({
          onError: async () => {
            throw Error('Not caught :(');
          },
        })
        .handle(async () => {
          throw Error('Ooups !');
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
        before: async (str, key) => {
          expect(key).toEqual(TRACE_KEY);

          return str.split('');
        },
        after: async (num, key) => {
          expect(key).toEqual(TRACE_KEY);

          return num;
        },
        onError: async (error, key) => {
          expect(key).toEqual(TRACE_KEY);

          return 12;
        },
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async () => {
          throw Error('Oooups !');
        });

      expect(await handler('141')).toEqual(12);
    });
    it('should have different keys everytime', async () => {
      const keys: (string | undefined)[] = [];
      const middleware: Middleware<string, string[], number, number> = {
        before: async (str, key) => {
          console.log('BEFORE', { str, key });
          keys.push(key);

          return str.split('');
        },
        after: async (num) => num,
      };
      const handler = new Sangria<string, number>()
        .use(middleware)
        .handle(async (input) => input.length);

      await Promise.all([handler('123'), handler('456')]);
      expect(keys[0]).toBeTruthy();
      expect(keys[1]).toBeTruthy();
      expect(keys[0]).not.toEqual(keys[1]);
    });
  });
});
