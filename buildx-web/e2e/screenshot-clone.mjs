import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // Navigate to project files page in mock mode
  await page.goto("http://localhost:5199/demo/~files", { waitUntil: "networkidle" });

  // Click the Clone button to open the dialog
  const cloneButton = page.locator("a:has-text('Clone')").first();
  await cloneButton.click();
  await page.waitForTimeout(500);

  // Take screenshot of the clone dialog area
  await page.screenshot({ path: "/tmp/clone-dialog.png", fullPage: false });
  console.log("Screenshot saved to /tmp/clone-dialog.png");

  // Also get the bounding box of the clone dialog
  const dialog = page.locator(".clone-dialog");
  if (await dialog.isVisible()) {
    const box = await dialog.boundingBox();
    console.log("Clone dialog bounding box:", JSON.stringify(box));
  }

  // Check the dropdown menu width
  const dropdown = page.locator(".floating.dropdown-menu.show");
  if (await dropdown.isVisible()) {
    const box = await dropdown.boundingBox();
    console.log("Dropdown menu bounding box:", JSON.stringify(box));
  }

  await browser.close();
})();
