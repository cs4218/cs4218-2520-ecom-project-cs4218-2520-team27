import {
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "./authController.js";
import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";

// Lai Xue Le Shaun, A0252643H

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");

describe("INT: Staff can manage fulfillment and customers can only view their own orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_secret_key";
  });

  it("should let customer see only their own orders", async () => {
    const mockOrders = [{ _id: "order-user-1", buyer: "customer1", status: "Processing" }];
    orderModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockOrders),
      }),
    });

    const req = { user: { _id: "customer1" } };
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await getOrdersController(req, res);

    expect(orderModel.find).toHaveBeenCalledWith({ buyer: "customer1" });
    expect(orderModel.find).not.toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith(mockOrders);
  });

  it("should let admin pass middleware and then view all orders", async () => {
    userModel.findById.mockResolvedValueOnce({ _id: "admin123", role: 1 });
    const adminReq = { user: { _id: "admin123" } };
    const adminRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await isAdmin(adminReq, adminRes, next);

    expect(next).toHaveBeenCalled();

    const mockOrders = [
      { _id: "order-1", buyer: "customer1", status: "Processing" },
      { _id: "order-2", buyer: "customer2", status: "Shipped" },
    ];
    orderModel.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockOrders),
        }),
      }),
    });

    const allOrdersRes = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
    await getAllOrdersController(adminReq, allOrdersRes);

    expect(orderModel.find).toHaveBeenCalledWith({});
    expect(allOrdersRes.json).toHaveBeenCalledWith(mockOrders);
  });

  it("should block non-admin users from changing order progress", async () => {
    userModel.findById.mockResolvedValueOnce({ _id: "customer2", role: 0 });
    const req = {
      user: { _id: "customer2" },
      params: { orderId: "order-1" },
      body: { status: "Delivered" },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await isAdmin(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should allow admin users to update order progress", async () => {
    userModel.findById.mockResolvedValueOnce({ _id: "admin456", role: 1 });
    const req = {
      user: { _id: "admin456" },
      params: { orderId: "order-3" },
      body: { status: "Shipped" },
    };
    const authRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await isAdmin(req, authRes, next);
    expect(next).toHaveBeenCalled();

    const updatedOrder = { _id: "order-3", status: "Shipped" };
    orderModel.findByIdAndUpdate.mockResolvedValueOnce(updatedOrder);
    const controllerRes = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await orderStatusController(req, controllerRes);

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "order-3",
      { status: "Shipped" },
      { new: true }
    );
    expect(controllerRes.json).toHaveBeenCalledWith(updatedOrder);
  });

  it("should stop unauthenticated users before reaching protected order update", async () => {
    const req = {
      headers: { authorization: "invalid-token" },
      params: { orderId: "order-4" },
      body: { status: "Delivered" },
    };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await requireSignIn(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(orderModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("should return clear failure response when updating a non-existent order", async () => {
    userModel.findById.mockResolvedValueOnce({ _id: "admin999", role: 1 });
    const req = {
      user: { _id: "admin999" },
      params: { orderId: "missing-order" },
      body: { status: "Shipped" },
    };
    const authRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    const next = jest.fn();

    await isAdmin(req, authRes, next);
    expect(next).toHaveBeenCalled();

    orderModel.findByIdAndUpdate.mockResolvedValueOnce(null);
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };

    await orderStatusController(req, res);

    expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "missing-order",
      { status: "Shipped" },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Order not found" })
    );
  });
});
