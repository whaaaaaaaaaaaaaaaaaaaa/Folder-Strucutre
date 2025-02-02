import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

interface AuthState {
  token: string | null;
  isLoggedIn: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: useLocalStorage('auth_token', null),
    isLoggedIn: useLocalStorage('auth_logged_in', false)
  }),

  actions: {
    async login(password: string) {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        });

        if (!response.ok) {
          throw new Error('Login failed');
        }

        const data = await response.json();
        this.token = data.token;
        this.isLoggedIn = true;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    logout() {
      this.token = null;
      this.isLoggedIn = false;
    }
  }
});
