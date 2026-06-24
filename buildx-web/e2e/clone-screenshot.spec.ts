import { test } from "@playwright/test";

test("screenshot clone dialog", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://localhost:5199/demo/~files");
  await page.waitForLoadState("networkidle");

  // Click the Clone button
  const cloneBtn = page.locator(".blob-operations a:has-text('Clone')");
  await cloneBtn.click();
  await page.waitForTimeout(500);

  // Screenshot the dialog
  await page.screenshot({ path: "/tmp/clone-dialog.png", fullPage: true });

  // Log dimensions
  const dropdown = page.locator(".floating.dropdown-menu.show");
  if (await dropdown.isVisible()) {
    const box = await dropdown.boundingBox();
    console.log("Dropdown box:", JSON.stringify(box));
  }
  const cloneDialog = page.locator(".clone-dialog");
  if (await cloneDialog.isVisible()) {
    const box = await cloneDialog.boundingBox();
    console.log("CloneDialog box:", JSON.stringify(box));
    const computed = await cloneDialog.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.width, minWidth: s.minWidth, maxWidth: s.maxWidth };
    });
    console.log("CloneDialog computed:", JSON.stringify(computed));
  }
});
