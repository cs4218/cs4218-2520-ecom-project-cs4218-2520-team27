import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Categories from "./Categories";
import useCategory from "../hooks/useCategory";
import testCategories from "../../../data/test.categories.json";

// Leong Heng Yew, A0249237X
jest.mock("../hooks/useCategory");

jest.mock("../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

describe("Categories Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders categories correctly", () => {
    useCategory.mockReturnValue(testCategories);

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    testCategories.forEach(category => {
        const categoryLink = screen.getByText(category.name);
        expect(categoryLink).toBeInTheDocument();
        expect(categoryLink.closest("a")).toHaveAttribute(
            "href",
            `/category/${category.slug}`
        );
    });
  });

  test("renders only valid categories when invalid fields present", () => {
    const invalidCategories = [
        { _id: "", name: "cat1", slug: "slug1" },
        { _id: "id2", name: "", slug: "slug2" },
        { _id: "id3", name: "cat3", slug: "" },
        { _id: null, name: "cat4", slug: "slug4" },
        { _id: "id5", name: null, slug: "slug5" },
        { _id: "id6", name: "cat6", slug: null },
    ];
    useCategory.mockReturnValue(testCategories.concat(invalidCategories));

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    testCategories.forEach(category => {
        const categoryLink = screen.queryByRole("link", { name: category.name });
        expect(categoryLink).toBeInTheDocument();
        expect(categoryLink.closest("a")).toHaveAttribute(
            "href",
            `/category/${category.slug}`
        );
    });

    // Verify total links count matches only the valid count
    const allLinks = screen.getAllByRole("link");
    expect(allLinks).toHaveLength(testCategories.length);
  });

  test("renders empty state when no categories are returned", () => {
    useCategory.mockReturnValue([]);

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    const links = screen.queryAllByRole("link");
    expect(links.length).toBe(0);
  });
});
