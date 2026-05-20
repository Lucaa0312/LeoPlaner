const BASE_URL = "http://localhost:8080/api/auth";

export interface UserResponse {
  username: string;
  email: string;
}

export async function register(username: string, email: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Registration failed");
  return data;
}

export async function login(username: string, password: string): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Login failed");
  return data;
}

export const saveSession = (user: UserResponse) => localStorage.setItem("user", JSON.stringify(user));
export const getSession  = (): UserResponse | null => JSON.parse(localStorage.getItem("user") ?? "null");
export const clearSession = () => localStorage.removeItem("user");
export const isLoggedIn  = () => getSession() !== null;