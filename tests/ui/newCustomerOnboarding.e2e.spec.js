import { test, expect } from '@playwright/test';

const createUser = () => {
  const uniqueId = Date.now();
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
  await page.goto('http://localhost:3000/register');
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
  await page.goto('http://localhost:3000/login');
  await page.getByPlaceholder('Enter Your Email ').fill(email);
  await page.getByPlaceholder('Enter Your Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
}

async function openUserDashboardFromHeader(page, name) {
  await expect(page.getByRole('button', { name })).toBeVisible();
  await page.getByRole('button', { name }).click();
  await page.getByRole('link', { name: 'Dashboard' }).click();
}

test.describe('UI: New User Can Onboard and Access Personalized Shopping Features', () => {
  test('AC1 + AC6: registers a new account and sees success feedback', async ({ page }) => {
    const user = createUser();

    await registerNewUser(page, user);

    await expect(page.getByText('Register Successfully, please login')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('AC2 + AC3: signs in with the newly created account and reaches account area', async ({ page }) => {
    const user = createUser();

    await registerNewUser(page, user);
    await login(page, user.email, user.password);

    await expect(page.getByRole('button', { name: user.name })).toBeVisible();
    await openUserDashboardFromHeader(page, user.name);
    await expect(page).toHaveURL(/\/dashboard\/user$/);
    await expect(page.getByRole('heading', { name: user.name })).toBeVisible();
    await expect(page.getByRole('heading', { name: user.email })).toBeVisible();
  });

  test('AC4: accesses account-only pages after sign-in (profile and orders)', async ({ page }) => {
    const user = createUser();

    await registerNewUser(page, user);
    await login(page, user.email, user.password);
    await openUserDashboardFromHeader(page, user.name);

    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);
    await expect(page.getByRole('heading', { name: 'USER PROFILE' })).toBeVisible();

    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);
  });

  test('AC5: blocks or redirects unauthenticated access to account-only pages', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/user/profile');

    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('AC6: shows clear failure feedback for invalid login credentials', async ({ page }) => {
    const user = createUser();

    await registerNewUser(page, user);
    await login(page, user.email, 'WrongPass123!');

    await expect(page.getByText('Something went wrong')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
