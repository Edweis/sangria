import { get, keys } from 'lodash-es';
import { ApiError } from '../ApiGatewayMid.js';
import { BeforeMiddleware } from '../core.js';

export type CognitoUserClaim =
  | 'custom:permissions'
  | 'custom:store'
  | 'custom:vendor'
  | 'iss'
  | 'cognito:username'
  | 'email'
  | 'sub'
  | 'custom:notifications';

type ClaimCheck = string | true | ((claim: string) => boolean);

export const validateClaim = (
  claims: Record<string, any>,
  key: string | undefined,
  check: ClaimCheck,
) => {
  const claim = claims[key as any];

  if (check === true && (claim == null || claim === 'false'))
    return `Claim ${key} is missing.`;
  if (typeof check === 'string' && claim !== check)
    return `Claim ${key} is not "${check}"`;
  if (typeof check === 'function' && (claim == null || check(claim) === false))
    return `Claim ${key} is invalid.`;

  return undefined;
};

function getEventClaims(event: any) {
  const claims = get(event, `requestContext.authorizer.claims`, undefined);
  return claims as Record<CognitoUserClaim, string> | undefined;
}
function checkAllClaims<T extends CognitoUserClaim>(
  claims: Record<T, string>,
  claimCheck: Partial<Record<CognitoUserClaim, ClaimCheck>>,
) {
  const requiredClaims = keys(claimCheck) as Array<keyof typeof claimCheck>;
  const errors = requiredClaims
    .map((key) => validateClaim(claims, key, claimCheck[key] as ClaimCheck))
    .filter((e) => e != null);

  if (errors.length > 0)
    throw new ApiError(401, `Claims error: ${errors.join(' - ')}`);
}
export const AuthClaimMid = <T extends CognitoUserClaim, Parent, ParentOutput>(
  claimCheck: Partial<Record<CognitoUserClaim, ClaimCheck>>,
): BeforeMiddleware<
  Parent,
  Parent & { claims: Record<T, string> & Record<string, string> },
  ParentOutput
> => {
  // check params
  if (keys(claimCheck).length === 0)
    throw Error(
      'AuthClaimMid should have some claim check. If none is necessary, then you can remove AuthClaimMid.',
    );
  return {
    before: async (event) => {
      const claims = getEventClaims(event);
      console.log({ claims });
      if (claims == null)
        throw new ApiError(401, 'Missing authorizer around the endpoint');
      checkAllClaims(claims, claimCheck);
      console.log({ claims });

      return { ...event, claims };
    },
  };
};
