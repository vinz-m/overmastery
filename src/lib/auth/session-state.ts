type VerifiedClaimsResult = {
  data: {
    claims: { sub?: string } | null;
  } | null;
  error: unknown;
};

type SuccessfulVerifiedClaimsResult = {
  data: {
    claims: { sub: string };
  };
  error: null;
};

export function hasVerifiedClaims(
  result: VerifiedClaimsResult,
): result is SuccessfulVerifiedClaimsResult {
  return !result.error && Boolean(result.data?.claims?.sub);
}
