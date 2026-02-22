import React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import axios from 'axios';
import { AuthProvider, useAuth } from './auth';

jest.mock('axios');

describe('Auth Context', () => {
  test('should initialize with default values', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current[0].user).toBeNull();
    expect(result.current[0].token).toBe('');
  });
    
  test('should update auth state correctly', async () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const testToken = 'test-token-12345';

    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => {
      result.current[1]({
        user: testUser,
        token: testToken,
      });
    });

    await waitFor(() => {
      expect(result.current[0].user).toEqual(testUser);
      expect(result.current[0].token).toBe(testToken);
    });
  });

  test('should set axios default authorization header', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const testToken = 'test-token-12345';

    const { result } = renderHook(() => useAuth(), { wrapper });
    result.current[1]({
      user: null,
      token: testToken,
    });
  });

  test('should load auth data from localStorage on mount', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const testToken = 'test-token-12345';

    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ user: testUser, token: testToken })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current[0].user).toEqual(testUser);
    expect(result.current[0].token).toBe(testToken);

    jest.restoreAllMocks();
  });

  test('should handle invalid JSON in localStorage gracefully', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid-json');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current[0].user).toBeNull();
    expect(result.current[0].token).toBe('');

    jest.restoreAllMocks();
  });

  test('should handle localStorage with missing user or token fields', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ user: { id: 1 }, token: '' })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current[0].user).toEqual({ id: 1 });
    expect(result.current[0].token).toBe('');

    jest.restoreAllMocks();
  });

  test('should not update auth if localStorage is empty', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );  
    
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current[0].user).toBeNull();
    expect(result.current[0].token).toBe('');
    
    jest.restoreAllMocks();
  });

  test('should update axios default authorization header when auth token changes', async () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const testToken = 'test-token-updated';

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    act(() => {
      result.current[1]({
        user: { id: 1, name: 'Test User' },
        token: testToken,
      });
    });

    await waitFor(() => {
      expect(axios.defaults.headers.common['Authorization']).toBe(testToken);
    });
  });

  test('useAuth hook should return auth context', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toBeDefined();
    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(2);
  });

  test('useAuth hook should throw error when used outside AuthProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    consoleErrorSpy.mockRestore();
  });

  test('useEffect should not re-run on every render (dependency array check)', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const testUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const testToken = 'test-token-12345';

    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
      JSON.stringify({ user: testUser, token: testToken })
    );

    const { result, rerender } = renderHook(() => useAuth(), { wrapper });

    expect(getItemSpy).toHaveBeenCalledWith('auth');
    const callCountAfterMount = getItemSpy.mock.calls.length;

    rerender();

    expect(getItemSpy.mock.calls.length).toBe(callCountAfterMount);

    getItemSpy.mockRestore();
  });

  test('should handle localStorage with null or undefined values', () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    
    jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current[0].user).toBeNull();
    expect(result.current[0].token).toBe('');

    jest.restoreAllMocks();
  });

  test('setAuth should properly update the auth state', async () => {
    const wrapper = ({ children }) => (
      <AuthProvider>{children}</AuthProvider>
    );
    const newAuth = {
      user: { id: 2, name: 'New User', email: 'newuser@example.com' },
      token: 'new-test-token'
    };

    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current[1](newAuth);
    });

    await waitFor(() => {
      expect(result.current[0]).toEqual(newAuth);
    });
  });

  test('should render children components correctly', () => {
    const TestComponent = ({ children }) => <div>{children}</div>;
    
    const { container } = render(
      <AuthProvider>
        <TestComponent>Test Child Content</TestComponent>
      </AuthProvider>
    );

    expect(container.textContent).toContain('Test Child Content');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});