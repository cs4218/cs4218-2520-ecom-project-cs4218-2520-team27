import {
  registerController,
  loginController,
  forgotPasswordController,
  testController,
} from "./authController.js";
import userModel from "../models/userModel.js";
import * as authHelper from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken", () => ({
  __esModule: true,
  default: { sign: jest.fn() },
}));

const createResponse = () => {
  return {
    send: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
};

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    userModel.findOne = jest.fn();
  });

  describe("registerController", () => {
    // Test using equivalence partitioning: one representative case for missing required fields
    it("returns error when name is missing", async () => {
      // Arrange
      const req = { 
        body: { email: "a@b.com", password: "pass", phone: "1", address: "a", answer: "x" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    it("returns error when email is missing", async () => {
      // Arrange
      const req = { 
        body: { name: "A", password: "pass", phone: "1", address: "a", answer: "x" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    it("returns error when password is missing", async () => {
      // Arrange
      const req = { 
        body: { name: "A", email: "a@b.com", phone: "1", address: "a", answer: "x" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ message: "Password is Required" });
    });

    it("returns error when phone is missing", async () => {
      // Arrange
      const req = { 
        body: { name: "A", email: "a@b.com", password: "pass", address: "a", answer: "x" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ message: "Phone no is Required" });
    });

    it("returns error when address is missing", async () => {
      // Arrange
      const req = { 
        body: { name: "A", email: "a@b.com", password: "pass", phone: "1", answer: "x" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    it("returns error when answer is missing", async () => {
      // Arrange
      const req = { 
        body: { name: "A", email: "a@b.com", password: "pass", phone: "1", address: "a" } 
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });

    it("returns 200 when user already exists", async () => {
      userModel.findOne.mockResolvedValue({ _id: "u1" });
      const req = {
        body: {
          name: "A",
          email: "a@b.com",
          password: "pass",
          phone: "1",
          address: "a",
          answer: "x",
        },
      };
      const response = createResponse();

      await registerController(req, response);

      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });
    });

    it("registers a new user", async () => {
      const savedUser = { _id: "u1", email: "a@b.com" };
      userModel.findOne.mockResolvedValue(null);
      authHelper.hashPassword.mockResolvedValue("hashed");
      userModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedUser),
      }));
      const req = {
        body: {
          name: "A",
          email: "a@b.com",
          password: "pass",
          phone: "1",
          address: "a",
          answer: "x",
        },
      };
      const response = createResponse();

      await registerController(req, response);

      expect(authHelper.hashPassword).toHaveBeenCalledWith("pass");
      expect(response.status).toHaveBeenCalledWith(201);
      expect(response.send).toHaveBeenCalledWith({
        success: true,
        message: "User Register Successfully",
        user: savedUser,
      });
    });

    it("handles errors", async () => {
      // Arrange
      const error = new Error("boom");
      userModel.findOne.mockRejectedValue(error);
      const req = {
        body: {
          name: "A",
          email: "a@b.com",
          password: "pass",
          phone: "1",
          address: "a",
          answer: "x",
        },
      };
      const response = createResponse();

      // Act
      await registerController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Errro in Registeration",
        error,
      });
    });
  });

  describe("loginController", () => {
    it("validates missing credentials", async () => {
      const req = { body: { email: "" } };
      const response = createResponse();

      await loginController(req, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("returns 404 when user not found", async () => {
      userModel.findOne.mockResolvedValue(null);
      const req = { body: { email: "a@b.com", password: "pass" } };
      const response = createResponse();

      await loginController(req, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("returns 404 when password does not match", async () => {
      userModel.findOne.mockResolvedValue({ _id: "u1", password: "hash" });
      authHelper.comparePassword.mockResolvedValue(false);
      const req = { body: { email: "a@b.com", password: "pass" } };
      const response = createResponse();

      await loginController(req, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("logs in successfully", async () => {
      const user = {
        _id: "u1",
        name: "A",
        email: "a@b.com",
        phone: "1",
        address: "a",
        role: 1,
        password: "hash",
      };
      userModel.findOne.mockResolvedValue(user);
      authHelper.comparePassword.mockResolvedValue(true);
      JWT.sign.mockResolvedValue("token-123");
      const req = { body: { email: "a@b.com", password: "pass" } };
      const response = createResponse();

      await loginController(req, response);

      expect(JWT.sign).toHaveBeenCalledWith({ _id: "u1" }, "test-secret", {
        expiresIn: "7d",
      });
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.send).toHaveBeenCalledWith({
        success: true,
        message: "login successfully",
        user: {
          _id: "u1",
          name: "A",
          email: "a@b.com",
          phone: "1",
          address: "a",
          role: 1,
        },
        token: "token-123",
      });
    });

    it("handles errors", async () => {
      // Arrange
      const error = new Error("boom");
      userModel.findOne.mockRejectedValue(error);
      const req = { body: { email: "a@b.com", password: "pass" } };
      const response = createResponse();

      // Act
      await loginController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in login",
        error,
      });
    });
  });

  describe("forgotPasswordController", () => {
    // Test using equivalence partitioning: representative cases for missing required fields
    it("validates missing email", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const req = { body: { answer: "x", newPassword: "newpass" } };
      const response = createResponse();

      // Act
      await forgotPasswordController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.send).toHaveBeenCalledWith({ message: "Emai is required" });
    });

    it("validates missing answer", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const req = { body: { email: "a@b.com", newPassword: "newpass" } };
      const response = createResponse();

      // Act
      await forgotPasswordController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.send).toHaveBeenCalledWith({ message: "answer is required" });
    });

    it("validates missing newPassword", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      const req = { body: { email: "a@b.com", answer: "x" } };
      const response = createResponse();

      // Act
      await forgotPasswordController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.send).toHaveBeenCalledWith({ message: "New Password is required" });
    });

    it("returns 404 when user not found", async () => {
      userModel.findOne.mockResolvedValue(null);
      const req = { body: { email: "a@b.com", answer: "x", newPassword: "newpass" } };
      const response = createResponse();

      await forgotPasswordController(req, response);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("resets password", async () => {
      userModel.findOne.mockResolvedValue({ _id: "u1" });
      authHelper.hashPassword.mockResolvedValue("hashed");
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: "u1" });
      const req = { body: { email: "a@b.com", answer: "x", newPassword: "newpass" } };
      const response = createResponse();

      await forgotPasswordController(req, response);

      expect(authHelper.hashPassword).toHaveBeenCalledWith("newpass");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("u1", {
        password: "hashed",
      });
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("handles errors", async () => {
      // Arrange
      const error = new Error("boom");
      userModel.findOne.mockRejectedValue(error);
      const req = { body: { email: "a@b.com", answer: "x", newPassword: "newpass" } };
      const response = createResponse();

      // Act
      await forgotPasswordController(req, response);

      // Assert
      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.send).toHaveBeenCalledWith({
        success: false,
        message: "Something went wrong",
        error,
      });
    });
  });

  describe("testController", () => {
    it("returns protected routes message", () => {
      const req = {};
      const response = createResponse();

      testController(req, response);

      expect(response.send).toHaveBeenCalledWith("Protected Routes");
    });

    it("handles errors", () => {
      const error = new Error("boom");
      const req = {};
      const response = { send: jest.fn() };
      response.send.mockImplementationOnce(() => {
        throw error;
      });

      testController(req, response);

      expect(response.send).toHaveBeenCalledWith({ error });
    });
  });
});
