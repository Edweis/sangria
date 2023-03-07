/* eslint-disable no-unused-expressions */
import { describe, it, expect } from 'vitest';
import { AuthClaimMid, CognitoUserClaim } from '../index.js';
import sampleEvent from './sample.json';

const claimify = (claims: Partial<Record<CognitoUserClaim, string>>) => ({
  requestContext: { authorizer: { claims } },
});

describe('AuthClaimMid', () => {
  it('should fail if boolean claim is missing', async () => {
    const event = claimify({});

    await expect(
      AuthClaimMid({ 'custom:vendor': true }).before(event),
    ).rejects.toBeTruthy();
  });
  it('should pass if boolean claim is present', async () => {
    const event = claimify({ 'custom:vendor': 'hello' });

    await expect(
      AuthClaimMid({ 'custom:vendor': true }).before(event),
    ).resolves.toBeTruthy();
  });
  it('should pass if boolean mix', async () => {
    const event = claimify({ 'custom:vendor': 'hello', email: 'saf@asdf.fr' });

    await expect(
      AuthClaimMid({ 'custom:vendor': true }).before(event),
    ).resolves.toBeTruthy();
  });
  it('should fail if boolean claim is false', async () => {
    const event = claimify({ 'custom:vendor': 'false' });

    await expect(
      AuthClaimMid({ 'custom:vendor': true }).before(event),
    ).rejects.toBeTruthy();
  });
  it('should pass for a string claim', async () => {
    const event = claimify({ 'custom:vendor': 'hello', email: 'saf@asdf.fr' });

    await expect(
      AuthClaimMid({ 'custom:vendor': 'hello' }).before(event),
    ).resolves.toBeTruthy();
  });
  it('should fail for a string claim', async () => {
    const event = claimify({ 'custom:vendor': 'hello', email: 'saf@asdf.fr' });

    await expect(
      AuthClaimMid({ 'custom:vendor': 'batman' }).before(event),
    ).rejects.toBeTruthy();
  });

  const fn = (c: string) => c.split(',').includes('hello');

  it('should pass for a fn claim', async () => {
    const event = claimify({ 'custom:vendor': 'batman,hello,you' });

    await expect(
      AuthClaimMid({ 'custom:vendor': fn }).before(event),
    ).resolves.toBeTruthy();
  });
  it('should fail for a fn claim', async () => {
    const event = claimify({ 'custom:vendor': 'batman,robin' });

    await expect(
      AuthClaimMid({ 'custom:vendor': fn }).before(event),
    ).rejects.toBeTruthy();
  });

  it('should work for a holy mix', async () => {
    const event = claimify({
      'custom:vendor': 'batman,hello',
      email: 'asdf@asf.fr',
      'custom:permissions': 'oh yeah',
    });

    await expect(
      AuthClaimMid({
        'custom:vendor': fn,
        email: true,
        'custom:permissions': 'oh yeah',
      }).before(event),
    ).resolves.toBeTruthy();
    await expect(
      AuthClaimMid({
        'custom:vendor': fn,
        email: 'xx',
        'custom:permissions': 'oh yeah',
      }).before(event),
    ).rejects.toBeTruthy();
  });

  it('should tell when there is no authorizer', async () => {
    const permission = 'write_accounts';
    const mid = AuthClaimMid({
      'custom:store': true,
      'custom:vendor': true,
      'custom:permissions': (perm) =>
        permission == null || perm.split(',').includes(permission),
      email: true,
    });
    // @ts-ignore
    await expect(mid.before(sampleEvent)).rejects.to.match(
      /Missing authorizer/i,
    );
  });
});
