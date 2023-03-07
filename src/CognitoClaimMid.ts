import { UserPermissions } from '../constants/index.js';
import { AuthClaimMid } from './index.js';

export const CognitoClaimMid = <Parent, ParentOutput>(
  permission: UserPermissions | undefined,
) =>
  AuthClaimMid<
    | 'custom:vendor'
    | 'custom:permissions'
    | 'custom:store'
    | 'iss'
    | 'email'
    | 'custom:notifications',
    Parent,
    ParentOutput
  >({
    'custom:store': true,
    'custom:vendor': true,
    'custom:permissions': (perm) =>
      permission == null || perm.split(',').includes(permission),
    email: true,
  });
