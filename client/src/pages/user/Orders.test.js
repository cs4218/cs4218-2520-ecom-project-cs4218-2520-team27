import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import Orders from './Orders';

// Lai Xue Le Shaun, A0252643H

// Mock axios
jest.mock('axios');

// Mock Layout to just render children
jest.mock('../../components/Layout', () => {
  const React = require('react');
  return ({ children }) => React.createElement('div', null, children);
});

// Mock UserMenu
jest.mock('../../components/UserMenu', () => {
  const React = require('react');
  return () => React.createElement('div', null, 'UserMenu');
});

// Mock moment
jest.mock('moment', () => () => ({
  fromNow: () => 'a few seconds ago'
}));

// Mock hooks
jest.mock('../../hooks/useCategory', () => jest.fn(() => []));

jest.mock('../../context/auth', () => ({
  useAuth: jest.fn(() => [{ token: 'mock-token' }, jest.fn()])
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

const mockOrders = [
  {
    _id: 'order1',
    status: 'Processing',
    buyer: { name: 'John Doe' },
    createAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      {
        _id: 'product1',
        name: 'Test Product 1',
        description: 'This is a test product description',
        price: 99.99
      },
      {
        _id: 'product2',
        name: 'Test Product 2',
        description: 'Another test product description here',
        price: 149.99
      }
    ]
  },
  {
    _id: 'order2',
    status: 'Shipped',
    buyer: { name: 'Jane Doe' },
    createAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    payment: { success: false },
    products: [
      {
        _id: 'product3',
        name: 'Test Product 3',
        description: 'Third test product description',
        price: 199.99
      }
    ]
  }
];

const renderOrders = () => {
  return render(
    <MemoryRouter initialEntries={['/dashboard/user/orders']}>
      <Routes>
        <Route path="/dashboard/user/orders" element={<Orders />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Orders Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders orders page with title', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderOrders();

    await waitFor(() => {
      expect(screen.getByText('All Orders')).toBeInTheDocument();
    });
  });

  it('fetches and displays orders on load', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v1/auth/orders');
    });

    await screen.findByText('Processing');
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
  });

  it('displays buyer names correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await screen.findByText('John Doe');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays payment status correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await screen.findByText('Success');
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('displays product count for each order', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await waitFor(() => {
      // Check that orders are rendered with correct quantities via table cells
      const cells = screen.getAllByRole('cell');
      // First order has 2 products (6th cell in first row)
      // Second order has 1 product (6th cell in second row)
      const quantityCells = cells.filter(cell => 
        cell.textContent === '2' || cell.textContent === '1'
      );
      expect(quantityCells.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('displays product details including name, description, and price', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await screen.findByText('Test Product 1');
    expect(screen.getByText('Test Product 1')).toBeInTheDocument();
    expect(screen.getByText('Test Product 2')).toBeInTheDocument();
    expect(screen.getByText('Test Product 3')).toBeInTheDocument();

    // Check prices
    expect(screen.getByText('Price : 99.99')).toBeInTheDocument();
    expect(screen.getByText('Price : 149.99')).toBeInTheDocument();
    expect(screen.getByText('Price : 199.99')).toBeInTheDocument();
  });

  it('displays truncated product descriptions', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await waitFor(() => {
      const truncatedDescriptions = screen.getAllByText('This is a test product descrip');
      expect(truncatedDescriptions.length).toBeGreaterThan(0);
    });
  });

  it('renders product images with correct src', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    const images = await screen.findAllByRole('img');
    expect(images.length).toBe(3);
    expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/product1');
    expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/product2');
    expect(images[2]).toHaveAttribute('src', '/api/v1/product/product-photo/product3');
  });

  it('handles empty orders list', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });

    renderOrders();

    await waitFor(() => {
      expect(screen.getByText('All Orders')).toBeInTheDocument();
    });

    // No order status should be shown
    expect(screen.queryByText('Processing')).not.toBeInTheDocument();
    expect(screen.queryByText('Shipped')).not.toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error('Network Error'));

    renderOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Component should still render without crashing
    expect(screen.getByText('All Orders')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('does not fetch orders when auth token is missing', async () => {
    // Re-mock useAuth to return null token
    const authMock = require('../../context/auth');
    authMock.useAuth.mockReturnValueOnce([{ token: null }, jest.fn()]);

    renderOrders();

    // axios.get should not be called when there's no token
    await waitFor(() => {
      expect(axios.get).not.toHaveBeenCalled();
    });
  });

  it('displays order numbers correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    await waitFor(() => {
      // Order numbers should start from 1
      const cells = screen.getAllByRole('cell');
      // First order number (first td in first row)
      expect(cells[0].textContent).toBe('1');
    });
  });

  it('renders table headers correctly', async () => {
    axios.get.mockResolvedValueOnce({ data: mockOrders });

    renderOrders();

    // Wait for orders to load (indicated by status appearing)
    await screen.findByText('Processing');
    expect(screen.getAllByText('#').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Buyer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Quantity').length).toBeGreaterThan(0);
  });
});
