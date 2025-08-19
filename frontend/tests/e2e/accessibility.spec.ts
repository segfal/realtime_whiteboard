import { test, expect } from "@playwright/test";

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=WASM Status: ✅ Loaded")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should have proper heading structure", async ({ page }) => {
    // Check for main heading
    await expect(page.locator("h1")).toHaveText("Whiteboard");
  });

  test("should have proper button labels", async ({ page }) => {
    // Check that all toolbar buttons have proper titles
    const tools = ["Pen", "Rectangle", "Ellipse", "Eraser", "Select"];

    for (const tool of tools) {
      await expect(page.locator(`button[title="${tool}"]`)).toBeVisible();
    }
  });

  test("should have proper form labels", async ({ page }) => {
    // Check that form controls have proper labels
    await expect(page.locator('label:has-text("Color:")')).toBeVisible();
    await expect(page.locator('label:has-text("Thickness:")')).toBeVisible();
  });

  test("should be keyboard navigable", async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press("Tab");

    // Focus should move to the first interactive element
    await expect(page.locator('button[title="Pen"]')).toBeFocused();

    // Continue tabbing through elements
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to activate buttons with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('button[title="Pen"]')).toHaveCSS(
      "border",
      /2px solid #007bff/,
    );
  });
});
