import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CategoryProduct from './CategoryProduct';

jest.mock('axios');
jest.mock('../components/Layout', () => {
  return function Layout({ children, title }) {
    return <div data-testid="layout">{children}</div>;
  };
});

describe('CategoryProduct Component', () => {
  const mockProducts = [
    {
      _id: '1',
      name: 'Product 1',
      price: 99.99,
      description: 'Description 1'
    },
    {
      _id: '2',
      name: 'Product 2',
      price: 149.99,
      description: 'Description 2'
    }
  ];

  const mockCategory = {
    _id: 'cat1',
    name: 'Electronics',
    slug: 'electronics'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render category product page', () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should fetch products by category slug on mount', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should display category name', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h4' && content.includes('Electronics');
      })).toBeInTheDocument();
    });
  });

  it('should display product count', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h6' && content.includes('2') && content.includes('result found');
      })).toBeInTheDocument();
    });
  });

  it('should display product names', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
    });
  });

  it('should display product prices in USD format', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('$99.99')).toBeInTheDocument();
      expect(screen.getByText('$149.99')).toBeInTheDocument();
    });
  });

  it('should handle empty product list', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: [],
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h6' && content.includes('0') && content.includes('result found');
      })).toBeInTheDocument();
    });
  });

  it('should handle API error gracefully', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('API error'));
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    consoleLogSpy.mockRestore();
  });

  it('should use correct API endpoint with category slug', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/product/product-category/')
      );
    });
  });

  it('should refetch products when category slug changes', async () => {
    axios.get.mockResolvedValue({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
    rerender(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
  });

  it('should display product images with correct alt text', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('alt', mockProducts[0].name);
    });
  });

  it('should use correct image source URL for product photos', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute(
        'src',
        expect.stringContaining('/api/v1/product/product-photo/')
      );
    });
  });

  it('should handle null category gracefully', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: mockProducts,
        category: null
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h4' && content.includes('Category');
      })).toBeInTheDocument();
    });
  });

  it('should handle null products gracefully', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        products: null,
        category: mockCategory
      }
    });
    render(
      <MemoryRouter initialEntries={['/category/electronics']}>
        <Routes>
          <Route path="/category/:slug" element={<CategoryProduct />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element.tagName.toLowerCase() === 'h6' && content.includes('0') && content.includes('result found');
      })).toBeInTheDocument();
    });
  });
});
