import {
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "./authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword } from "../helpers/authHelper.js";

// Lai Xue Le Shaun, A0252643H

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");

describe("Auth Controller - Order Related Functions", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      user: { _id: "user123" },
      body: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("getOrdersController", () => {
    it("should return orders for authenticated user", async () => {
      const mockOrders = [
        {
          _id: "order1",
          products: [{ _id: "product1", name: "Product 1" }],
          buyer: { name: "John Doe" },
          status: "Processing",
        },
        {
          _id: "order2",
          products: [{ _id: "product2", name: "Product 2" }],
          buyer: { name: "John Doe" },
          status: "Shipped",
        },
      ];

      const mockPopulate = jest.fn().mockReturnThis();
      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      await getOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
      expect(mockRes.json).toHaveBeenCalledWith(mockOrders);
    });

    it("should handle errors and return 500 status", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(mockError),
        }),
      });

      await getOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Geting Orders",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });

    it("should populate products without photo", async () => {
      const mockOrders = [];
      const mockPopulateProducts = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrders),
      });

      orderModel.find = jest.fn().mockReturnValue({
        populate: mockPopulateProducts,
      });

      await getOrdersController(mockReq, mockRes);

      expect(mockPopulateProducts).toHaveBeenCalledWith("products", "-photo");
    });

    it("should populate buyer with name only", async () => {
      const mockOrders = [];
      const mockPopulateBuyer = jest.fn().mockResolvedValue(mockOrders);

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: mockPopulateBuyer,
        }),
      });

      await getOrdersController(mockReq, mockRes);

      expect(mockPopulateBuyer).toHaveBeenCalledWith("buyer", "name");
    });
  });

  describe("getAllOrdersController", () => {
    it("should return all orders sorted by creation date", async () => {
      const mockOrders = [
        { _id: "order1", status: "Processing" },
        { _id: "order2", status: "Shipped" },
      ];

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(mockRes.json).toHaveBeenCalledWith(mockOrders);
    });

    it("should sort orders by createdAt in descending order", async () => {
      const mockOrders = [];
      const mockSort = jest.fn().mockResolvedValue(mockOrders);

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: mockSort,
          }),
        }),
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(mockSort).toHaveBeenCalledWith({ createdAt: "-1" });
    });

    it("should handle errors and return 500 status", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(mockError),
          }),
        }),
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Geting Orders",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });

    it("should populate products without photo", async () => {
      const mockOrders = [];
      const mockPopulateProducts = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockOrders),
        }),
      });

      orderModel.find = jest.fn().mockReturnValue({
        populate: mockPopulateProducts,
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(mockPopulateProducts).toHaveBeenCalledWith("products", "-photo");
    });

    it("should populate buyer name", async () => {
      const mockOrders = [];
      const mockPopulateBuyer = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockOrders),
      });

      orderModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: mockPopulateBuyer,
        }),
      });

      await getAllOrdersController(mockReq, mockRes);

      expect(mockPopulateBuyer).toHaveBeenCalledWith("buyer", "name");
    });
  });

  describe("orderStatusController", () => {
    it("should update order status successfully", async () => {
      const mockUpdatedOrder = {
        _id: "order123",
        status: "Shipped",
      };

      mockReq.params = { orderId: "order123" };
      mockReq.body = { status: "Shipped" };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedOrder);

      await orderStatusController(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "order123",
        { status: "Shipped" },
        { new: true }
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedOrder);
    });

    it("should update to Processing status", async () => {
      const mockUpdatedOrder = {
        _id: "order123",
        status: "Processing",
      };

      mockReq.params = { orderId: "order123" };
      mockReq.body = { status: "Processing" };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedOrder);

      await orderStatusController(mockReq, mockRes);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "order123",
        { status: "Processing" },
        { new: true }
      );
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedOrder);
    });

    it("should update to deliverd status", async () => {
      const mockUpdatedOrder = {
        _id: "order123",
        status: "deliverd",
      };

      mockReq.params = { orderId: "order123" };
      mockReq.body = { status: "deliverd" };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedOrder);

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedOrder);
    });

    it("should update to cancel status", async () => {
      const mockUpdatedOrder = {
        _id: "order123",
        status: "cancel",
      };

      mockReq.params = { orderId: "order123" };
      mockReq.body = { status: "cancel" };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedOrder);

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedOrder);
    });

    it("should handle errors and return 500 status", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      mockReq.params = { orderId: "order123" };
      mockReq.body = { status: "Shipped" };

      orderModel.findByIdAndUpdate = jest.fn().mockRejectedValue(mockError);

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error While Updateing Order",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });

    it("should return null if order not found", async () => {
      mockReq.params = { orderId: "nonexistent" };
      mockReq.body = { status: "Shipped" };

      orderModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

      await orderStatusController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith(null);
    });
  });

  describe("updateProfileController", () => {
    const mockUser = {
      _id: "user123",
      name: "John Doe",
      email: "john@example.com",
      phone: "1234567890",
      address: "123 Main St",
      password: "hashedOldPassword",
    };

    beforeEach(() => {
      userModel.findById = jest.fn().mockResolvedValue(mockUser);
    });

    it("should update profile successfully without password change", async () => {
      const updatedUser = {
        ...mockUser,
        name: "John Updated",
        phone: "9876543210",
      };

      mockReq.body = {
        name: "John Updated",
        email: "john@example.com",
        phone: "9876543210",
        address: "123 Main St",
      };

      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "John Updated",
          password: mockUser.password,
          phone: "9876543210",
          address: "123 Main St",
        },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated SUccessfully",
        updatedUser,
      });
    });

    it("should update profile with new password", async () => {
      const hashedNewPassword = "hashedNewPassword123";
      const updatedUser = {
        ...mockUser,
        password: hashedNewPassword,
      };

      mockReq.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "newpassword123",
        phone: "1234567890",
        address: "123 Main St",
      };

      hashPassword.mockResolvedValue(hashedNewPassword);
      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("newpassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "John Doe",
          password: hashedNewPassword,
          phone: "1234567890",
          address: "123 Main St",
        },
        { new: true }
      );
    });

    it("should reject password less than 6 characters", async () => {
      mockReq.body = {
        name: "John Doe",
        email: "john@example.com",
        password: "12345",
        phone: "1234567890",
        address: "123 Main St",
      };

      await updateProfileController(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Passsword is required and 6 character long",
      });
      expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it("should keep original values when fields are not provided", async () => {
      mockReq.body = {};

      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUser);

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: mockUser.name,
          password: mockUser.password,
          phone: mockUser.phone,
          address: mockUser.address,
        },
        { new: true }
      );
    });

    it("should handle errors and return 400 status", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      mockReq.body = {
        name: "John Updated",
      };

      userModel.findById = jest.fn().mockRejectedValue(mockError);

      await updateProfileController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error WHile Update profile",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });

    it("should update only name if only name is provided", async () => {
      const updatedUser = {
        ...mockUser,
        name: "New Name",
      };

      mockReq.body = {
        name: "New Name",
      };

      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "New Name",
          password: mockUser.password,
          phone: mockUser.phone,
          address: mockUser.address,
        },
        { new: true }
      );
    });

    it("should update only address if only address is provided", async () => {
      const updatedUser = {
        ...mockUser,
        address: "456 New St",
      };

      mockReq.body = {
        address: "456 New St",
      };

      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: mockUser.name,
          password: mockUser.password,
          phone: mockUser.phone,
          address: "456 New St",
        },
        { new: true }
      );
    });

    it("should update only phone if only phone is provided", async () => {
      const updatedUser = {
        ...mockUser,
        phone: "5555555555",
      };

      mockReq.body = {
        phone: "5555555555",
      };

      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: mockUser.name,
          password: mockUser.password,
          phone: "5555555555",
          address: mockUser.address,
        },
        { new: true }
      );
    });

    it("should accept password with exactly 6 characters", async () => {
      const hashedPassword = "hashedPassword123";
      const updatedUser = {
        ...mockUser,
        password: hashedPassword,
      };

      mockReq.body = {
        password: "123456",
      };

      hashPassword.mockResolvedValue(hashedPassword);
      userModel.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedUser);

      await updateProfileController(mockReq, mockRes);

      expect(hashPassword).toHaveBeenCalledWith("123456");
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
