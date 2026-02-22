import JWT from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import { requireSignIn, isAdmin } from './authMiddleware.js';

jest.mock('jsonwebtoken');
jest.mock('../models/userModel.js');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {
        authorization: 'valid-token'
      },
      user: {
        _id: '507f1f77bcf86cd799439011'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requireSignIn', () => {
    test('should decode token and call next on valid token', async () => {
      
      const decodedToken = { _id: '507f1f77bcf86cd799439011', role: 0 };
      JWT.verify.mockReturnValueOnce(decodedToken);

      
      await requireSignIn(req, res, next);

      
      expect(JWT.verify).toHaveBeenCalledWith(
        req.headers.authorization,
        process.env.JWT_SECRET
      );
      expect(req.user).toEqual(decodedToken);
      expect(next).toHaveBeenCalled();
    });

    test('should handle missing authorization header', async () => {
      
      req.headers.authorization = undefined;
      JWT.verify.mockImplementationOnce(() => {
        throw new Error('No token provided');
      });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      
      await requireSignIn(req, res, next);

      
      expect(JWT.verify).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test('should handle invalid token', async () => {
      
      const error = new Error('Invalid token');
      JWT.verify.mockImplementationOnce(() => {
        throw error;
      });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      
      await requireSignIn(req, res, next);

      
      expect(consoleLogSpy).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test('should handle expired token', async () => {
      
      const error = new JWT.TokenExpiredError('Token expired', 1234567890);
      JWT.verify.mockImplementationOnce(() => {
        throw error;
      });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      
      await requireSignIn(req, res, next);

      
      expect(consoleLogSpy).toHaveBeenCalledWith(error);
      expect(next).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test('should set req.user with decoded token data', async () => {
      
      const decodedToken = {
        _id: '507f1f77bcf86cd799439012',
        email: 'user@example.com',
        role: 0
      };
      JWT.verify.mockReturnValueOnce(decodedToken);

      
      await requireSignIn(req, res, next);

      
      expect(req.user).toEqual(decodedToken);
      expect(req.user._id).toBe('507f1f77bcf86cd799439012');
      expect(req.user.email).toBe('user@example.com');
    });
  });

  describe('isAdmin', () => {
    test('should call next when user is admin (role === 1)', async () => {
      
      const adminUser = { _id: '507f1f77bcf86cd799439011', role: 1 };
      userModel.findById.mockResolvedValueOnce(adminUser);

      
      await isAdmin(req, res, next);

      
      expect(userModel.findById).toHaveBeenCalledWith(req.user._id);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 when user is not admin', async () => {
      
      const regularUser = { _id: '507f1f77bcf86cd799439011', role: 0 };
      userModel.findById.mockResolvedValueOnce(regularUser);

      
      await isAdmin(req, res, next);

      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'UnAuthorized Access'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 and error message on database error', async () => {
      
      const dbError = new Error('Database connection failed');
      userModel.findById.mockRejectedValueOnce(dbError);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      
      await isAdmin(req, res, next);

      
      expect(consoleLogSpy).toHaveBeenCalledWith(dbError);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: dbError,
        message: 'Error in admin middleware'
      });
      expect(next).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test('should handle user not found', async () => {
      
      userModel.findById.mockResolvedValueOnce(null);

      
      await isAdmin(req, res, next);

      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should query database with correct user id', async () => {
      
      const userId = '507f1f77bcf86cd799439011';
      req.user._id = userId;
      const adminUser = { _id: userId, role: 1 };
      userModel.findById.mockResolvedValueOnce(adminUser);

      
      await isAdmin(req, res, next);

      
      expect(userModel.findById).toHaveBeenCalledWith(userId);
      expect(userModel.findById).toHaveBeenCalledTimes(1);
    });

    test('should allow only users with role exactly equal to 1', async () => {
      const rolesToTest = [
        { role: 0, shouldPass: false },
        { role: 1, shouldPass: true },
        { role: 2, shouldPass: false },
        { role: '1', shouldPass: false },
        { role: null, shouldPass: false }
      ];

      for (const testCase of rolesToTest) {
        jest.clearAllMocks();
        userModel.findById.mockResolvedValueOnce({
          _id: req.user._id,
          role: testCase.role
        });

        await isAdmin(req, res, next);

        if (testCase.shouldPass) {
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(next).not.toHaveBeenCalled();
        }
      }
    });
  });
});
