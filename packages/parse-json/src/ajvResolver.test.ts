import { JTDSchemaType } from 'ajv/dist/core';
import { describe, expect, it } from 'vitest';
import ajvResolver from './ajvResolver';

describe('ajvResolver', () => {
  type MyData = {
    foo: number;
    bar?: string;
  };
  const parse = ajvResolver<MyData>({
    properties: {
      foo: { type: 'int32' },
    },
    optionalProperties: {
      bar: { type: 'string' },
    },
  });
  it('should work for a valid schema', async () => {
    expect(await parse(JSON.stringify({ foo: 123 }))).toEqual({ foo: 123 });
  });
});
