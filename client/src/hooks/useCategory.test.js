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

  it("should discard invalid categories (empty strings)", async () => {
    const invalidCategories = [
      { _id: "",    name: "cat1", slug: "slug1" },
      { _id: "id2", name: "",     slug: "slug2" },
      { _id: "id3", name: "cat3", slug: ""      },
    ];
    axios.get.mockResolvedValueOnce({ data: { category: testCategories.concat(invalidCategories) } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(testCategories);
    });
  });

  it("should discard invalid categories (null values)", async () => {
    const invalidCategories = [
      { _id: null,  name: "cat1", slug: "slug1" },
      { _id: "id2", name: null,   slug: "slug2" },
      { _id: "id3", name: "cat3", slug: null    },
    ];
    axios.get.mockResolvedValueOnce({ data: { category: testCategories.concat(invalidCategories) } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(testCategories);
    });
  });

  it("should discard invalid categories (missing fields)", async () => {
    const invalidCategories = [
      {             name: "cat1", slug: "slug1" },
      { _id: "id2",               slug: "slug2" },
      { _id: "id3", name: "cat3"                },
    ];
    axios.get.mockResolvedValueOnce({ data: { category: testCategories.concat(invalidCategories) } });

    const { result } = renderHook(() => useCategory());

    await waitFor(() => {
      expect(result.current).toEqual(testCategories);
    });
  });
});
