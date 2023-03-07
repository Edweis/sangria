import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { yupResolver } from './yupResolver';

describe('yupResolver', () => {
  const resolver = yupResolver(
    yup.object({ hello: yup.number().required() }).required(),
  );
  it('should fail for empty', () => {
    expect(() => resolver({})).toThrowError('hello is a required field');
  });
  it('should fail for valid string', () => {
    const str = JSON.stringify({ hello: 123 });
    expect(() => resolver(str)).not.toThrow();
  });
  it('should fail for undefined', () => {
    expect(() => resolver(null)).toThrow();
    expect(() => resolver(undefined)).toThrow();
  });
  it('should work for valid json', () => {
    expect(() => resolver({ hello: 123 })).not.toThrow();
  });
  it('should work for valid string', () => {
    const str = JSON.stringify({ hello: 123 });
    expect(resolver(str)).toEqual({ hello: 123 });
  });
});
