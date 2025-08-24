import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LoginRequest, LoginResponse, AuthTokens } from '../types';

class AuthService {
  private api: AxiosInstance;
  private readonly TOKEN_KEY = 'cloudnet_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'cloudnet_refresh_token';

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const currentToken = this.getToken();
            if (currentToken) {
              const newTokens = await this.refreshToken(currentToken);
              this.storeTokens(newTokens);
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newTokens.token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.api.post<LoginResponse>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw new Error('Network error occurred');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout request failed:', error);
    }
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    try {
      const response = await this.api.post<{ success: boolean; token: string }>('/auth/refresh', {
        refreshToken: token,
      });
      
      if (response.data.success) {
        return {
          token: response.data.token,
        };
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Token refresh failed');
      }
      throw new Error('Network error occurred during token refresh');
    }
  }

  async getProfile(): Promise<any> {
    try {
      const response = await this.api.get('/auth/profile');
      return response.data.user;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Failed to get profile');
      }
      throw new Error('Network error occurred');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const response = await this.api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Password change failed');
      }
      throw new Error('Network error occurred');
    }
  }

  // Token management
  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.token);
    if (tokens.refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getStoredTokens(): AuthTokens | null {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    
    if (token) {
      return {
        token,
        refreshToken: refreshToken || undefined,
      };
    }
    
    return null;
  }

  clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  // API instance getter for use in other services
  getApiInstance(): AxiosInstance {
    return this.api;
  }
}

// Create and export singleton instance
const authService = new AuthService();

export const login = authService.login.bind(authService);
export const logout = authService.logout.bind(authService);
export const refreshToken = authService.refreshToken.bind(authService);
export const getProfile = authService.getProfile.bind(authService);
export const changePassword = authService.changePassword.bind(authService);
export const storeTokens = authService.storeTokens.bind(authService);
export const getToken = authService.getToken.bind(authService);
export const getRefreshToken = authService.getRefreshToken.bind(authService);
export const getStoredTokens = authService.getStoredTokens.bind(authService);
export const clearTokens = authService.clearTokens.bind(authService);
export const isTokenExpired = authService.isTokenExpired.bind(authService);
export const isAuthenticated = authService.isAuthenticated.bind(authService);
export const getApiInstance = authService.getApiInstance.bind(authService);

export default authService;