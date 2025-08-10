import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=WASM Status: ✅ Loaded')).toBeVisible({ timeout: 10000 });
  });

  test('should load application within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to the page
    await page.goto('/');
    
    // Wait for WASM to load
    await expect(page.locator('text=WASM Status: ✅ Loaded')).toBeVisible({ timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Assert that the application loads within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should handle rapid tool switching', async ({ page }) => {
    const tools = ['Pen', 'Rectangle', 'Ellipse', 'Eraser', 'Select'];
    
    // Rapidly switch between tools
    for (let i = 0; i < 10; i++) {
      const tool = tools[i % tools.length];
      await page.click(`button[title="${tool}"]`);
      await expect(page.locator(`button[title="${tool}"]`)).toHaveCSS('border', /2px solid #007bff/);
    }
  });

  test('should handle rapid drawing operations', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Perform rapid drawing operations
    for (let i = 0; i < 5; i++) {
      await canvas.hover();
      await page.mouse.down();
      await page.mouse.move(100 + i * 20, 100 + i * 20);
      await page.mouse.move(200 + i * 20, 200 + i * 20);
      await page.mouse.up();
    }
    
    // Verify that strokes were created
    await expect(page.locator('text=Strokes: 5')).toBeVisible();
  });
}); 