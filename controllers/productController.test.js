import {
  createProductController,
  updateProductController,
  deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import fs from "fs";
import slugify from "slugify";

// Mock dependencies
jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");
jest.mock("../models/orderModel.js");
jest.mock("fs");
jest.mock("slugify");
jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn(),
    },
  })),
  Environment: {
    Sandbox: "sandbox",
  },
}));

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
});
