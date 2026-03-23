import {
    getProductController,
    getSingleProductController,
    braintreeTokenController,
    brainTreePaymentController,
    realtedProductController
} from "./productController.js";
import { requireSignIn } from "../middlewares/authMiddleware.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import JWT from "jsonwebtoken";

jest.mock("../models/productModel.js");
jest.mock("../models/orderModel.js");
jest.mock("jsonwebtoken");

// Mock Braintree
jest.mock("braintree", () => {
    return {
        BraintreeGateway: jest.fn().mockImplementation(() => ({
            clientToken: {
                generate: jest.fn((options, cb) => cb(null, { clientToken: "test_client_token" }))
            },
            transaction: {
                sale: jest.fn((options, cb) => cb(null, { success: true, transaction: { id: "test_txn_id" } }))
            }
        })),
        Environment: {
            Sandbox: "sandbox"
        }
    };
});

describe("INT: Product Checkout and Data Retrieval Capabilities", () => {
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        
        req = {
            headers: {},
            body: {},
            params: {},
            user: { _id: "user_123" }
        };
        
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn()
        };
        
        process.env.JWT_SECRET = "test_secret";
    });

    describe("Phase 1: Data Retrieval", () => {
        // Kim Hofmann, A0337805Y
        it("should retrieve accurate product details for list view", async () => {
            const mockProducts = [
                { _id: "p1", name: "Product 1", price: 100, quantity: 10, slug: "product-1" },
                { _id: "p2", name: "Product 2", price: 200, quantity: 5, slug: "product-2" }
            ];
            
            const mockQuery = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                sort: jest.fn().mockResolvedValue(mockProducts),
            };
            
            productModel.find.mockReturnValue(mockQuery);

            await getProductController(req, res);

            expect(productModel.find).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                counTotal: mockProducts.length,
                message: "ALlProducts ",
                products: mockProducts
            });

            const sentPayload = res.send.mock.calls[0][0];
            expect(sentPayload.products[0]).toEqual(
                expect.objectContaining({
                    price: expect.any(Number),
                    quantity: expect.any(Number),
                    slug: expect.any(String),
                })
            );
        });

        // Kim Hofmann, A0337805Y
        it("should retrieve individual product details accurately", async () => {
            req.params.slug = "product-1";
            const mockProduct = { _id: "p1", name: "Product 1", price: 100, quantity: 10, slug: "product-1" };
            
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockProduct),
            };
            
            productModel.findOne.mockReturnValue(mockQuery);

            await getSingleProductController(req, res);

            expect(productModel.findOne).toHaveBeenCalledWith({ slug: "product-1" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Single Product Fetched",
                product: mockProduct
            });

            const sentPayload = res.send.mock.calls[0][0];
            expect(sentPayload.product).toEqual(
                expect.objectContaining({
                    price: 100,
                    quantity: 10,
                    slug: "product-1",
                })
            );
        });
    });

    describe("Phase 2: Security & Checkout Token", () => {
        // Kim Hofmann, A0337805Y
        it("should return a valid secure payment token", async () => {
            await braintreeTokenController(req, res);
            expect(res.send).toHaveBeenCalledWith({ clientToken: "test_client_token" });
            expect(res.send.mock.calls[0][0].clientToken).toEqual(expect.any(String));
            expect(res.send.mock.calls[0][0].clientToken.length).toBeGreaterThan(0);
        });

        // Kim Hofmann, A0337805Y
        it("should allow signed-in users with valid JWT token", async () => {
            const next = jest.fn();
            const decodedUser = { _id: "signed_in_user" };
            req.headers.authorization = "valid.jwt.token";
            JWT.verify.mockReturnValue(decodedUser);

            await requireSignIn(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(req.user).toEqual(decodedUser);
        });

        // Kim Hofmann, A0337805Y
        it("should fail with 401 Unauthorized if the user is not signed in", async () => {
            const next = jest.fn();
            JWT.verify.mockImplementation(() => { throw new Error("Invalid Token") });

            await requireSignIn(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({ success: false, message: "Unauthorized: Invalid or missing token" });
        });
    });

    describe("Phase 3 & 4: Logic Validation and Price Integrity", () => {
        // Kim Hofmann, A0337805Y
        it("should fail purchase if item quantity requested exceeds current inventory", async () => {
            req.body = {
                nonce: "test_nonce",
                cart: [
                    { slug: "product-1", price: 100 },
                    { slug: "product-1", price: 100 },
                    { slug: "product-1", price: 100 }
                ] // 3 requested
            };

            const mockDbProducts = [
                { _id: "p1", slug: "product-1", price: 100, quantity: 2 } // Only 2 in stock
            ];

            productModel.find.mockResolvedValue(mockDbProducts);

            await brainTreePaymentController(req, res);

            // Expect to fail due to quantity
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(expect.any(Error));
            expect(res.send.mock.calls[0][0].message).toContain("exceeds available inventory");
        });

        // Kim Hofmann, A0337805Y
        it("should calculate correct total with tax and shipping and save order for a valid purchase", async () => {
            req.body = {
                nonce: "test_nonce",
                cart: [
                    { slug: "product-1", price: 100 },
                    { slug: "product-2", price: 50 }
                ]
            };

            const mockDbProducts = [
                { _id: "p1", slug: "product-1", price: 100, quantity: 10 },
                { _id: "p2", slug: "product-2", price: 50, quantity: 10 }
            ];

            productModel.find.mockResolvedValue(mockDbProducts);
            productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(true);

            // Mock orderModel save
            const mockSave = jest.fn().mockResolvedValue(true);
            orderModel.mockImplementation(() => ({ save: mockSave }));

            await brainTreePaymentController(req, res);
            
            // Wait for next tick to let async callback run
            await new Promise(process.nextTick);

            // Expected total calculation
            const rawTotal = 150;
            const finalExpectedTotal = rawTotal + (rawTotal * 0.09) + 10;

            expect(productModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
            expect(mockSave).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ ok: true, total: finalExpectedTotal });
        });

        // Kim Hofmann, A0337805Y
        it("should fail purchase if cart price is tampered from database price", async () => {
            req.body = {
                nonce: "test_nonce",
                cart: [
                    { slug: "product-1", price: 10 }
                ]
            };

            const mockDbProducts = [
                { _id: "p1", slug: "product-1", price: 100, quantity: 10 }
            ];

            productModel.find.mockResolvedValue(mockDbProducts);

            await brainTreePaymentController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith(expect.any(Error));
            expect(res.send.mock.calls[0][0].message).toContain("Price integrity check");
        });
    });

    describe("Phase 5: Recommendations", () => {
        // Kim Hofmann, A0337805Y
        it("should successfully load similar items excluding the selected product ID", async () => {
            req.params = { pid: "p1", cid: "c1" };
            
            const mockRelated = [
                { _id: "p2", name: "Product 2", category: "c1" },
                { _id: "p3", name: "Product 3", category: "c1" }
            ];

            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                populate: jest.fn().mockResolvedValue(mockRelated),
            };
            
            productModel.find.mockReturnValue(mockQuery);

            await realtedProductController(req, res);

            expect(productModel.find).toHaveBeenCalledWith({
                category: "c1",
                _id: { $ne: "p1" }
            });
            expect(mockQuery.select).toHaveBeenCalledWith("-photo");
            expect(mockQuery.limit).toHaveBeenCalledWith(3);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                products: mockRelated
            });
        });
    });
});
