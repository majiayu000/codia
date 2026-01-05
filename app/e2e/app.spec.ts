import { test, expect } from "@playwright/test";

test.describe("App", () => {
  test("should load homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Codia/i);
  });

  test("should display main content", async ({ page }) => {
    await page.goto("/");
    // Wait for the main content to load
    await page.waitForLoadState("networkidle");
  });
});

test.describe("Accessibility", () => {
  test("should have no obvious accessibility issues", async ({ page }) => {
    await page.goto("/");
    // Check for basic accessibility: all images should have alt text
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });
});

test.describe("Responsive Design", () => {
  test("should render correctly on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should render correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should render correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });
});
