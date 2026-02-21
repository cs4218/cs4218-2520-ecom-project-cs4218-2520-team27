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

  it("renders component and fetches categories on mount", async () => {
    render(<CreateCategory />);

    expect(axios.get).toHaveBeenCalled();
    testCategories.forEach(async (category) => {
      await waitFor(() => {
        expect(screen.getByText(category.name)).toBeInTheDocument();
      });
    });
  });

  it("creates a new category", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });

    render(<CreateCategory />);

    // CategoryForm should be rendered and called with props by CreateCategory
    const testCategory = "testCategory";
    await act(async () => {
      const { setValue } = CategoryForm.mock.calls.at(-1)[0];
      setValue(testCategory);
    });
    await act(async () => {
      const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
      await handleSubmit({ preventDefault: () => {} });
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining(API_CREATE),
      { name: testCategory }
    );
    expect(toast.success).toHaveBeenCalled();
  });

  it("updates an existing category", async () => {
    axios.put.mockResolvedValueOnce({ data: { success: true } });

    render(<CreateCategory />);

    // User clicks edit for existing Electronics category
    const editButtons = await screen.findAllByText("Edit");
    fireEvent.click(editButtons[0]);
    // User changes the text on CategoryForm.
    const newCategory = "Gadgets";
    await act(async () => {
      const { setValue } = CategoryForm.mock.calls.at(-1)[0];
      setValue(newCategory);
    });
    // User clicks submit
    await act(async () => {
      const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
      await handleSubmit({ preventDefault: () => {} });
    });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining(API_UPDATE),
        { name: newCategory }
      );
      expect(toast.success).toHaveBeenCalled();
    });
  });

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
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("handles error when fetching existing categories", async () => {
    axios.get.mockRejectedValueOnce(new Error("Fetch categories test"));

    render(<CreateCategory />);

    await waitFor(expect(toast.error).toHaveBeenCalled);
  });

  it("handles error when creating new category", async () => {
    axios.post.mockRejectedValueOnce(new Error("Create category test"));

    render(<CreateCategory />);

    await act(async () => {
      const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
      await handleSubmit({ preventDefault: () => {} });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("handles error when updating category", async () => {
    axios.put.mockRejectedValueOnce(new Error("Update category test"));

    render(<CreateCategory />);

    const editButtons = await screen.findAllByText("Edit");
    fireEvent.click(editButtons[0]);

    await act(async () => {
      const { handleSubmit } = CategoryForm.mock.calls.at(-1)[0];
      await handleSubmit({ preventDefault: () => {} });
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("handles error when deleting category", async () => {
    axios.delete.mockRejectedValueOnce(new Error("Delete category test"));

    render(<CreateCategory />);

    const deleteButtons = await screen.findAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
