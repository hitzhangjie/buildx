import { test, expect } from "@playwright/test";

async function signInWithMockAuth(page: import("@playwright/test").Page) {
  await page.goto("/~login");
  await page.locator('input[autocomplete="username"]').fill("admin");
  await page.locator('input[autocomplete="current-password"]').fill("admin");
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("layout routes redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/~projects");
  await expect(page).toHaveURL(/\/~login$/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("global routes render without crash after sign in", async ({ page }) => {
  await signInWithMockAuth(page);
  await page.goto("/~projects");
  await expect(page.locator(".LayoutPage")).toBeVisible();
  await page.goto("/~issues");
  await expect(page.locator(".issue-list, .global-list").first()).toBeVisible();
});

test("project blob route renders after sign in", async ({ page }) => {
  await signInWithMockAuth(page);
  await page.goto("/demo/~files");
  await expect(page.locator(".project-blob, .folder-view, .text-muted").first()).toBeVisible();
});

test("admin route renders after sign in", async ({ page }) => {
  await signInWithMockAuth(page);
  await page.goto("/~administration/users");
  await expect(page.locator("table, .card").first()).toBeVisible();
});
