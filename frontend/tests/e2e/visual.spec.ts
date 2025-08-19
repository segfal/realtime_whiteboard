import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=WASM Status: ✅ Loaded")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should match initial state screenshot", async ({ page }) => {
    // Take screenshot of the initial state
    await expect(page).toHaveScreenshot("initial-state.png");
  });

  test("should match toolbar screenshot", async ({ page }) => {
    // Focus on the toolbar area
    const toolbar = page.locator(".toolbar");
    await expect(toolbar).toHaveScreenshot("toolbar.png");
  });

  test("should match canvas screenshot after drawing", async ({ page }) => {
    const canvas = page.locator("canvas");

    // Draw something
    await page.click('button[title="Pen"]');
    await canvas.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.up();

    // Take screenshot of canvas with drawing
    await expect(canvas).toHaveScreenshot("canvas-with-drawing.png");
  });

  test("should match different tool states", async ({ page }) => {
    // Test rectangle tool
    await page.click('button[title="Rectangle"]');
    await expect(page.locator(".toolbar")).toHaveScreenshot(
      "toolbar-rectangle-selected.png",
    );

    // Test eraser tool
    await page.click('button[title="Eraser"]');
    await expect(page.locator(".toolbar")).toHaveScreenshot(
      "toolbar-eraser-selected.png",
    );
  });
});
