import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Products from './Products';

// Mock axios
jest.mock('axios');
jest.mock('react-hot-toast');

// Mock hooks
jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ token: 'mock-token', user: { role: 1 } }, jest.fn()])
}));

jest.mock('../../context/cart', () => ({
  useCart: jest.fn(() => [null, jest.fn()])
}));

jest.mock('../../context/search', () => ({
  useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()])
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

const mockProducts = [
  {
    _id: 'product1',
    name: 'Test Product 1',
    slug: 'test-product-1',
    description: 'This is the first test product description',
    price: 99.99,
    category: { _id: 'cat1', name: 'Category 1' },
    quantity: 10
  },
  {
    _id: 'product2',
    name: 'Test Product 2',
    slug: 'test-product-2',
    description: 'This is the second test product description',
    price: 149.99,
    category: { _id: 'cat2', name: 'Category 2' },
    quantity: 5
  },
  {
    _id: 'product3',
    name: 'Test Product 3',
    slug: 'test-product-3',
    description: 'This is the third test product description',
    price: 199.99,
    category: { _id: 'cat1', name: 'Category 1' },
    quantity: 15
  }
];

const renderProducts = () => {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/products']}>
      <Routes>
        <Route path="/dashboard/admin/products" element={<Products />} />
        <Route path="/dashboard/admin/product/:slug" element={<div>Update Product Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Admin Products Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders products page with title', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: [] } });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('All Products List')).toBeInTheDocument();
    });
  });

  it('fetches and displays products on load', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Product 1')).toBeInTheDocument();
      expect(screen.getByText('Test Product 2')).toBeInTheDocument();
      expect(screen.getByText('Test Product 3')).toBeInTheDocument();
    });
  });

  it('displays product descriptions', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('This is the first test product description')).toBeInTheDocument();
      expect(screen.getByText('This is the second test product description')).toBeInTheDocument();
      expect(screen.getByText('This is the third test product description')).toBeInTheDocument();
    });
  });

  it('renders product images with correct src', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);
      expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
      expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/product2');
      expect(images[2]).toHaveAttribute('src', '/api/v1/product/product-photo/product3');
    });
  });

  it('renders product images with correct alt text', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('alt', 'Test Product 1');
      expect(images[1]).toHaveAttribute('alt', 'Test Product 2');
      expect(images[2]).toHaveAttribute('alt', 'Test Product 3');
    });
  });

  it('renders links to update product pages', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const productLinks = links.filter(link => 
        link.getAttribute('href')?.includes('/dashboard/admin/product/')
      );
      expect(productLinks.length).toBe(3);
      expect(productLinks[0]).toHaveAttribute('href', '/dashboard/admin/product/test-product-1');
      expect(productLinks[1]).toHaveAttribute('href', '/dashboard/admin/product/test-product-2');
      expect(productLinks[2]).toHaveAttribute('href', '/dashboard/admin/product/test-product-3');
    });
  });

  it('handles empty products list', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: [] } });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('All Products List')).toBeInTheDocument();
    });

    expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument();
  });

  it('handles API error gracefully and shows toast', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    renderProducts();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Someething Went Wrong');
    });

    // Component should still render without crashing
    expect(screen.getByText('All Products List')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('handles null products response', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: null } });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('All Products List')).toBeInTheDocument();
    });
  });

  it('handles undefined products response', async () => {
    axios.get.mockResolvedValueOnce({ data: {} });

    renderProducts();

    await waitFor(() => {
      expect(screen.getByText('All Products List')).toBeInTheDocument();
    });
  });

  it('renders AdminMenu component', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    renderProducts();

    await waitFor(() => {
      // AdminMenu should be rendered (check for admin panel text)
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  it('renders product cards with correct styling', async () => {
    axios.get.mockResolvedValueOnce({ data: { products: mockProducts } });

    const { container } = renderProducts();

    await waitFor(() => {
      const cards = container.querySelectorAll('.card');
      expect(cards.length).toBe(3);
    });
  });
});
