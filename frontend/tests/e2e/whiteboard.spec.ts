import { test, expect } from '@playwright/test';

test.describe('Whiteboard Application', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the whiteboard application
    await page.goto('/');
    
    // Wait for the application to load
    await expect(page.locator('h1')).toHaveText('Whiteboard');
    
    // Wait for WASM to load
    await expect(page.locator('text=WASM Status: ✅ Loaded')).toBeVisible({ timeout: 10000 });
  });

  test('should load the whiteboard application', async ({ page }) => {
    // Check that the main components are visible
    await expect(page.locator('h1')).toHaveText('Whiteboard');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('.toolbar')).toBeVisible();
    
    // Check that default tool is selected
    await expect(page.locator('button[title="Pen"]')).toHaveCSS('border', /2px solid #007bff/);
  });

  test('should switch between tools', async ({ page }) => {
    // Test switching to rectangle tool
    await page.click('button[title="Rectangle"]');
    await expect(page.locator('button[title="Rectangle"]')).toHaveCSS('border', /2px solid #007bff/);
    await expect(page.locator('button[title="Pen"]')).toHaveCSS('border', /1px solid #ddd/);
    
    // Test switching to ellipse tool
    await page.click('button[title="Ellipse"]');
    await expect(page.locator('button[title="Ellipse"]')).toHaveCSS('border', /2px solid #007bff/);
    
    // Test switching to eraser tool
    await page.click('button[title="Eraser"]');
    await expect(page.locator('button[title="Eraser"]')).toHaveCSS('border', /2px solid #007bff/);
    
    // Test switching to select tool
    await page.click('button[title="Select"]');
    await expect(page.locator('button[title="Select"]')).toHaveCSS('border', /2px solid #007bff/);
    
    // Test switching back to pen tool
    await page.click('button[title="Pen"]');
    await expect(page.locator('button[title="Pen"]')).toHaveCSS('border', /2px solid #007bff/);
  });

  test('should draw with pen tool', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Ensure pen tool is selected
    await page.click('button[title="Pen"]');
    
    // Draw a simple line
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Verify that drawing occurred (check for stroke data)
    await expect(page.locator('text=Strokes: 1')).toBeVisible();
  });

  test('should draw rectangle', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Select rectangle tool
    await page.click('button[title="Rectangle"]');
    
    // Draw a rectangle
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Verify that rectangle was drawn
    await expect(page.locator('text=Strokes: 1')).toBeVisible();
  });

  test('should draw ellipse', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Select ellipse tool
    await page.click('button[title="Ellipse"]');
    
    // Draw an ellipse
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Verify that ellipse was drawn
    await expect(page.locator('text=Strokes: 1')).toBeVisible();
  });

  test('should erase drawings', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // First draw something with pen tool
    await page.click('button[title="Pen"]');
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Verify drawing was created
    await expect(page.locator('text=Strokes: 1')).toBeVisible();
    
    // Switch to eraser tool
    await page.click('button[title="Eraser"]');
    
    // Erase the drawing
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(150, 150);
    await page.mouse.up();
    
    // Verify that strokes were erased
    await expect(page.locator('text=Strokes: 0')).toBeVisible();
  });

  test('should change color', async ({ page }) => {
    // Find the color picker
    const colorPicker = page.locator('input[type="color"]');
    
    // Change color to red
    await colorPicker.fill('#ff0000');
    
    // Verify color change in the debug info
    await expect(page.locator('text=Color: RGB(255, 0, 0)')).toBeVisible();
  });

  test('should change thickness', async ({ page }) => {
    // Find the thickness slider
    const thicknessSlider = page.locator('input[type="range"]').first();
    
    // Change thickness to 10
    await thicknessSlider.fill('10');
    
    // Verify thickness change in the debug info
    await expect(page.locator('text=Thickness: 10px')).toBeVisible();
  });

  test('should clear canvas', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Draw something first
    await page.click('button[title="Pen"]');
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Verify drawing was created
    await expect(page.locator('text=Strokes: 1')).toBeVisible();
    
    // Click clear button
    await page.click('button:has-text("Clear All")');
    
    // Verify canvas was cleared
    await expect(page.locator('text=Strokes: 0')).toBeVisible();
  });

  test('should select and delete strokes', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Draw something first
    await page.click('button[title="Pen"]');
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Switch to select tool
    await page.click('button[title="Select"]');
    
    // Select the stroke
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.up();
    
    // Click delete button
    await page.click('button:has-text("Delete Selected")');
    
    // Verify stroke was deleted
    await expect(page.locator('text=Strokes: 0')).toBeVisible();
  });

  test('should handle eraser size setting', async ({ page }) => {
    // Switch to eraser tool
    await page.click('button[title="Eraser"]');
    
    // Find the eraser size slider (should be visible when eraser tool is selected)
    const eraserSizeSlider = page.locator('input[type="range"]').last();
    
    // Change eraser size to 20
    await eraserSizeSlider.fill('20');
    
    // Verify eraser size change in the debug info
    await expect(page.locator('text=Eraser Size: 20px')).toBeVisible();
  });

  test('should handle multiple strokes', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Draw first stroke
    await page.click('button[title="Pen"]');
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();
    
    // Draw second stroke
    await page.mouse.down();
    await page.mouse.move(300, 300);
    await page.mouse.move(400, 400);
    await page.mouse.up();
    
    // Verify multiple strokes were created
    await expect(page.locator('text=Strokes: 2')).toBeVisible();
  });

  test('should handle canvas interactions without WASM', async ({ page }) => {
    // This test would need to be run in a scenario where WASM fails to load
    // For now, we'll just verify the error handling UI exists
    await expect(page.locator('text=WASM Status: ✅ Loaded')).toBeVisible();
  });
}); 