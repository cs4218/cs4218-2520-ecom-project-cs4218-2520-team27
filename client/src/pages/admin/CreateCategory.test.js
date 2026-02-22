import React from "react";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CategoryForm from "../../components/Form/CategoryForm";
import CreateCategory from "./CreateCategory";
import testCategories from "../../../../data/test.categories.json";

// Leong Heng Yew, A0249237X
const API_CREATE = "/create-category";
const API_UPDATE = "/update-category";
const API_DELETE = "/delete-category";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("./../../components/Layout", () => ({ children }) => <div>{children}</div>);
jest.mock("./../../components/AdminMenu", () => () => <div />);
jest.mock("../../components/Form/CategoryForm", () => jest.fn(() => <div />));

describe("CreateCategory Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockResolvedValue({
      data: { success: true, category: testCategories },
    });
  });

  it("fetches existing categories", async () => {
    render(<CreateCategory />);

    expect(axios.get).toHaveBeenCalledTimes(1);
    testCategories.forEach(async (category) => {
      await waitFor(() => expect(screen.getByText(category.name)).toBeInTheDocument);
    });
  });

  it("handles error when fetching existing categories", async () => {
    axios.get.mockRejectedValueOnce(new Error("Fetch categories test"));

    render(<CreateCategory />);

    await waitFor(expect(toast.error).toHaveBeenCalled);
  });

  const submitMockCategoryForm = async (categoryName) => {
    await act(async () => {
      const { setValue } = CategoryForm.mock.calls.at(-1)[0];
      setValue(categoryName);
    });
    await act(async () => {
      const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
      await handleSubmit({ preventDefault: () => {} });
    });
  };

  describe("Create new category", () => {
    it("creates a new category", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });

      render(<CreateCategory />);

      // CategoryForm should be rendered and called with props by CreateCategory
      const testCategory = "testCategory";
      await submitMockCategoryForm(testCategory);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(API_CREATE),
        { name: testCategory }
      );
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid category (empty string)", async () => {
      render(<CreateCategory />);

      const testCategory = "";
      await submitMockCategoryForm(testCategory);

      expect(axios.post).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid category (whitespace string)", async () => {
      render(<CreateCategory />);

      const testCategory = " ";
      await act(async () => {
        const { setValue } = CategoryForm.mock.calls.at(-1)[0];
        setValue(testCategory);
      });
      await act(async () => {
        const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
        await handleSubmit({ preventDefault: () => {} });
      });

      expect(axios.post).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid category (null value)", async () => {
      render(<CreateCategory />);

      const testCategory = null;
      await submitMockCategoryForm(testCategory);

      expect(axios.post).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("handles api failure when creating new category", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: false } });

      render(<CreateCategory />);

      const testCategory = "testCategory";
      await submitMockCategoryForm(testCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("handles api error when creating new category", async () => {
      axios.post.mockRejectedValueOnce(new Error("Create category test"));

      render(<CreateCategory />);

      const testCategory = "testCategory";
      await submitMockCategoryForm(testCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("Update category", () => {
    it("updates an existing category successfully", async () => {
      axios.put.mockResolvedValueOnce({ data: { success: true } });

      render(<CreateCategory />);

      // User clicks edit for existing Electronics category
      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      // User changes the text on CategoryForm and clicks submit button
      const newCategory = "Gadgets";
      await submitMockCategoryForm(newCategory);

      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining(API_UPDATE),
        { name: newCategory }
      );
      expect(toast.success).toHaveBeenCalledTimes(1);
    });

    it("should toggle edit modal when user interacts with Edit and Close buttons", async () => {
      render(<CreateCategory />);
      // Edit modal should be closed by default
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      // Edit modal should be open now
      expect(screen.queryByRole("dialog")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);
      // Edit modal should be closed now
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should close edit modal when user clicks backdrop", async () => {
      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      // Edit modal should be open now
      expect(screen.queryByRole("dialog")).toBeInTheDocument();

      const mask = document.querySelector('.ant-modal-wrap');
      fireEvent.click(mask);
      // Edit modal should be closed now
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("rejects category update (empty string)", async () => {
      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      const newCategory = "";
      await submitMockCategoryForm(newCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("rejects category update (whitespace string)", async () => {
      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      const newCategory = " ";
      await submitMockCategoryForm(newCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("rejects category update (null value)", async () => {
      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);
      const newCategory = null;
      await submitMockCategoryForm(newCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("handles api failure when updating category", async () => {
      axios.put.mockResolvedValueOnce({ data: { success: false } });

      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);

      const newCategory = "Gadgets";
      await submitMockCategoryForm(newCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });

    it("handles api error when updating category", async () => {
      axios.put.mockRejectedValueOnce(new Error("Update category test"));

      render(<CreateCategory />);

      const editButtons = await screen.findAllByText("Edit");
      fireEvent.click(editButtons[0]);

      const newCategory = "Gadgets";
      await submitMockCategoryForm(newCategory);

      expect(toast.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("Delete category", () => {
    it("deletes an existing category", async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: true } });

      render(<CreateCategory />);

      // Delete Electronics category
      const deleteButtons = await screen.findAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          expect.stringContaining(API_DELETE + "/" + testCategories[0]._id)
        );
        expect(toast.success).toHaveBeenCalledTimes(1);
      });
    });

    it("handles api failure when deleting category", async () => {
      axios.delete.mockResolvedValueOnce({ data: { success: false } });

      render(<CreateCategory />);

      const deleteButtons = await screen.findAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledTimes(1);
      });
    });

    it("handles api error when deleting category", async () => {
      axios.delete.mockRejectedValueOnce(new Error("Delete category test"));

      render(<CreateCategory />);

      const deleteButtons = await screen.findAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledTimes(1);
      });
    });
  });
});
