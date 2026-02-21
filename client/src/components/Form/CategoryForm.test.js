import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryForm from "./CategoryForm";

// Leong Heng Yew, A0249237X
const TEST_CATEGORY = "testCategory";

describe("CategoryForm Component", () => {
  const setup = (value) => {
    const handleSubmit = jest.fn(e => e.preventDefault());
    const setValue = jest.fn();

    const utils = render(
      <CategoryForm
        handleSubmit={handleSubmit}
        value={value}
        setValue={setValue}
      />
    );

    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button");

    return {
      handleSubmit,
      setValue,
      input,
      button,
      ...utils,
    };
  };

  it("renders the input and submit button correctly", () => {
    const { input, button } = setup(TEST_CATEGORY);
    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(input.value).toBe(TEST_CATEGORY);
  });

  it("calls setValue on input change", () => {
    const { input, setValue } = setup(TEST_CATEGORY);
    const newValue = "newCategory";
    fireEvent.change(input, { target: { value: newValue } });

    expect(setValue).toHaveBeenCalled();
    expect(setValue).toHaveBeenCalledWith(newValue);
  });

  it("calls handleSubmit when submitted with valid category", () => {
    const { button, handleSubmit } = setup(TEST_CATEGORY);

    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalled();
  });
});
