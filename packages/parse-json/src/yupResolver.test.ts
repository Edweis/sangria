import { describe, expect, it } from 'vitest';
import * as yup from 'yup';
import { yupResolver } from './yupResolver';

describe('yupResolver', () => {
  const resolver = yupResolver(
    yup.object({ hello: yup.number().required() }).required(),
  );
  it('should fail for empty', async () => {
    await expect(() => resolver({})).rejects.toEqual(
      'hello is a required field',
    );
  });
  it('should work for valid string', async () => {
    const str = JSON.stringify({ hello: 123 });
    expect(await resolver(str)).toEqual({ hello: 123 });
  });
  it('should fail for undefined', async () => {
    await expect(() => resolver(null)).rejects.toBeTruthy();
    await expect(() => resolver(undefined)).rejects.toBeTruthy();
  });
  it('should work for valid string', async () => {
    const str = JSON.stringify({ hello: 123 });
    expect(await resolver(str)).toEqual({ hello: 123 });
  });
});
