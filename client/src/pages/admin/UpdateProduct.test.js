import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import UpdateProduct from './UpdateProduct';

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

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

const mockCategories = [
  { _id: 'cat1', name: 'Electronics' },
  { _id: 'cat2', name: 'Clothing' },
  { _id: 'cat3', name: 'Books' }
];

const mockProduct = {
  _id: 'product123',
  name: 'Existing Product',
  slug: 'existing-product',
  description: 'This is an existing product',
  price: 79.99,
  quantity: 20,
  shipping: true,
  category: { _id: 'cat1', name: 'Electronics' }
};

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'existing-product' })
}));

const renderUpdateProduct = () => {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/product/existing-product']}>
      <Routes>
        <Route path="/dashboard/admin/product/:slug" element={<UpdateProduct />} />
        <Route path="/dashboard/admin/products" element={<div>Products Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('UpdateProduct Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders update product page with title', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('Update Product')).toBeInTheDocument();
    });
  });

  it('fetches product data on load', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/existing-product');
    });
  });

  it('fetches categories on load', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
  });

  it('populates form with existing product data', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('This is an existing product')).toBeInTheDocument();
      expect(screen.getByDisplayValue('79.99')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });
  });

  it('renders update product button', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument();
    });
  });

  it('renders delete product button', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument();
    });
  });

  it('allows editing name input', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Product')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Existing Product');
    fireEvent.change(nameInput, { target: { value: 'Updated Product' } });
    expect(nameInput.value).toBe('Updated Product');
  });

  it('allows editing description input', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByDisplayValue('This is an existing product')).toBeInTheDocument();
    });

    const descInput = screen.getByDisplayValue('This is an existing product');
    fireEvent.change(descInput, { target: { value: 'Updated description' } });
    expect(descInput.value).toBe('Updated description');
  });

  it('allows editing price input', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByDisplayValue('79.99')).toBeInTheDocument();
    });

    const priceInput = screen.getByDisplayValue('79.99');
    fireEvent.change(priceInput, { target: { value: '89.99' } });
    expect(priceInput.value).toBe('89.99');
  });

  it('allows editing quantity input', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    const quantityInput = screen.getByDisplayValue('20');
    fireEvent.change(quantityInput, { target: { value: '25' } });
    expect(quantityInput.value).toBe('25');
  });

  it('submits update form successfully', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });
    axios.put.mockResolvedValueOnce({ data: { success: false, message: 'Product Updated' } });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('UPDATE PRODUCT'));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product Updated Successfully');
    });
  });

  it('calls axios.put when update button is clicked', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });
    axios.put.mockResolvedValueOnce({ data: { success: false } });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('UPDATE PRODUCT')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('UPDATE PRODUCT'));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('handles delete product with confirmation', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });
    axios.delete.mockResolvedValueOnce({ data: { success: true } });
    
    window.prompt = jest.fn(() => 'yes');

    renderUpdateProduct();

    // Wait for product data to be loaded (including the id)
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Product')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DELETE PRODUCT'));

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product DEleted Succfully');
    });
  });

  it('cancels delete when prompt is cancelled', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });
    
    window.prompt = jest.fn(() => null);

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DELETE PRODUCT'));

    await waitFor(() => {
      expect(window.prompt).toHaveBeenCalled();
    });

    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('handles delete error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });
    axios.delete.mockRejectedValueOnce(new Error('Delete failed'));
    
    window.prompt = jest.fn(() => 'yes');

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('DELETE PRODUCT')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('DELETE PRODUCT'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });

    consoleSpy.mockRestore();
  });

  it('handles product fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.reject(new Error('Fetch failed'));
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/existing-product');
    });

    consoleSpy.mockRestore();
  });

  it('handles category fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.reject(new Error('Category fetch failed'));
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something wwent wrong in getting catgeory');
    });

    consoleSpy.mockRestore();
  });

  it('displays existing product photo', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      const img = screen.getByAltText('product_photo');
      expect(img).toBeInTheDocument();
    });
  });

  it('displays new photo preview when photo is selected', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    const { container } = renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    const file = new File(['test'], 'new-photo.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByAltText('product_photo');
      expect(img).toHaveAttribute('src', 'mock-url');
    });
  });

  it('renders AdminMenu component', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    renderUpdateProduct();

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  it('renders category select dropdown', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    const { container } = renderUpdateProduct();

    await waitFor(() => {
      // Category select dropdown should be rendered
      const selects = container.querySelectorAll('.form-select');
      expect(selects.length).toBeGreaterThan(0);
    });
  });

  it('renders shipping options in form', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('get-product/')) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      return Promise.resolve({ data: { success: true, category: mockCategories } });
    });

    const { container } = renderUpdateProduct();

    await waitFor(() => {
      // Multiple form-select elements should exist (category and shipping)
      const selects = container.querySelectorAll('.form-select');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });
});
