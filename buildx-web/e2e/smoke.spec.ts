import { test, expect } from "@playwright/test";

test("global routes render without crash", async ({ page }) => {
  await page.goto("/~projects");
  await expect(page.locator(".LayoutPage")).toBeVisible();
  await page.goto("/~issues");
  await expect(page.locator(".issue-list, .global-list").first()).toBeVisible();
});

test("project blob route renders", async ({ page }) => {
  await page.goto("/demo/~files");
  await expect(page.locator(".project-blob, .folder-view, .text-muted").first()).toBeVisible();
});

test("admin route renders", async ({ page }) => {
  await page.goto("/~administration/users");
  await expect(page.locator("table, .card").first()).toBeVisible();
});
