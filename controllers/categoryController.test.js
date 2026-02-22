import slugify from "slugify";
import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} from "../controllers/categoryController.js";
import categoryModel from "../models/categoryModel.js";

jest.mock("../models/categoryModel.js");
jest.mock("slugify");

// Leong Heng Yew, A0249237X
describe("Category Controller", () => {
  const req = { body: {}, params: {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const databaseError = new Error("Category Controller - Database Error");

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

  describe("createCategoryController", () => {
    it("should return 400 if name is missing", async () => {
      req.body = {};

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should return 5xx if database errors out", async () => {
      req.body = { name: "testCategory"};
      categoryModel.findOne.mockRejectedValue(databaseError);

      await createCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it("should return 200 if category already exists", async () => {
      req.body = { name: "testCategory" };
      categoryModel.findOne.mockResolvedValue({ name: "testCategory" });

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it("should slugify category name and save to database", async () => {
      const name = "Books", slug = "book-slug";
      const category = { name: name, slug: slug };
      req.body = { name: name };
      slugify.mockReturnValue(slug);
      categoryModel.findOne.mockResolvedValue(null);
      const saveMock = jest.fn().mockResolvedValue(category);
      categoryModel.mockReturnValue({ save: saveMock });

      await createCategoryController(req, res);

      expect(saveMock).toHaveBeenCalledTimes(1); // Saved into mongodb
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        category: category
      }));
    });
  });

  describe("updateCategoryController", () => {
    it("should slugify name and update database", async () => {
      const id = "123", name = "Updated Books", slug = "updated-books-slug";
      const updatedCategory = { _id: id, name: name, slug: slug };
      req.body = { name: name };
      req.params = { id: id };
      slugify.mockReturnValue(slug);
      categoryModel.findByIdAndUpdate.mockResolvedValue(updatedCategory);

      await updateCategoryController(req, res);

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { name, slug: slug },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        category: updatedCategory,
      }));
    });

    it("should return 5xx if database errors out", async () => {
      req.body = { name: "testCategory" };
      req.params = { id: "123" };
      categoryModel.findByIdAndUpdate.mockRejectedValue(databaseError);

      await updateCategoryController(req, res);

      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("categoryControlller", () => {
    it("should fetch all categories from the database", async () => {
      const mockCategories = [{ name: "A", slug: "a" }, { name: "B", slug: "b" }];
      categoryModel.find.mockResolvedValue(mockCategories);

      await categoryControlller(req, res);

      expect(categoryModel.find).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        category: mockCategories,
      }));
    });

    it("should return 5xx if database errors out", async () => {
      categoryModel.find.mockRejectedValue(databaseError);

      await categoryControlller(req, res);

      expect(categoryModel.find).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("singleCategoryController", () => {
    it("should fetch a single category by slug from database", async () => {
      const slug = "test-slug";
      const mockCategory = { name: "Test", slug: slug };
      req.params = { slug: slug };
      categoryModel.findOne.mockResolvedValue(mockCategory);

      await singleCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: slug });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        category: mockCategory,
      }));
    });

    it("should return 5xx if database errors out", async () => {
      req.params = { slug: "test-slug" };
      categoryModel.findOne.mockRejectedValue(databaseError);

      await singleCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith5xxServerError();
      expect(res.send).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteCategoryCOntroller", () => {
    it("should call findByIdAndDelete with correct id and return 200", async () => {
      const id = "123";
      req.params = { id: id };
      categoryModel.findByIdAndDelete.mockResolvedValue(true);

      await deleteCategoryCOntroller(req, res);

      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith(id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });

    it("should return 5xx if database errors out", async () => {
      req.params = { id: "123" };
      const error = new Error("Database Error");
      categoryModel.findByIdAndDelete.mockRejectedValue(error);

      await deleteCategoryCOntroller(req, res);

      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error,
      }));
    });
  });
});
