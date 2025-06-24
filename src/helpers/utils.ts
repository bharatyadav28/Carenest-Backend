export const getTokenPayload = (userId: string) => {
  return { user: { id: userId } };
};
