import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashBirthDate(birthDate: string): Promise<string> {
  // Normalize date string (YYYY-MM-DD)
  return bcrypt.hash(birthDate.trim(), SALT_ROUNDS);
}

export async function verifyBirthDate(birthDate: string, hash: string): Promise<boolean> {
  return bcrypt.compare(birthDate.trim(), hash);
}
