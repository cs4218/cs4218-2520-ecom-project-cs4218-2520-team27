import { useState, useEffect } from "react";
import axios from "axios";

export default function useCategory() {
  const [categories, setCategories] = useState([]);

  const getCategories = async () => {
    try {
      // Leong Heng Yew, A0249237X
      const cats = (await axios.get("/api/v1/category/get-category")).data?.category;
      setCategories(
        // Remove invalid categories
        cats.map(c => {
              c._id = c._id?.trim();
              c.slug = c.slug?.trim();
              c.name = c.name?.trim();
              return c;
            })
           .filter(c => c._id && c.slug && c.name)
      );
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getCategories();
  }, []);

  return categories;
}
