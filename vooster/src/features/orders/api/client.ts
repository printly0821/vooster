/**
 * Fetch-based API Client for Orders
 *
 * Provides a lightweight, type-safe HTTP client with:
 * - Automatic timeout (5 seconds default)
 * - AbortController integration
 * - Authentication headers
 * - Status code error handling
 * - Response validation
 *
 * @module features/orders/api/client
 */

/**
 * API client configuration
 */
export interface ApiClientConfig {
  /** Base URL for API requests */
  baseURL: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Authentication token */
  authToken?: string;

  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * HTTP error with status code and response data
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data: unknown,
    public url: string
  ) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
  }

  /**
   * Check if error is a specific HTTP status
   */
  is(status: number): boolean {
    return this.status === status;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500 && this.status < 600;
  }

  /**
   * Get user-friendly error message based on status code
   */
  getUserMessage(): string {
    if (this.is(404)) {
      return '주문을 찾을 수 없습니다. 바코드를 다시 스캔해주세요.';
    }

    if (this.is(401) || this.is(403)) {
      return '인증에 실패했습니다. 다시 로그인해주세요.';
    }

    if (this.is(422)) {
      return '잘못된 주문번호입니다. 바코드를 확인해주세요.';
    }

    if (this.isServerError()) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }

    return '요청 처리 중 오류가 발생했습니다.';
  }
}

/**
 * Network timeout error
 */
export class TimeoutError extends Error {
  constructor(public timeout: number, public url: string) {
    super(`Request timeout after ${timeout}ms: ${url}`);
    this.name = 'TimeoutError';
  }

  getUserMessage(): string {
    return '요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
  }
}

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: Required<Omit<ApiClientConfig, 'authToken'>> = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  timeout: 5000, // 5 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Create fetch-based API client with timeout and authentication
 *
 * @param config - API client configuration
 * @returns Configured fetch function
 *
 * @example
 * ```ts
 * const api = createApiClient({
 *   baseURL: 'https://api.example.com',
 *   authToken: 'Bearer token123',
 * });
 *
 * const data = await api('/orders/12345', { signal });
 * ```
 */
export function createApiClient(config: Partial<ApiClientConfig> = {}) {
  const fullConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    headers: {
      ...DEFAULT_CONFIG.headers,
      ...config.headers,
    },
  };

  /**
   * Make an authenticated HTTP request with automatic timeout
   *
   * @param endpoint - API endpoint (relative to baseURL)
   * @param options - Fetch options (method, body, signal, etc.)
   * @returns Response data as JSON
   *
   * @throws {TimeoutError} If request exceeds timeout
   * @throws {HttpError} If response status is not 2xx
   * @throws {Error} If network or parsing fails
   */
  return async function apiFetch<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${fullConfig.baseURL}${endpoint}`;
    const timeoutMs = fullConfig.timeout;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge abort signals if user provided one
    const signal = options.signal
      ? combineSignals([controller.signal, options.signal])
      : controller.signal;

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...options,
        signal,
        headers: {
          ...fullConfig.headers,
          ...(config.authToken && { Authorization: config.authToken }),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: unknown;
        try {
          // Read as text first, then try to parse as JSON
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch {
            // If not JSON, use the text as-is
            errorData = text;
          }
        } catch {
          errorData = 'Unknown error';
        }

        const error = new HttpError(
          response.status,
          response.statusText,
          errorData,
          url
        );

        console.error(`❌ HTTP Error ${error.status}:`, {
          url,
          status: error.status,
          data: errorData,
        });

        throw error;
      }

      // Parse successful response
      const data = await response.json();

      console.log(`✅ API Response: ${options.method || 'GET'} ${url}`, {
        status: response.status,
      });

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle AbortError (request cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        // Check if it's a timeout or manual cancellation
        if (signal?.aborted) {
          console.log('🚫 Request cancelled:', url);
          // Re-throw for React Query to handle gracefully
          throw error;
        }
        const timeoutError = new TimeoutError(timeoutMs, url);
        console.error(`⏱️ Timeout:`, { url, timeout: timeoutMs });
        throw timeoutError;
      }

      // Re-throw HttpError as-is
      if (error instanceof HttpError) {
        throw error;
      }

      // Wrap other errors
      console.error('❌ Network Error:', error);
      throw new Error(`Network request failed: ${url}`);
    }
  };
}

/**
 * Combine multiple AbortSignals into one
 *
 * @param signals - Array of AbortSignals to combine
 * @returns Combined AbortSignal that aborts when any input signal aborts
 */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return controller.signal;
}

/**
 * Default API client instance
 *
 * Uses environment variables for configuration:
 * - NEXT_PUBLIC_API_BASE_URL: Base URL for API
 * - NEXT_PUBLIC_API_AUTH_TOKEN: Authentication token (if needed)
 */
export const apiClient = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  authToken: process.env.NEXT_PUBLIC_API_AUTH_TOKEN,
});
