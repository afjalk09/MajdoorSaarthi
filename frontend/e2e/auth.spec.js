import { test, expect } from '@playwright/test';

const stamp = () => Date.now().toString(36) + Math.floor(Math.random() * 1000000);
const email = (prefix) => `${prefix}-${stamp()}@e2e.test`;
const phone = () => `+91${Date.now()}`;

test.describe('Landing page CTAs', () => {
  test('landing "Register as Worker" opens the registration page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /register as a worker/i }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('landing header Login button opens the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByText('Dashboard', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });
});

test.describe('Registration', () => {
  test('worker registration lands on the worker dashboard', async ({ page }) => {
    const mail = email('worker');
    await page.goto('/register');
    await page.getByRole('button', { name: 'Find Work' }).click();
    await page.getByLabel('Email', { exact: true }).fill(mail);
    await page.getByLabel('Phone', { exact: true }).fill(phone());
    await page.getByLabel('Password', { exact: true }).fill('Test@12345');
    await page.getByLabel('Confirm Password').fill('Test@12345');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Available Jobs' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'My Applications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('employer registration lands on the employer dashboard', async ({ page }) => {
    const mail = email('employer');
    await page.goto('/register');
    await page.getByRole('button', { name: 'Hire Workers' }).click();
    await page.getByLabel('Email', { exact: true }).fill(mail);
    await page.getByLabel('Phone', { exact: true }).fill(phone());
    await page.getByLabel('Password', { exact: true }).fill('Test@12345');
    await page.getByLabel('Confirm Password').fill('Test@12345');
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('button', { name: 'My Jobs' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Create Job' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });
});

test.describe('Login', () => {
  test('worker can log out and log back in', async ({ page }) => {
    const mail = email('login');
    await page.goto('/register');
    await page.getByLabel('Email', { exact: true }).fill(mail);
    await page.getByLabel('Phone', { exact: true }).fill(phone());
    await page.getByLabel('Password', { exact: true }).fill('Test@12345');
    await page.getByLabel('Confirm Password').fill('Test@12345');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Available Jobs' })).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('Email', { exact: true }).fill(mail);
    await page.getByLabel('Password', { exact: true }).fill('Test@12345');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
    await expect(page.getByRole('heading', { name: 'Available Jobs' })).toBeVisible({ timeout: 20000 });
  });

  test('login with wrong password shows an error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(email('nobody'));
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Route protection', () => {
  test('unauthenticated visit to /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});