import bcrypt from "bcrypt";

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(Number(process.env.SALT_ROUNDS));
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

export const comparePassword = async (
  candidatePassword: string,
  hashedPassword: string
) => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};
