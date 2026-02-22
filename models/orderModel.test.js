import mongoose from "mongoose";
import orderModel from "./orderModel.js";

// Lai Xue Le Shaun, A0252643H

describe("Order Model", () => {
  describe("Schema Definition", () => {
    it("should have products field as array of ObjectIds", () => {
      const productsPath = orderModel.schema.path("products");
      expect(productsPath).toBeDefined();
      expect(productsPath.instance).toBe("Array");
    });

    it("should have products referencing Products model", () => {
      const productsPath = orderModel.schema.path("products");
      expect(productsPath.caster.options.ref).toBe("Products");
    });

    it("should have payment field", () => {
      const paymentPath = orderModel.schema.path("payment");
      expect(paymentPath).toBeDefined();
    });

    it("should have buyer field as ObjectId", () => {
      const buyerPath = orderModel.schema.path("buyer");
      expect(buyerPath).toBeDefined();
      expect(buyerPath.instance).toBe("ObjectId");
    });

    it("should have buyer referencing users model", () => {
      const buyerPath = orderModel.schema.path("buyer");
      expect(buyerPath.options.ref).toBe("users");
    });

    it("should have status field as String", () => {
      const statusPath = orderModel.schema.path("status");
      expect(statusPath).toBeDefined();
      expect(statusPath.instance).toBe("String");
    });

    it("should have default status as 'Not Process'", () => {
      const statusPath = orderModel.schema.path("status");
      expect(statusPath.defaultValue).toBe("Not Process");
    });

    it("should have status enum with correct values", () => {
      const statusPath = orderModel.schema.path("status");
      const expectedEnums = ["Not Process", "Processing", "Shipped", "deliverd", "cancel"];
      expect(statusPath.enumValues).toEqual(expectedEnums);
    });

    it("should have timestamps enabled", () => {
      expect(orderModel.schema.options.timestamps).toBe(true);
    });
  });

  describe("Model Name", () => {
    it("should be named Order", () => {
      expect(orderModel.modelName).toBe("Order");
    });
  });

  describe("Schema Validation", () => {
    it("should create order with valid status values", () => {
      const validStatuses = ["Not Process", "Processing", "Shipped", "deliverd", "cancel"];

      validStatuses.forEach((status) => {
        const order = new orderModel({
          products: [],
          buyer: new mongoose.Types.ObjectId(),
          status: status,
          payment: { success: true },
        });

        const validationError = order.validateSync();
        expect(validationError).toBeUndefined();
      });
    });

    it("should reject invalid status values", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "InvalidStatus",
        payment: { success: true },
      });

      const validationError = order.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.status).toBeDefined();
    });

    it("should create order with default status when not provided", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        payment: { success: true },
      });

      expect(order.status).toBe("Not Process");
    });

    it("should accept empty products array", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        payment: { success: true },
      });

      const validationError = order.validateSync();
      expect(validationError).toBeUndefined();
      expect(order.products).toEqual([]);
    });

    it("should accept multiple products", () => {
      const productIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ];

      const order = new orderModel({
        products: productIds,
        buyer: new mongoose.Types.ObjectId(),
        payment: { success: true },
      });

      const validationError = order.validateSync();
      expect(validationError).toBeUndefined();
      expect(order.products.length).toBe(3);
    });

    it("should accept payment object with any structure", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        payment: {
          success: true,
          transactionId: "txn123",
          amount: 99.99,
        },
      });

      const validationError = order.validateSync();
      expect(validationError).toBeUndefined();
      expect(order.payment.success).toBe(true);
      expect(order.payment.transactionId).toBe("txn123");
    });

    it("should accept empty payment object", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        payment: {},
      });

      const validationError = order.validateSync();
      expect(validationError).toBeUndefined();
    });
  });

  describe("ObjectId Validation", () => {
    it("should accept valid ObjectId for buyer", () => {
      const validId = new mongoose.Types.ObjectId();
      const order = new orderModel({
        products: [],
        buyer: validId,
        payment: {},
      });

      expect(order.buyer.toString()).toBe(validId.toString());
    });

    it("should accept valid ObjectIds in products array", () => {
      const productId1 = new mongoose.Types.ObjectId();
      const productId2 = new mongoose.Types.ObjectId();

      const order = new orderModel({
        products: [productId1, productId2],
        buyer: new mongoose.Types.ObjectId(),
        payment: {},
      });

      expect(order.products[0].toString()).toBe(productId1.toString());
      expect(order.products[1].toString()).toBe(productId2.toString());
    });
  });

  describe("Status Enum Values", () => {
    it("should accept 'Not Process' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "Not Process",
        payment: {},
      });

      expect(order.status).toBe("Not Process");
      expect(order.validateSync()).toBeUndefined();
    });

    it("should accept 'Processing' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "Processing",
        payment: {},
      });

      expect(order.status).toBe("Processing");
      expect(order.validateSync()).toBeUndefined();
    });

    it("should accept 'Shipped' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "Shipped",
        payment: {},
      });

      expect(order.status).toBe("Shipped");
      expect(order.validateSync()).toBeUndefined();
    });

    it("should accept 'deliverd' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "deliverd",
        payment: {},
      });

      expect(order.status).toBe("deliverd");
      expect(order.validateSync()).toBeUndefined();
    });

    it("should accept 'cancel' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "cancel",
        payment: {},
      });

      expect(order.status).toBe("cancel");
      expect(order.validateSync()).toBeUndefined();
    });

    it("should reject lowercase 'processing' status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "processing",
        payment: {},
      });

      const validationError = order.validateSync();
      expect(validationError).toBeDefined();
    });

    it("should reject 'Delivered' (different spelling) status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "Delivered",
        payment: {},
      });

      const validationError = order.validateSync();
      expect(validationError).toBeDefined();
    });

    it("should reject 'Cancelled' (different spelling) status", () => {
      const order = new orderModel({
        products: [],
        buyer: new mongoose.Types.ObjectId(),
        status: "Cancelled",
        payment: {},
      });

      const validationError = order.validateSync();
      expect(validationError).toBeDefined();
    });
  });
});
