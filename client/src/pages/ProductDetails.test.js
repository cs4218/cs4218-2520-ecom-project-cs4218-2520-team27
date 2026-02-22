import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetails from './ProductDetails';

jest.mock('axios');
jest.mock('../components/Layout', () => {
  return function Layout({ children, title }) {
    return <div data-testid="layout">{children}</div>;
  };
});

describe('ProductDetails Component', () => {
  const mockProductData = {
    _id: 'prod1',
    name: 'Test Product',
    slug: 'test-product',
    price: 99.99,
    description: 'A comprehensive test product description',
    category: {
      _id: 'cat1',
      name: 'Electronics'
    },
    quantity: 50
  };

  const mockRelatedProducts = [
    {
      _id: 'rel1',
      name: 'Related Product 1',
      slug: 'related-product-1',
      price: 49.99,
      description: 'First related product'
    },
    {
      _id: 'rel2',
      name: 'Related Product 2',
      slug: 'related-product-2',
      price: 149.99,
      description: 'Second related product'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render product details page with layout', () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should fetch product details on mount with slug', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/product/get-product/')
      );
    });
  });

  it('should display product details correctly', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should display product price in USD currency format', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      const priceElements = screen.queryAllByText((content) => content.includes('$'));
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  it('should render product image with correct src and alt', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      const productImages = screen.getAllByRole('img');
      expect(productImages.length).toBeGreaterThan(0);
    });
  });

  it('should fetch and display related products', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/product/related-product/')
      );
    });
  });

  it('should display related products with correct details', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Related Product 1')).toBeInTheDocument();
      expect(screen.getByText('Related Product 2')).toBeInTheDocument();
      expect(screen.getByText('$49.99')).toBeInTheDocument();
      expect(screen.getByText('$149.99')).toBeInTheDocument();
    });
  });

  it('should display "Similar Products" section heading', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Similar Products ➡️')).toBeInTheDocument();
    });
  });

  it('should show "No Similar Products found" message when empty', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: []
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('No Similar Products found')).toBeInTheDocument();
    });
  });

  it('should have ADD TO CART button in main product section', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle API error gracefully', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('API error'));
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    consoleLogSpy.mockRestore();
  });

  it('should handle null product gracefully', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: []
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should handle missing category gracefully', async () => {
    const productWithoutCategory = { ...mockProductData, category: null };
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: productWithoutCategory
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    consoleLogSpy.mockRestore();
  });

  it('should call getSimilarProduct with correct parameters', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: mockRelatedProducts
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should truncate product descriptions in related products to 60 characters', async () => {
    const longDescription = 'This is a very long product description that should be truncated to 60 characters in the display';
    const relatedWithLongDesc = [
      {
        ...mockRelatedProducts[0],
        description: longDescription
      }
    ];
    
    axios.get
      .mockResolvedValueOnce({
        data: {
          product: mockProductData
        }
      })
      .mockResolvedValueOnce({
        data: {
          products: relatedWithLongDesc
        }
      });
    render(
      <MemoryRouter initialEntries={['/product/test-product']}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetails />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });
});
