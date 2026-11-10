import { query } from "./pool.js";

export interface UserRow {
  user_id: string;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  profile_img: string | null;
  role: "admin" | "staff";
  status: boolean;
  created_at: string;
  updated_at: string;
}

export type SafeUser = Omit<UserRow, "password_hash">;

export interface CreateUserDbInput {
  name: string;
  email: string;
  password_hash: string;
  phone?: string | null;
  profile_img?: string | null;
  role?: "admin" | "staff";
  status?: boolean;
}

const USER_SELECT = `
  user_id::text AS user_id,
  name,
  email,
  password_hash,
  phone,
  profile_img,
  role,
  status,
  created_at,
  updated_at
`;

export async function getUserByEmailDb(
  email: string
): Promise<UserRow | null> {
  const res = await query<UserRow>(
    `SELECT ${USER_SELECT}
     FROM users
     WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return res.rows[0] ?? null;
}

export async function getUserByIdDb(
  userId: string
): Promise<SafeUser | null> {
  const res = await query<SafeUser>(
    `SELECT
       user_id::text AS user_id,
       name,
       email,
       phone,
       profile_img,
       role,
       status,
       created_at,
       updated_at
     FROM users
     WHERE user_id = $1`,
    [userId]
  );
  return res.rows[0] ?? null;
}

export async function countUsersDb(): Promise<number> {
  const res = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`);
  return parseInt(res.rows[0]?.count || "0", 10);
}

export async function createUserDb(
  input: CreateUserDbInput
): Promise<SafeUser> {
  const res = await query<SafeUser>(
    `INSERT INTO users (
       name,
       email,
       password_hash,
       phone,
       profile_img,
       role,
       status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING
       user_id::text AS user_id,
       name,
       email,
       phone,
       profile_img,
       role,
       status,
       created_at,
       updated_at`,
    [
      input.name,
      input.email.toLowerCase(),
      input.password_hash,
      input.phone ?? null,
      input.profile_img ?? null,
      input.role ?? "staff",
      input.status ?? true,
    ]
  );
  return res.rows[0];
}
