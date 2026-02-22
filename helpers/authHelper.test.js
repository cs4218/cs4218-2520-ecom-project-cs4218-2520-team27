import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './authHelper';

jest.mock('bcrypt');

describe('authHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hashPassword', () => {
    test('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      bcrypt.hash.mockResolvedValueOnce(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    });

    test('should use saltRounds of 10', async () => {
      
      const password = 'anotherPassword';
      const hashedPassword = '$2b$10$anotherHashedExample';
      bcrypt.hash.mockResolvedValueOnce(hashedPassword);

      
      await hashPassword(password);

      
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    test('should handle bcrypt hash errors gracefully', async () => {
      
      const password = 'password';
      const error = new Error('Hash failed');
      bcrypt.hash.mockRejectedValueOnce(error);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      
      const result = await hashPassword(password);

      
      expect(result).toBeUndefined();
      expect(consoleLogSpy).toHaveBeenCalledWith(error);
      consoleLogSpy.mockRestore();
    });

    test('should handle various password inputs', async () => {
      
      const passwords = ['short', 'longPassword!@#$%', 'password with spaces', 'пароль'];
      const hashedPasswords = [
        '$2b$10$hash1',
        '$2b$10$hash2',
        '$2b$10$hash3',
        '$2b$10$hash4'
      ];
      
      // Assert
      for (let i = 0; i < passwords.length; i++) {
        bcrypt.hash.mockResolvedValueOnce(hashedPasswords[i]);
        const result = await hashPassword(passwords[i]);
        expect(result).toBe(hashedPasswords[i]);
      }
    });
  });

  describe('comparePassword', () => {
    test('should return true when password matches hashed password', async () => {
      
      const password = 'userPassword123';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      bcrypt.compare.mockResolvedValueOnce(true);

      
      const result = await comparePassword(password, hashedPassword);

      
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(bcrypt.compare).toHaveBeenCalledTimes(1);
    });

    test('should return false when password does not match hashed password', async () => {
      
      const password = 'wrongPassword';
      const hashedPassword = '$2b$10$hashedPasswordExample';
      bcrypt.compare.mockResolvedValueOnce(false);

      
      const result = await comparePassword(password, hashedPassword);

      
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    test('should handle bcrypt compare errors', async () => {
      
      const password = 'password';
      const hashedPassword = 'invalid-hash';
      const error = new Error('Compare failed');
      bcrypt.compare.mockRejectedValueOnce(error);

      // Assert
      await expect(comparePassword(password, hashedPassword)).rejects.toThrow(error);
    });

    test('should accept different hashed password formats', async () => {
      
      const password = 'testPassword';
      const hashFormats = [
        '$2a$10$example',
        '$2b$10$example',
        '$2x$10$example',
        '$2y$10$example'
      ];

      // Assert
      for (let i = 0; i < hashFormats.length; i++) {
        bcrypt.compare.mockResolvedValueOnce(true);
        const result = await comparePassword(password, hashFormats[i]);
        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashFormats[i]);
      }
    });

    test('should call bcrypt.compare with correct parameters in order', async () => {
      
      const password = 'myPassword';
      const hashedPassword = '$2b$10$hashedPass';
      bcrypt.compare.mockResolvedValueOnce(true);

      
      await comparePassword(password, hashedPassword);

      
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      const calls = bcrypt.compare.mock.calls;
      expect(calls[0][0]).toBe(password);
      expect(calls[0][1]).toBe(hashedPassword);
    });
  });
});
