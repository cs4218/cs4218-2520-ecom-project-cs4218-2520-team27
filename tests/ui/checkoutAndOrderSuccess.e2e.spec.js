import { test, expect } from '@playwright/test';

const createUser = () => {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    name: `UI Test User ${uniqueId}`,
    email: `ui.user.${uniqueId}@example.com`,
    password: 'Password123!',
    phone: '91234567',
    address: '123 Testing Street',
    dob: '2000-01-01',
    answer: 'football',
  };
};

async function registerNewUser(page, user) {
  await page.goto('/register');
  await page.getByPlaceholder('Enter Your Name').fill(user.name);
  await page.getByPlaceholder('Enter Your Email ').fill(user.email);
  await page.getByPlaceholder('Enter Your Password').fill(user.password);
  await page.getByPlaceholder('Enter Your Phone').fill(user.phone);
  await page.getByPlaceholder('Enter Your Address').fill(user.address);
  await page.locator('#exampleInputDOB1').fill(user.dob);
  await page.getByPlaceholder('What is Your Favorite sports').fill(user.answer);
  await page.getByRole('button', { name: 'REGISTER' }).click();
}

async function login(page, email, password) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter Your Email ').fill(email);
  await page.getByPlaceholder('Enter Your Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await expect(page.getByRole('button', { name: /UI Test User/i })).toBeVisible({ timeout: 15000 });
}

async function addItemToCart(page) {
  await page.goto('/');
  await page.waitForSelector('.card');
  await page.locator('.card button').filter({ hasText: 'ADD TO CART' }).first().click();
  await expect(page.getByText('Item Added to cart')).toBeVisible();
}

async function openCart(page) {
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole('heading', { name: 'Cart Summary' })).toBeVisible();
}

test.describe('UI: Checkout and Order Success', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  // Kim Hofmann, A0337805Y
  test('successful payment sends checkout payload, redirects to orders, shows latest order details, and clears cart', async ({ page }) => {
    test.setTimeout(90000);
    const user = createUser();
    let paymentRequestBody;

    await registerNewUser(page, user);
    await login(page, user.email, user.password);
    await addItemToCart(page);
    await openCart(page);

    const mockedOrders = [
      {
        _id: `ORD-${Date.now()}-NEW`,
        status: 'Processing',
        createAt: new Date().toISOString(),
        payment: { success: true },
        buyer: { name: user.name },
        products: [
          {
            _id: 'mock-product-1',
            name: 'Mock Checkout Product',
            description: 'Mock product created for e2e checkout flow assertions',
            price: 149.99,
          },
        ],
      },
      {
        _id: 'ORD-OLDER-001',
        status: 'Shipped',
        createAt: new Date(Date.now() - 86400000).toISOString(),
        payment: { success: true },
        buyer: { name: user.name },
        products: [
          {
            _id: 'mock-product-2',
            name: 'Older Product',
            description: 'Older order to verify newest order appears on top',
            price: 89.9,
          },
        ],
      },
    ];

    await page.route('**/api/v1/auth/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockedOrders),
      });
    });

    await expect(page.locator('.braintree-dropin')).toBeVisible({ timeout: 15000 });

    await page.route('**/api/v1/product/braintree/payment', async (route) => {
      paymentRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, total: 173.49 }),
      });
    });

    const makePaymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await expect(makePaymentBtn).toBeEnabled();

    const paymentResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/product/braintree/payment') &&
        res.request().method() === 'POST' &&
        res.status() === 200
    );

    const ordersResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/v1/auth/orders') && res.status() === 200
    );

    await makePaymentBtn.click();
    await paymentResponsePromise;
    await ordersResponsePromise;

    expect(paymentRequestBody).toBeTruthy();
    expect(paymentRequestBody.nonce).toBeTruthy();
    expect(Array.isArray(paymentRequestBody.cart)).toBe(true);
    expect(paymentRequestBody.cart.length).toBeGreaterThan(0);

    await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);
    await expect(page.getByRole('heading', { name: 'All Orders' })).toBeVisible();

    const firstOrderRow = page.locator('table tbody tr').first();
    await expect(firstOrderRow).toContainText('1');
    await expect(firstOrderRow).toContainText('Processing');
    await expect(firstOrderRow).toContainText('Success');
    await expect(firstOrderRow).toContainText('1');

    await expect(page.locator('table tbody tr').nth(1)).toContainText('Shipped');

    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Cart' })).toContainText('Cart');
    await expect(page.locator('.ant-scroll-number-only-unit').first()).toHaveText('0');

    const cartInStorage = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cartInStorage).toBeNull();
  });

  // Kim Hofmann, A0337805Y
  test('failed payment keeps user on checkout and retains cart contents', async ({ page }) => {
    test.setTimeout(90000);
    const user = createUser();

    await registerNewUser(page, user);
    await login(page, user.email, user.password);
    await addItemToCart(page);
    await openCart(page);

    const preFailureCartSnapshot = await page.evaluate(() => localStorage.getItem('cart'));
    expect(preFailureCartSnapshot).toBeTruthy();

    await page.route('**/api/v1/auth/orders', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/product/braintree/payment', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment declined by gateway' }),
      });
    });

    const makePaymentBtn = page.getByRole('button', { name: 'Make Payment' });
    await expect(page.locator('.braintree-dropin')).toBeVisible({ timeout: 15000 });
    await expect(makePaymentBtn).toBeEnabled();

    const failedPaymentResponsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/v1/product/braintree/payment') &&
        res.request().method() === 'POST' &&
        res.status() === 500
    );

    await makePaymentBtn.click();
    await failedPaymentResponsePromise;

    await expect(page).toHaveURL(/\/cart$/);
    await expect(makePaymentBtn).toBeEnabled();

    const cartAfterFailure = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cartAfterFailure).toBe(preFailureCartSnapshot);

    await expect(page.locator('.ant-scroll-number-only-unit').first()).not.toHaveText('0');

    await expect(page.getByRole('heading', { name: 'Cart Summary' })).toBeVisible();
  });
});
