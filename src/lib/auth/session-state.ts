type VerifiedUserResult<TUser extends { id?: string }> = {
  data: {
    user: TUser | null;
  };
  error: unknown;
};

type SuccessfulVerifiedUserResult<TUser extends { id?: string }> = {
  data: {
    user: TUser & { id: string };
  };
  error: null;
};

export function hasVerifiedUser<TUser extends { id?: string }>(
  result: VerifiedUserResult<TUser>,
): result is SuccessfulVerifiedUserResult<TUser> {
  return !result.error && Boolean(result.data.user?.id);
}
