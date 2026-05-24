// auth.ts
// This will be compiled to ./web/dist/js/auth.js

const API_URL = 'http://localhost:8080/api/auth';

interface User {
  username: string;
  email: string;
}

class AuthSystem {
  private currentUser: User | null = null;

  constructor() {
    this.loadSession();
  }

  /**
   * Load user session from localStorage
   */
  private loadSession(): void {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user info
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Verify authentication and redirect if not logged in
   * Call this at the start of protected pages
   */
  requireLogin(): void {
    if (!this.isLoggedIn()) {
      window.location.href = '/web/pages/login.html';
    }
  }

  /**
   * Register new user
   */
  async register(username: string, email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
        }),
      });

      if (response.status === 201) {
        const user: User = await response.json();
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      } else if (response.status === 409) {
        const error = await response.json();
        console.error(error.message);
        return false;
      } else {
        console.error('Registration failed');
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  /**
   * Login user
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (response.status === 200) {
        const user: User = await response.json();
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      } else {
        const error = await response.json();
        console.error(error.message);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('user');
    window.location.href = '/web/pages/login.html';
  }
}


const auth = new AuthSystem();

(window as any).auth = auth;

export {};
