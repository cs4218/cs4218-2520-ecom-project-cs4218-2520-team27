/**
 * Integration Tests for Authentication and Access Control Module
 * Tests the interaction between:
 * - authController (registerController, loginController)
 * - authHelper (hashPassword, comparePassword)
 * - authMiddleware (requireSignIn, isAdmin)
 * - userModel (user data persistence and retrieval)
 * - JWT token generation and verification
 * 
 * Story: INT: New and Returning Users Can Register, Sign In, and Access the Right Pages
 * Integrated Modules:
 * - Account route handling module
 * - Account controller module (registration and sign-in logic)
 * - Password security module (hashing/comparison)
 * - Access control module (sign-in and admin checks)
 * - User data module (user lookup/storage)
 */

import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "./authController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import { hashPassword, comparePassword } from "../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import JWT from "jsonwebtoken";

// Mock the userModel and orderModel
jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");

describe("INT: New and Returning Users Can Register, Sign In, and Access the Right Pages", () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_secret_key";
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 1: REGISTRATION + PASSWORD HASHING + USER PERSISTENCE
  // ============================================================================
  
  describe("Registration Flow: Controller → Helper → Model", () => {
    
    it("should hash password and persist user on valid registration", async () => {
      // Arrange
      const mockUser = {
        _id: "user123",
        name: "John Doe",
        email: "john@test.com",
        phone: "1234567890",
        address: "123 Main St",
        password: expect.any(String), // Will be hashed
        answer: "secret answer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(null); // No existing user
      userModel.prototype.save = jest.fn().mockResolvedValue(mockUser);

      const req = {
        body: {
          name: "John Doe",
          email: "john@test.com",
          password: "plainPassword123",
          phone: "1234567890",
          address: "123 Main St",
          answer: "secret answer",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await registerController(req, res);

      // Assert
      // Verify userModel.findOne was called to check for duplicates
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      
      // Verify response indicates success
      expect(res.status).toHaveBeenCalledWith(201);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
      expect(sendCall.message).toContain("Successfully");
    });

    it("should reject registration with duplicate email", async () => {
      // Arrange
      const existingUser = {
        _id: "existing123",
        email: "duplicate@test.com",
      };

      userModel.findOne.mockResolvedValue(existingUser);

      const req = {
        body: {
          name: "New User",
          email: "duplicate@test.com",
          password: "password123",
          phone: "1234567890",
          address: "123 Main St",
          answer: "answer",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await registerController(req, res);

      // Assert
      // Verify duplicate check was performed
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "duplicate@test.com" });
      
      // Verify response indicates duplicate
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toContain("Already Register");
    });

    it("should fail registration when required fields are missing", async () => {
      // Arrange - missing password
      const req = {
        body: {
          name: "John Doe",
          email: "john@test.com",
          // password is missing
          phone: "1234567890",
          address: "123 Main St",
          answer: "answer",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await registerController(req, res);

      // Assert
      // Verify no database call was made (validation failed first)
      expect(userModel.findOne).not.toHaveBeenCalled();
      
      // Verify response indicates validation error
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.error || sendCall.message).toBeDefined();
    });

    it("should fail registration when name is missing", async () => {
      const req = { body: { email: "john@test.com", password: "pass123", phone: "123", address: "addr", answer: "ans" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await registerController(req, res);
      expect(userModel.findOne).not.toHaveBeenCalled();
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.error).toBe("Name is Required");
    });

    it("should fail registration when email is missing", async () => {
      const req = { body: { name: "John", password: "pass123", phone: "123", address: "addr", answer: "ans" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await registerController(req, res);
      expect(userModel.findOne).not.toHaveBeenCalled();
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toBe("Email is Required");
    });

    it("should fail registration when phone is missing", async () => {
      const req = { body: { name: "John", email: "john@test.com", password: "pass123", address: "addr", answer: "ans" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await registerController(req, res);
      expect(userModel.findOne).not.toHaveBeenCalled();
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toBe("Phone no is Required");
    });

    it("should fail registration when address is missing", async () => {
      const req = { body: { name: "John", email: "john@test.com", password: "pass123", phone: "123", answer: "ans" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await registerController(req, res);
      expect(userModel.findOne).not.toHaveBeenCalled();
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toBe("Address is Required");
    });

    it("should fail registration when answer is missing", async () => {
      const req = { body: { name: "John", email: "john@test.com", password: "pass123", phone: "123", address: "addr" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await registerController(req, res);
      expect(userModel.findOne).not.toHaveBeenCalled();
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toBe("Answer is Required");
    });

    it("should handle unexpected database errors during registration", async () => {
      // Arrange - make findOne throw to trigger catch block
      userModel.findOne.mockRejectedValueOnce(new Error("DB connection error"));
      const req = {
        body: { name: "John", email: "john@test.com", password: "pass123", phone: "123", address: "addr", answer: "ans" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      // Act
      await registerController(req, res);

      // Assert - catch block returns 500
      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toContain("Registeration");
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 2: LOGIN + PASSWORD COMPARISON + TOKEN GENERATION
  // ============================================================================

  describe("Login Flow: Controller → Model → Helper → JWT", () => {
    
    it("should authenticate user and return token on valid credentials", async () => {
      // Arrange
      const plainPassword = "password123";
      const hashedPassword = await hashPassword(plainPassword);

      const mockUser = {
        _id: "user123",
        name: "John Doe",
        email: "john@test.com",
        phone: "1234567890",
        address: "123 Main St",
        password: hashedPassword,
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const req = {
        body: {
          email: "john@test.com",
          password: plainPassword,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify user lookup by email
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      
      // Verify response indicates success and contains token
      expect(res.status).toHaveBeenCalledWith(200);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
      expect(sendCall.token).toBeDefined();
      
      // Verify JWT token was created and contains user ID
      const decoded = JWT.verify(sendCall.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe("user123");
    });

    it("should reject login with invalid password", async () => {
      // Arrange
      const correctPassword = "correctPassword123";
      const wrongPassword = "wrongPassword456";
      const hashedPassword = await hashPassword(correctPassword);

      const mockUser = {
        _id: "user123",
        name: "John Doe",
        email: "john@test.com",
        password: hashedPassword,
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const req = {
        body: {
          email: "john@test.com",
          password: wrongPassword,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify user lookup was done
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com" });
      
      // Verify response indicates authentication failure
      expect(res.status).toHaveBeenCalledWith(404);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toContain("Invalid");
    });

    it("should reject login when user does not exist", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      const req = {
        body: {
          email: "nonexistent@test.com",
          password: "password123",
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify user lookup was attempted
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "nonexistent@test.com" });
      
      // Verify response indicates user not found
      expect(res.status).toHaveBeenCalledWith(404);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });

    it("should reject login with missing email or password", async () => {
      // Arrange - missing password
      const req = {
        body: {
          email: "john@test.com",
          // password is missing
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify no database call was made (validation failed first)
      expect(userModel.findOne).not.toHaveBeenCalled();
      
      // Verify response indicates validation error
      expect(res.status).toHaveBeenCalledWith(404);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toContain("Invalid");
    });

    it("should handle unexpected database errors during login", async () => {
      // Arrange - make findOne throw to trigger catch block
      userModel.findOne.mockRejectedValueOnce(new Error("DB connection error"));
      const req = { body: { email: "john@test.com", password: "pass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      // Act
      await loginController(req, res);

      // Assert - catch block returns 500
      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toBe("Error in login");
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 3: TOKEN VERIFICATION + ACCESS CONTROL MIDDLEWARE
  // ============================================================================

  describe("Access Control Flow: JWT Token → Middleware → Authorization", () => {
    
    it("should allow signed-in user to access protected route", async () => {
      // Arrange
      const validToken = JWT.sign(
        { _id: "user123" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      const req = {
        headers: {
          authorization: validToken,
        },
        user: undefined,
      };

      const res = {};
      const next = jest.fn();

      // Act
      await requireSignIn(req, res, next);

      // Assert
      // Verify token was decoded and user attached to request
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe("user123");
      
      // Verify next middleware was called
      expect(next).toHaveBeenCalled();
    });

    it("should block access with invalid or missing token", async () => {
      // Arrange
      const req = {
        headers: {
          authorization: "invalidToken123",
        },
        user: undefined,
      };

      const res = {};
      const next = jest.fn();

      // Act
      await requireSignIn(req, res, next);

      // Assert
      // Verify next was not called (access denied)
      expect(next).not.toHaveBeenCalled();
    });

    it("should grant admin route access to admin user", async () => {
      // Arrange
      const adminUser = {
        _id: "admin123",
        name: "Admin User",
        role: 1, // admin role
      };

      userModel.findById.mockResolvedValue(adminUser);

      const req = {
        user: { _id: "admin123" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const next = jest.fn();

      // Act
      await isAdmin(req, res, next);

      // Assert
      // Verify admin user lookup
      expect(userModel.findById).toHaveBeenCalledWith("admin123");
      
      // Verify next middleware was called (access granted)
      expect(next).toHaveBeenCalled();
      
      // Verify response was not sent (no error)
      expect(res.send).not.toHaveBeenCalled();
    });

    it("should deny admin route access to non-admin user", async () => {
      // Arrange
      const normalUser = {
        _id: "user456",
        name: "Normal User",
        role: 0, // non-admin role
      };

      userModel.findById.mockResolvedValue(normalUser);

      const req = {
        user: { _id: "user456" },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const next = jest.fn();

      // Act
      await isAdmin(req, res, next);

      // Assert
      // Verify user lookup
      expect(userModel.findById).toHaveBeenCalledWith("user456");
      
      // Verify next was not called (access denied)
      expect(next).not.toHaveBeenCalled();
      
      // Verify error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toContain("UnAuthorized");
    });

    it("should handle database errors gracefully in admin check", async () => {
      // Arrange - make findById throw to trigger catch block (lines 31-32 of authMiddleware)
      userModel.findById.mockRejectedValueOnce(new Error("DB connection error"));
      const req = { user: { _id: "user789" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();

      // Act
      await isAdmin(req, res, next);

      // Assert - catch block returns 401 with error message
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toBe("Error in admin middleware");
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 4: END-TO-END REGISTRATION → LOGIN → ACCESS FLOW
  // ============================================================================

  describe("Full User Journey: Registration → Login → Protected Access", () => {
    
    it("should complete full flow from registration through access control", async () => {
      // PHASE 1: REGISTRATION
      // ─────────────────────
      const plainPassword = "InitialPassword123";
      
      userModel.findOne.mockResolvedValueOnce(null); // No duplicate

      const mockRegisteredUser = {
        _id: "newuser123",
        name: "Jane Doe",
        email: "jane@test.com",
        phone: "9876543210",
        address: "456 Oak Ave",
        password: await hashPassword(plainPassword),
        answer: "favorite color",
        role: 0,
      };

      userModel.prototype.save = jest.fn().mockResolvedValue(mockRegisteredUser);

      const registerReq = {
        body: {
          name: "Jane Doe",
          email: "jane@test.com",
          password: plainPassword,
          phone: "9876543210",
          address: "456 Oak Ave",
          answer: "favorite color",
        },
      };

      const registerRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await registerController(registerReq, registerRes);

      // Verify registration success
      expect(registerRes.status).toHaveBeenCalledWith(201);
      const registerCall = registerRes.send.mock.calls[0][0];
      expect(registerCall.success).toBe(true);

      // PHASE 2: LOGIN with registered user
      // ────────────────────────────────────
      userModel.findOne.mockResolvedValueOnce(mockRegisteredUser);

      const loginReq = {
        body: {
          email: "jane@test.com",
          password: plainPassword,
        },
      };

      const loginRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      await loginController(loginReq, loginRes);

      // Verify login success and token generation
      expect(loginRes.status).toHaveBeenCalledWith(200);
      const loginCall = loginRes.send.mock.calls[0][0];
      expect(loginCall.success).toBe(true);
      expect(loginCall.token).toBeDefined();

      // PHASE 3: USE TOKEN TO ACCESS PROTECTED ROUTE
      // ──────────────────────────────────────────
      const protectedReq = {
        headers: {
          authorization: loginCall.token,
        },
        user: undefined,
      };

      const protectedRes = {};
      const protectedNext = jest.fn();

      await requireSignIn(protectedReq, protectedRes, protectedNext);

      // Verify protected access granted
      expect(protectedReq.user).toBeDefined();
      expect(protectedReq.user._id).toBe("newuser123");
      expect(protectedNext).toHaveBeenCalled();

      // PHASE 4: VERIFY USER ROLE PERMISSIONS
      // ─────────────────────────────────────
      userModel.findById.mockResolvedValueOnce(mockRegisteredUser);

      const adminCheckReq = {
        user: { _id: "newuser123" },
      };

      const adminCheckRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const adminCheckNext = jest.fn();

      await isAdmin(adminCheckReq, adminCheckRes, adminCheckNext);

      // Verify non-admin user is blocked from admin route
      expect(adminCheckRes.status).toHaveBeenCalledWith(401);
      expect(adminCheckNext).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 5: PASSWORD HASHING AND COMPARISON INTEGRATION
  // ============================================================================

  describe("Password Security Integration: Hashing and Comparison", () => {
    
    it("should securely hash passwords and correctly compare during login", async () => {
      // Arrange
      const plainPassword = "MySecurePassword123";
      
      // Hash the password using the helper
      const hashedPassword = await hashPassword(plainPassword);
      
      // Verify hash is different from plain text
      expect(hashedPassword).not.toBe(plainPassword);

      // Create mock user with hashed password
      const mockUser = {
        _id: "user123",
        email: "test@test.com",
        password: hashedPassword,
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const req = {
        body: {
          email: "test@test.com",
          password: plainPassword,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify login was successful despite using plain password
      expect(res.status).toHaveBeenCalledWith(200);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
      expect(sendCall.token).toBeDefined();
    });

    it("should detect and reject incorrect passwords", async () => {
      // Arrange
      const correctPassword = "CorrectPassword123";
      const wrongPassword = "WrongPassword456";
      
      const hashedPassword = await hashPassword(correctPassword);

      const mockUser = {
        _id: "user123",
        email: "test@test.com",
        password: hashedPassword,
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);

      const req = {
        body: {
          email: "test@test.com",
          password: wrongPassword,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await loginController(req, res);

      // Assert
      // Verify login was rejected
      expect(res.status).toHaveBeenCalledWith(404);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.token).toBeUndefined();
    });

    it("should handle invalid input gracefully in hashPassword", async () => {
      // Passing null triggers bcrypt error catch block (line 10 of authHelper.js)
      const result = await hashPassword(null);
      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 6: FORGOT PASSWORD FLOW
  // ============================================================================

  describe("Forgot Password Flow: Controller → Model → Helper", () => {

    it("should reset password successfully with valid email and answer", async () => {
      const mockUser = { _id: "user123", email: "john@test.com", answer: "blue" };
      userModel.findOne.mockResolvedValueOnce(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValueOnce(mockUser);

      const req = { body: { email: "john@test.com", answer: "blue", newPassword: "newPass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: "john@test.com", answer: "blue" });
      expect(res.status).toHaveBeenCalledWith(200);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
      expect(sendCall.message).toContain("Reset Successfully");
    });

    it("should fail if email is missing", async () => {
      const req = { body: { answer: "blue", newPassword: "newPass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toContain("Emai is required");
    });

    it("should fail if answer is missing", async () => {
      const req = { body: { email: "john@test.com", newPassword: "newPass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toContain("answer is required");
    });

    it("should fail if newPassword is missing", async () => {
      const req = { body: { email: "john@test.com", answer: "blue" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.message).toContain("New Password is required");
    });

    it("should fail if email and answer do not match any user", async () => {
      userModel.findOne.mockResolvedValueOnce(null);
      const req = { body: { email: "wrong@test.com", answer: "wrong", newPassword: "newPass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
      expect(sendCall.message).toContain("Wrong Email Or Answer");
    });

    it("should handle database errors during password reset", async () => {
      userModel.findOne.mockRejectedValueOnce(new Error("DB error"));
      const req = { body: { email: "john@test.com", answer: "blue", newPassword: "newPass123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      await forgotPasswordController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 7: TEST CONTROLLER (ADMIN PROTECTED ROUTE)
  // ============================================================================

  describe("Test Controller: Protected Admin Route Response", () => {

    it("should return protected route message", () => {
      const req = {};
      const res = { send: jest.fn() };
      testController(req, res);
      expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });

    it("should handle errors in testController", () => {
      const req = {};
      const error = new Error("send failed");
      const res = { send: jest.fn().mockImplementationOnce(() => { throw error; }) };
      testController(req, res);
      expect(res.send).toHaveBeenCalledWith({ error });
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 8: UPDATE PROFILE FLOW
  // ============================================================================

  describe("Update Profile Flow: Controller → Model → Helper", () => {

    it("should update profile successfully with valid data", async () => {
      const mockUser = { _id: "user123", name: "Old Name", password: "oldHash", phone: "111", address: "Old Addr" };
      const updatedUser = { ...mockUser, name: "New Name", phone: "999" };
      userModel.findById.mockResolvedValueOnce(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      const req = { user: { _id: "user123" }, body: { name: "New Name", phone: "999" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(res.status).toHaveBeenCalledWith(200);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
    });

    it("should update profile successfully when a new valid password is provided", async () => {
      const mockUser = { _id: "user123", name: "Old Name", password: "oldHash", phone: "111", address: "Old Addr" };
      const updatedUser = { ...mockUser, password: "newHashedPw" };
      userModel.findById.mockResolvedValueOnce(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValueOnce(updatedUser);

      const req = { user: { _id: "user123" }, body: { password: "newPassword123" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(true);
    });

    it("should reject profile update if new password is too short", async () => {
      const mockUser = { _id: "user123", name: "John", password: "oldHash", phone: "111", address: "addr" };
      userModel.findById.mockResolvedValueOnce(mockUser);

      const req = { user: { _id: "user123" }, body: { password: "abc" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };

      await updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining("6 character") })
      );
    });

    it("should handle database errors during profile update", async () => {
      userModel.findById.mockRejectedValueOnce(new Error("DB error"));
      const req = { user: { _id: "user123" }, body: { name: "John" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn(), json: jest.fn() };

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION TEST SUITE 9: ORDER CONTROLLERS FLOW
  // ============================================================================

  describe("Orders Flow: Controller → Order Model", () => {

    it("should return orders for a signed-in user", async () => {
      const mockOrders = [{ _id: "order1", buyer: "user123", status: "Processing" }];
      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      const req = { user: { _id: "user123" } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await getOrdersController(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    it("should handle errors in getOrdersController", async () => {
      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error("DB error")),
        }),
      });
      const req = { user: { _id: "user123" } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });

    it("should return all orders for admin", async () => {
      const mockOrders = [
        { _id: "order1", buyer: "user1", status: "Shipped" },
        { _id: "order2", buyer: "user2", status: "Processing" },
      ];
      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      const req = {};
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await getAllOrdersController(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    it("should handle errors in getAllOrdersController", async () => {
      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error("DB error")),
          }),
        }),
      });
      const req = {};
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });

    it("should update order status successfully", async () => {
      const updatedOrder = { _id: "order1", status: "Delivered" };
      orderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);

      const req = { params: { orderId: "order1" }, body: { status: "Delivered" } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await orderStatusController(req, res);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith("order1", { status: "Delivered" }, { new: true });
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    it("should handle errors in orderStatusController", async () => {
      orderModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("DB error"));
      const req = { params: { orderId: "order1" }, body: { status: "Delivered" } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

      await orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const sendCall = res.send.mock.calls[0][0];
      expect(sendCall.success).toBe(false);
    });
  });
});
