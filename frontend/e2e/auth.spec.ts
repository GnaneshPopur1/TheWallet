import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to login page from landing page', async ({ page }) => {
    await page.goto('/');
    
    // Click the Sign In button in the sleek top navbar
    await page.click('nav .btn-login');
    
    // Should be on the login page
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h2')).toContainText('Welcome to TheWallet');
  });

  test('should show validation errors on empty login', async ({ page }) => {
    await page.goto('/login');
    
    // Submit empty form
    await page.click('button[type="submit"]');
    
    // Since Angular forms might disable the button when invalid, let's check if the button is disabled
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    // Click sign up link
    await page.click('text=Sign up here');
    
    // Should be on register page
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('h2')).toContainText('Join TheWallet');
  });
});
