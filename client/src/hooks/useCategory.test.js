import { renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";
import testCategories from "../../../data/test.categories.json";

// Leong Heng Yew, A0249237X
jest.mock("axios");

describe("useCategory Hook", () => {
  it("should not throw errors when api returns empty data", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: [] } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    expect(axios.get).toHaveBeenCalled();
  });

  it("should not throw errors when api returns invalid data", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: 420 } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });

    expect(axios.get).toHaveBeenCalled();
  });

  it("should fetch categories and update state correctly", async () => {
    axios.get.mockResolvedValueOnce({ data: { category: testCategories } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(testCategories);
    });

    expect(axios.get).toHaveBeenCalled();
  });

  it("should handle api/network errors gracefully", async () => {
    axios.get.mockRejectedValue(new Error("Unit Test"));

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});
