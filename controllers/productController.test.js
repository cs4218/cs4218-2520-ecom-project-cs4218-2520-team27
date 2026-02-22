import braintree from "braintree";
import fs from "fs";
import slugify from "slugify";

import {
  braintreeTokenController,
  brainTreePaymentController,
  createProductController,
  updateProductController,
  deleteProductController,
  getProductController,
  getSingleProductController,
  searchProductController,
} from "./productController.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";

// Mock dependencies
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("fs");
jest.mock("slugify");

// Leong Heng Yew, A0249237X
jest.mock("braintree", () => {
  const mockGatewayInstance = {
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn(),
    },
  };
  return {
    BraintreeGateway: jest.fn(() => mockGatewayInstance),
    Environment: { Sandbox: "sandbox" },
  };
});
jest.mock("../models/orderModel.js", () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true),
  }));
});

// Leong Heng Yew, A0249237X
describe("Braintree Controllers", () => {
  const mockGateway = new braintree.BraintreeGateway;
  const req = {
    body: {},
    user: { _id: "user123" },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };

  expect.extend({
    toHaveBeenCalledWith5xxServerError(received) {
      const lastCall = received.mock.calls.at(-1);
      const statusCode = lastCall ? lastCall[0] : null;
      const pass = statusCode >= 500 && statusCode < 600;

      if (pass) {
        return {
          message: () => `expected ${statusCode} not to be a 5xx server error`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${statusCode} to be a 5xx server error`,
          pass: false,
        };
      }
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("braintreeTokenController", () => {
    it("should generate a client token successfully", async () => {
      const mockResponse = { clientToken: "fake-token" };
      mockGateway.clientToken.generate.mockImplementation((opts, callback) => {
        callback(null, mockResponse);
      });

      await braintreeTokenController(req, res);

      expect(res.send).toHaveBeenCalledWith(mockResponse);
    });

    it("should return 5xx if token generation fails", async () => {
      const mockError = new Error("Braintree token generation failed");
      mockGateway.clientToken.generate.mockImplementation((opts, callback) => {
        callback(mockError, null);
      });

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    it("should return 5xx if network error", async () => {
      const mockError = new Error("Network error while generating braintree token");
      mockGateway.clientToken.generate.mockImplementation(() => {
        throw mockError;
      });

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });
  });

  describe("brainTreePaymentController", () => {
    const item1 = { slug: "slug1", price: 10 };
    const item1WrongPrice = { slug: "slug1", price: 1 };
    const item2 = { slug: "slug2", price: 20 };
    const fakeNonce = "fake-nonce";

    it("should process payment and create order successfully", async () => {
      const mockCart = [item1, item2];
      req.body = { nonce: fakeNonce, cart: mockCart };
      productModel.find = jest.fn().mockReturnValueOnce(mockCart);
      const mockResult = { success: true, transaction: { id: "tx123" } };
      mockGateway.transaction.sale.mockImplementation((opts, callback) => {
        callback(null, mockResult);
      });

      await brainTreePaymentController(req, res);

      expect(productModel.find).toHaveBeenCalledTimes(1);
      expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 30, paymentMethodNonce: fakeNonce }),
        expect.any(Function)
      );
      expect(orderModel).toHaveBeenCalledWith({
        products: mockCart,
        payment: mockResult,
        buyer: req.user._id,
      });
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it("should return 400 if cart is empty", async () => {
      req.body = { nonce: fakeNonce, cart: [] };

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 400 if item does not exist in db", async () => {
      req.body = { nonce: fakeNonce, cart: [item1] };
      productModel.find = jest.fn().mockReturnValueOnce([]);

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 400 if some items are unavailable", async () => {
      req.body = { nonce: fakeNonce, cart: [item1, item2] };
      productModel.find = jest.fn().mockReturnValueOnce([item1]);

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 400 if item price in cart does not match db", async () => {
      const mockCart = [item1];
      req.body = { nonce: fakeNonce, cart: mockCart };
      productModel.find = jest.fn().mockReturnValueOnce([item1WrongPrice]);

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalled();
    });

    it("should return 5xx if dbms errors out", async () => {
      const mockCart = [item1];
      req.body = { nonce: fakeNonce, cart: mockCart };
      const mockError = { message: "Dbms error" };
      productModel.find = jest.fn().mockRejectedValueOnce(mockError);

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    it("should return 5xx if dbms network error", async () => {
      const mockCart = [item1];
      req.body = { nonce: fakeNonce, cart: mockCart };
      const mockError = { message: "Dbms network error" };
      productModel.find = jest.fn().mockImplementationOnce(() => {
        throw mockError;
      });

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    it("should return 5xx if gateway transaction fails", async () => {
      const mockCart = [item1];
      req.body = { nonce: fakeNonce, cart: mockCart };
      productModel.find = jest.fn().mockReturnValueOnce(mockCart);
      const mockError = { message: "Payment failed" };
      mockGateway.transaction.sale.mockImplementation((opts, callback) => {
        callback(mockError, null);
      });

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    it("should return 5xx if gateway network error", async () => {
      const mockCart = [item1];
      req.body = { nonce: fakeNonce, cart: mockCart };
      productModel.find = jest.fn().mockReturnValueOnce(mockCart);
      const mockError = { message: "Payment failed" };
      mockGateway.transaction.sale.mockImplementation((opts, callback) => {
        throw mockError;
      });

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledWith(mockError);
    });
  });
});

// Lai Xue Le Shaun, A0252643H
describe("Product Controller - Create, Update, Delete", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      fields: {},
      files: {},
      params: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    slugify.mockImplementation((str) => str.toLowerCase().replace(/\s+/g, "-"));
  });

  describe("createProductController", () => {
    const validProductFields = {
      name: "Test Product",
      description: "Test Description",
      price: 99.99,
      category: "cat123",
      quantity: 10,
      shipping: true,
    };

    it("should create product successfully without photo", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {};

      const mockSavedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "test-product",
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.mockImplementation(() => mockSavedProduct);

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Created Successfully",
        products: mockSavedProduct,
      });
    });

    it("should create product successfully with photo", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {
        photo: {
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
          size: 500000,
        },
      };

      const mockPhotoData = Buffer.from("mock photo data");
      fs.readFileSync.mockReturnValue(mockPhotoData);

      const mockSavedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "test-product",
        photo: {
          data: null,
          contentType: null,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.mockImplementation(() => mockSavedProduct);

      await createProductController(mockReq, mockRes);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/photo.jpg");
      expect(mockSavedProduct.photo.data).toBe(mockPhotoData);
      expect(mockSavedProduct.photo.contentType).toBe("image/jpeg");
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it("should return error when name is missing", async () => {
      mockReq.fields = { ...validProductFields, name: "" };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    it("should return error when description is missing", async () => {
      mockReq.fields = { ...validProductFields, description: "" };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    it("should return error when price is missing", async () => {
      mockReq.fields = { ...validProductFields, price: "" };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    it("should return error when category is missing", async () => {
      mockReq.fields = { ...validProductFields, category: "" };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    it("should return error when quantity is missing", async () => {
      mockReq.fields = { ...validProductFields, quantity: "" };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    it("should return error when photo is larger than 1MB", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {
        photo: {
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
          size: 1500000, // 1.5MB
        },
      };

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    it("should handle database save error", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      mockReq.fields = validProductFields;
      mockReq.files = {};

      const mockProduct = {
        save: jest.fn().mockRejectedValue(mockError),
        photo: {},
      };
      productModel.mockImplementation(() => mockProduct);

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error in crearing product",
      });

      consoleSpy.mockRestore();
    });

    it("should create slug from product name", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {};

      const mockSavedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "test-product",
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.mockImplementation(() => mockSavedProduct);

      await createProductController(mockReq, mockRes);

      expect(slugify).toHaveBeenCalledWith("Test Product");
    });

    it("should accept photo exactly 1MB in size", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {
        photo: {
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
          size: 1000000, // Exactly 1MB
        },
      };

      const mockPhotoData = Buffer.from("mock photo data");
      fs.readFileSync.mockReturnValue(mockPhotoData);

      const mockSavedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "test-product",
        photo: {
          data: null,
          contentType: null,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.mockImplementation(() => mockSavedProduct);

      await createProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateProductController", () => {
    const validProductFields = {
      name: "Updated Product",
      description: "Updated Description",
      price: 149.99,
      category: "cat456",
      quantity: 15,
      shipping: false,
    };

    it("should update product successfully without photo", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {};
      mockReq.params = { pid: "product123" };

      const mockUpdatedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "updated-product",
        photo: {},
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedProduct);

      await updateProductController(mockReq, mockRes);

      expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "product123",
        { ...validProductFields, slug: "updated-product" },
        { new: true }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Updated Successfully",
        products: mockUpdatedProduct,
      });
    });

    it("should update product successfully with new photo", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {
        photo: {
          path: "/tmp/new-photo.jpg",
          type: "image/png",
          size: 800000,
        },
      };
      mockReq.params = { pid: "product123" };

      const mockPhotoData = Buffer.from("new photo data");
      fs.readFileSync.mockReturnValue(mockPhotoData);

      const mockUpdatedProduct = {
        ...validProductFields,
        _id: "product123",
        slug: "updated-product",
        photo: {
          data: null,
          contentType: null,
        },
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedProduct);

      await updateProductController(mockReq, mockRes);

      expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/new-photo.jpg");
      expect(mockUpdatedProduct.photo.data).toBe(mockPhotoData);
      expect(mockUpdatedProduct.photo.contentType).toBe("image/png");
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it("should return error when name is missing", async () => {
      mockReq.fields = { ...validProductFields, name: "" };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Name is Required" });
    });

    it("should return error when description is missing", async () => {
      mockReq.fields = { ...validProductFields, description: "" };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Description is Required" });
    });

    it("should return error when price is missing", async () => {
      mockReq.fields = { ...validProductFields, price: "" };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Price is Required" });
    });

    it("should return error when category is missing", async () => {
      mockReq.fields = { ...validProductFields, category: "" };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Category is Required" });
    });

    it("should return error when quantity is missing", async () => {
      mockReq.fields = { ...validProductFields, quantity: "" };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
    });

    it("should return error when photo is larger than 1MB", async () => {
      mockReq.fields = validProductFields;
      mockReq.files = {
        photo: {
          path: "/tmp/photo.jpg",
          type: "image/jpeg",
          size: 2000000, // 2MB
        },
      };
      mockReq.params = { pid: "product123" };

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: "photo is Required and should be less then 1mb",
      });
    });

    it("should handle database update error", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      mockReq.fields = validProductFields;
      mockReq.files = {};
      mockReq.params = { pid: "product123" };

      productModel.findByIdAndUpdate = jest.fn().mockRejectedValue(mockError);

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error in Updte product",
      });

      consoleSpy.mockRestore();
    });

    it("should update slug based on new name", async () => {
      mockReq.fields = { ...validProductFields, name: "New Product Name" };
      mockReq.files = {};
      mockReq.params = { pid: "product123" };

      const mockUpdatedProduct = {
        ...validProductFields,
        name: "New Product Name",
        _id: "product123",
        slug: "new-product-name",
        photo: {},
        save: jest.fn().mockResolvedValue(true),
      };

      productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockUpdatedProduct);

      await updateProductController(mockReq, mockRes);

      expect(slugify).toHaveBeenCalledWith("New Product Name");
    });
  });

  describe("deleteProductController", () => {
    it("should delete product successfully", async () => {
      mockReq.params = { pid: "product123" };

      productModel.findByIdAndDelete = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: "product123" }),
      });

      await deleteProductController(mockReq, mockRes);

      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("product123");
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Deleted successfully",
      });
    });

    it("should handle delete error", async () => {
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      mockReq.params = { pid: "product123" };

      productModel.findByIdAndDelete = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError),
      });

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while deleting product",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });

    it("should call select with -photo to exclude photo from response", async () => {
      mockReq.params = { pid: "product123" };

      const mockSelect = jest.fn().mockResolvedValue({ _id: "product123" });
      productModel.findByIdAndDelete = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      await deleteProductController(mockReq, mockRes);

      expect(mockSelect).toHaveBeenCalledWith("-photo");
    });

    it("should delete product with different product id", async () => {
      mockReq.params = { pid: "differentProduct456" };

      productModel.findByIdAndDelete = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: "differentProduct456" }),
      });

      await deleteProductController(mockReq, mockRes);

      expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("differentProduct456");
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle non-existent product gracefully", async () => {
      mockReq.params = { pid: "nonexistent" };

      productModel.findByIdAndDelete = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await deleteProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Deleted successfully",
      });
    });
  });

  describe("getProductController", () => {
    it("should fetch all products successfully", async () => {
      // Arrange
      const mockProducts = [
        { _id: "1", name: "Product 1", price: 99.99 },
        { _id: "2", name: "Product 2", price: 149.99 },
      ];

      productModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await getProductController(mockReq, mockRes);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        counTotal: 2,
        message: "ALlProducts ",
        products: mockProducts,
      });
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      productModel.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await getProductController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Erorr in getting products",
        error: mockError.message,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("getSingleProductController", () => {
    it("should fetch single product by slug successfully", async () => {
      // Arrange
      mockReq.params = { slug: "test-product" };
      const mockProduct = {
        _id: "1",
        name: "Test Product",
        slug: "test-product",
        price: 99.99,
      };

      productModel.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProduct),
      });

      // Act
      await getSingleProductController(mockReq, mockRes);

      // Assert
      expect(productModel.findOne).toHaveBeenCalledWith({ slug: "test-product" });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Single Product Fetched",
        product: mockProduct,
      });
    });

    it("should handle product not found", async () => {
      // Arrange
      mockReq.params = { slug: "nonexistent" };
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      productModel.findOne = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null),
      });

      // Act
      await getSingleProductController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: true,
        message: "Single Product Fetched",
        product: null,
      });

      consoleSpy.mockRestore();
    });
  });

  describe("searchProductController", () => {
    it("should search products by keyword in name", async () => {
      // Arrange
      mockReq.params = { keyword: "laptop" };
      const mockProducts = [
        { _id: "1", name: "Gaming Laptop", price: 1200 },
      ];

      productModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(mockProducts),
      });

      // Act
      await searchProductController(mockReq, mockRes);

      // Assert
      expect(productModel.find).toHaveBeenCalled();
      const callArgs = productModel.find.mock.calls[0][0];
      expect(callArgs.$or).toBeDefined();
      expect(mockRes.json).toHaveBeenCalledWith(mockProducts);
    });

    it("should use case-insensitive search", async () => {
      // Arrange
      mockReq.params = { keyword: "LAPTOP" };

      productModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      // Act
      await searchProductController(mockReq, mockRes);

      // Assert
      const callArgs = productModel.find.mock.calls[0][0];
      expect(callArgs.$or[0].name.$options).toBe("i");
      expect(callArgs.$or[1].description.$options).toBe("i");
    });

    it("should handle search error", async () => {
      // Arrange
      mockReq.params = { keyword: "test" };
      const mockError = new Error("Database error");
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      productModel.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(mockError),
      });

      // Act
      await searchProductController(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        success: false,
        message: "Error In Search Product API",
        error: mockError,
      });

      consoleSpy.mockRestore();
    });
  });
});
