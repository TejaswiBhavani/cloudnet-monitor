import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { LoginRequest, User, AuthTokens } from '../types';
import * as authService from '../services/authService';
import { toast } from 'react-toastify';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  loading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        tokens: action.payload.tokens,
        loading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        tokens: null,
        loading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const storedTokens = authService.getStoredTokens();
      
      if (storedTokens) {
        try {
          dispatch({ type: 'AUTH_START' });
          
          // Verify token and get user profile
          const profile = await authService.getProfile();
          
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: profile as User,
              tokens: storedTokens,
            },
          });
        } catch (error) {
          // Token is invalid, clear it
          authService.clearTokens();
          dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await authService.login(credentials);
      
      if (response.success) {
        const tokens = {
          token: response.token,
        };
        
        const user = {
          id: 1, // Placeholder - should come from API
          username: response.user.username,
          email: `${response.user.username}@example.com`, // Placeholder
          role: response.user.role as 'admin' | 'operator' | 'viewer',
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Store tokens
        authService.storeTokens(tokens);
        
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, tokens },
        });
        
        toast.success('Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      authService.clearTokens();
      dispatch({ type: 'LOGOUT' });
      toast.info('Logged out successfully');
    }
  };

  const refreshToken = async () => {
    try {
      if (state.tokens?.token) {
        const newTokens = await authService.refreshToken(state.tokens.token);
        authService.storeTokens(newTokens);
        
        // Update state with new tokens but keep existing user data
        if (state.user) {
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: {
              user: state.user,
              tokens: newTokens,
            },
          });
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout if refresh fails
      await logout();
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refreshToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) => {
  return (props: P) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated || !user) {
      return <div>Redirecting to login...</div>;
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return <div>Access denied. Insufficient permissions.</div>;
    }

    return <Component {...props} />;
  };
};

// Hook for role-based access control
export const usePermissions = () => {
  const { user } = useAuth();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const canEdit = (): boolean => {
    return hasAnyRole(['admin', 'operator']);
  };

  const canDelete = (): boolean => {
    return hasRole('admin');
  };

  const canViewSensitive = (): boolean => {
    return hasAnyRole(['admin', 'operator']);
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    canEdit,
    canDelete,
    canViewSensitive,
  };
};