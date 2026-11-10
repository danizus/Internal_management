import {
  getUserByEmailDb,
  getUserByIdDb,
  createUserDb,
  countUsersDb,
  SafeUser,
} from "../db/users.db.js";
import {
  hashPassword,
  verifyPassword,
  generateToken,
} from "./auth.crypto.js";
import { HttpError } from "../middleware/errorHandler.js";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role?: "admin" | "staff";
}

export interface LoginResult {
  token: string;
  user: SafeUser;
}

export async function registerService(
  input: RegisterInput
): Promise<LoginResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = await getUserByEmailDb(normalizedEmail);
  if (existing) {
    throw new HttpError(409, "User with this email already exists");
  }

  // If this is the very first user in the database, promote to admin automatically
  const totalUsers = await countUsersDb();
  const role = totalUsers === 0 ? "admin" : input.role ?? "staff";

  const passwordHash = await hashPassword(input.password);
  const user = await createUserDb({
    name: input.name.trim(),
    email: normalizedEmail,
    password_hash: passwordHash,
    phone: input.phone?.trim() || null,
    role,
    status: true,
  });

  const token = generateToken({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
  });

  return { token, user };
}

export async function loginService(
  emailInput: string,
  passwordInput: string
): Promise<LoginResult> {
  const normalizedEmail = emailInput.trim().toLowerCase();
  const user = await getUserByEmailDb(normalizedEmail);
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  if (!user.status) {
    throw new HttpError(403, "Account is disabled. Contact administrator.");
  }

  const valid = await verifyPassword(passwordInput, user.password_hash);
  if (!valid) {
    throw new HttpError(401, "Invalid email or password");
  }

  const { password_hash, ...safeUser } = user;
  const token = generateToken({
    user_id: safeUser.user_id,
    email: safeUser.email,
    role: safeUser.role,
  });

  return { token, user: safeUser };
}

export async function getCurrentUserService(
  userId: string
): Promise<SafeUser> {
  const user = await getUserByIdDb(userId);
  if (!user) {
    throw new HttpError(404, "User profile not found");
  }
  return user;
}
