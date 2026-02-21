import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
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

  it("renders categories correctly", () => {
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

  it("renders empty state when no categories are returned", () => {
    useCategory.mockReturnValue([]);

    render(
      <BrowserRouter>
        <Categories />
      </BrowserRouter>
    );

    const links = screen.queryAllByRole("link");
    expect(links).toHaveLength(0);
  });
});
