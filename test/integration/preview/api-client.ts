/**
 * API Client for Preview Integration Tests
 *
 * Provides HTTP methods with automatic auth token management.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { previewConfig } from './config';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface ApiError {
  status: number;
  message: string;
  error?: string;
}

class PreviewApiClient {
  private client: AxiosInstance;
  private tokens: AuthTokens | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: previewConfig.baseUrl,
      timeout: previewConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for logging
    if (previewConfig.debug) {
      this.client.interceptors.request.use((req) => {
        console.log(`[API] ${req.method?.toUpperCase()} ${req.url}`);
        return req;
      });

      this.client.interceptors.response.use(
        (res) => {
          console.log(`[API] Response: ${res.status}`);
          return res;
        },
        (err) => {
          console.log(`[API] Error: ${err.response?.status || err.message}`);
          return Promise.reject(err);
        },
      );
    }
  }

  /**
   * Set authentication tokens (usually after login)
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.tokens = null;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.tokens?.accessToken || null;
  }

  /**
   * Check if tokens are set
   */
  hasTokens(): boolean {
    return this.tokens !== null;
  }

  /**
   * Get authorization headers
   */
  private getAuthHeaders(): Record<string, string> {
    if (this.tokens?.accessToken) {
      return { Authorization: `Bearer ${this.tokens.accessToken}` };
    }
    return {};
  }

  /**
   * Make a GET request
   */
  async get<T = unknown>(
    path: string,
    options: { auth?: boolean } = { auth: false },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = options.auth ? this.getAuthHeaders() : {};
      const response: AxiosResponse<T> = await this.client.get(
        `${previewConfig.apiPrefix}${path}`,
        { headers },
      );
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make a POST request
   */
  async post<T = unknown>(
    path: string,
    data?: unknown,
    options: { auth?: boolean } = { auth: false },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = options.auth ? this.getAuthHeaders() : {};
      const response: AxiosResponse<T> = await this.client.post(
        `${previewConfig.apiPrefix}${path}`,
        data,
        { headers },
      );
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make a PUT request
   */
  async put<T = unknown>(
    path: string,
    data?: unknown,
    options: { auth?: boolean } = { auth: false },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = options.auth ? this.getAuthHeaders() : {};
      const response: AxiosResponse<T> = await this.client.put(
        `${previewConfig.apiPrefix}${path}`,
        data,
        { headers },
      );
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make a DELETE request
   */
  async delete<T = unknown>(
    path: string,
    options: { auth?: boolean } = { auth: false },
  ): Promise<ApiResponse<T>> {
    try {
      const headers = options.auth ? this.getAuthHeaders() : {};
      const response: AxiosResponse<T> = await this.client.delete(
        `${previewConfig.apiPrefix}${path}`,
        { headers },
      );
      return {
        status: response.status,
        data: response.data,
        headers: response.headers as Record<string, string>,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle axios errors
   */
  private handleError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      return {
        status: axiosError.response?.status || 500,
        message: axiosError.response?.data?.message || axiosError.message,
        error: axiosError.response?.data?.error,
      };
    }
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export singleton instance
export const previewApiClient = new PreviewApiClient();

// Export for creating new instances if needed
export { PreviewApiClient };
