import Sangria from '@pantone/sangria';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as yup from 'yup';
import parseJson from './parseJson';
import { yupResolver } from './yupResolver';

describe('parseJson', () => {
  describe('with yupResolver', () => {
    type Event = { body: string; queryString: string };
    const schema = yup.object({ hello: yup.number().required() }).required();

    const fn = vi.fn();
    const handler = new Sangria<Event, void>()
      .use(parseJson('body', yupResolver(schema)))
      .handle(async (event) => fn(event));

    const validBody = JSON.stringify({ hello: 123 });
    const invalidBody = JSON.stringify({ batman: 123 });

    beforeEach(fn.mockReset);
    it('should parse a valid event', async () => {
      await handler({ body: validBody, queryString: 'batman' });
      expect(fn.mock.calls.length).toEqual(1);
      expect(fn.mock.calls[0][0]).toEqual({
        body: { hello: 123 },
        queryString: 'batman',
      });
    });

    it('should fail an invalid event', async () => {
      await expect(() =>
        handler({ body: invalidBody, queryString: 'batman' }),
      ).rejects.toBeTruthy();
    });
  });
});
