// ./web/dist/js/auth.js

const API_URL = 'http://localhost:8080/api/auth';

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.loadSession();
  }

  loadSession() {
    const stored = localStorage.getItem('user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  isLoggedIn() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  requireLogin() {
    if (!this.isLoggedIn()) {
      window.location.href = '/web/pages/login.html';
    }
  }

  async register(username, email, password) {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (response.status === 201) {
        const user = await response.json();
        this.currentUser = user;
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      } else if (response.status === 409) {
        const error = await response.json();
        console.error(error.message);
        return false;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  }

  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 200) {
        const user = await response.json();
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

  logout() {
    this.currentUser = null;
    localStorage.removeItem('user');
    window.location.href = '/web/pages/login.html';
  }
}

const auth = new AuthSystem();
window.auth = auth;
