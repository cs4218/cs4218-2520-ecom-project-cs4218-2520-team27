import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import CreateProduct from './CreateProduct';

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

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const renderCreateProduct = () => {
  return render(
    <MemoryRouter initialEntries={['/dashboard/admin/create-product']}>
      <Routes>
        <Route path="/dashboard/admin/create-product" element={<CreateProduct />} />
        <Route path="/dashboard/admin/products" element={<div>Products Page</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CreateProduct Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders create product page with title', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Product' })).toBeInTheDocument();
    });
  });

  it('fetches and displays categories on load', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/category/get-category');
    });
  });

  it('renders all form inputs', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('write a description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('write a Price')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('write a quantity')).toBeInTheDocument();
    });
  });

  it('renders upload photo button', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });
  });

  it('renders create product button', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('CREATE PRODUCT')).toBeInTheDocument();
    });
  });

  it('allows typing in name input', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText('write a name');
      fireEvent.change(nameInput, { target: { value: 'Test Product' } });
      expect(nameInput.value).toBe('Test Product');
    });
  });

  it('allows typing in description input', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      const descInput = screen.getByPlaceholderText('write a description');
      fireEvent.change(descInput, { target: { value: 'Test Description' } });
      expect(descInput.value).toBe('Test Description');
    });
  });

  it('allows typing in price input', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      const priceInput = screen.getByPlaceholderText('write a Price');
      fireEvent.change(priceInput, { target: { value: '99.99' } });
      expect(priceInput.value).toBe('99.99');
    });
  });

  it('allows typing in quantity input', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      const quantityInput = screen.getByPlaceholderText('write a quantity');
      fireEvent.change(quantityInput, { target: { value: '10' } });
      expect(quantityInput.value).toBe('10');
    });
  });

  it('handles category fetch error', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    renderCreateProduct();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Something wwent wrong in getting catgeory');
    });

    consoleSpy.mockRestore();
  });

  it('submits form and creates product successfully', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
    axios.post.mockResolvedValueOnce({ data: { success: false, message: 'Product Created' } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('write a name'), { target: { value: 'New Product' } });
    fireEvent.change(screen.getByPlaceholderText('write a description'), { target: { value: 'Product Description' } });
    fireEvent.change(screen.getByPlaceholderText('write a Price'), { target: { value: '49.99' } });
    fireEvent.change(screen.getByPlaceholderText('write a quantity'), { target: { value: '5' } });

    // Submit
    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/create-product',
        expect.any(FormData)
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Product Created Successfully');
    });
  });

  it('calls axios.post when create product button is clicked', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });
    axios.post.mockResolvedValueOnce({ data: { success: false } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('write a name')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('CREATE PRODUCT'));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/create-product',
        expect.any(FormData)
      );
    });

    consoleSpy.mockRestore();
  });

  it('displays photo preview when photo is selected', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    const { container } = renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    const file = new File(['test'], 'test.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByAltText('product_photo');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'mock-url');
    });
  });

  it('displays photo name when photo is selected', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    const { container } = renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Upload Photo')).toBeInTheDocument();
    });

    const file = new File(['test'], 'test-image.png', { type: 'image/png' });
    const input = container.querySelector('input[type="file"]');
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test-image.png')).toBeInTheDocument();
    });
  });

  it('renders AdminMenu component', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });

  it('renders category select dropdown', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Select a category')).toBeInTheDocument();
    });
  });

  it('renders shipping select dropdown', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: mockCategories } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByText('Select Shipping')).toBeInTheDocument();
    });
  });

  it('handles empty category response', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, category: [] } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Product' })).toBeInTheDocument();
    });
  });

  it('handles unsuccessful category response', async () => {
    axios.get.mockResolvedValueOnce({ data: { success: false, category: [] } });

    renderCreateProduct();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Product' })).toBeInTheDocument();
    });
  });
});
