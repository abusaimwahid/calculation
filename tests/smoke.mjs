import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:3000";
const username = process.env.APP_USER || "admin";
const password = process.env.APP_PASSWORD || "change-this-password";
const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10_000);

async function accountBalance(name) {
  const response = await page.goto(`${baseURL}/accounts`);
  assert.equal(response?.ok(), true, `accounts page failed: ${await page.locator("body").innerText()}`);
  const card = page.locator(".accountCard", { has: page.locator(`input[name="name"][value="${name}"]`) });
  if (await card.count() === 0) throw new Error(`Account card ${name} not found. Page text: ${await page.locator("body").innerText()}`);
  return Number(await card.locator('input[name="balance"]').inputValue());
}

async function deleteTransaction(note) {
  await page.goto(`${baseURL}/transactions?q=${encodeURIComponent(note)}`);
  const row = page.locator("tbody tr", { hasText: note });
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "Delete" }).click();
  await row.waitFor({ state: "detached" });
}

try {
  await page.goto(`${baseURL}/dashboard`);
  await page.waitForURL(/\/login/);

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/login\?error=1/);
  await page.getByText("Wrong username or password.").waitFor();

  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard/);
  await page.getByRole("heading", { name: "Finance dashboard" }).waitFor();

  const noBodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
  assert.equal(noBodyOverflow, true, "dashboard should not overflow the mobile viewport");
  assert.equal(await page.getByRole("link", { name: "+ Add transaction" }).isVisible(), true);

  const originalDbbl = await accountBalance("DBBL");
  const expenseNote = `smoke-expense-${Date.now()}`;
  await page.goto(`${baseURL}/transactions#new`);
  const quickAdd = page.locator("#new");
  await quickAdd.getByLabel("Type").selectOption("EXPENSE");
  await quickAdd.getByLabel("Amount (BDT)").fill("123.45");
  await quickAdd.getByLabel("Account / from").selectOption({ label: "DBBL" });
  await quickAdd.getByLabel(/Category/).fill("Food");
  await quickAdd.getByLabel("Note").fill(expenseNote);
  await quickAdd.getByRole("button", { name: "Add transaction" }).click();
  await page.waitForURL(/\/transactions$/);
  await page.getByText(expenseNote).waitFor();
  assert.equal(await accountBalance("DBBL"), originalDbbl - 123.45);

  await page.goto(`${baseURL}/transactions?q=${encodeURIComponent(expenseNote)}`);
  await page.locator("tbody tr", { hasText: expenseNote }).getByRole("link", { name: "Edit" }).click();
  await page.waitForURL(/\/transactions\/[^/]+$/);
  await page.getByRole("heading", { name: "Transaction" }).waitFor();
  await page.getByLabel("Amount (BDT)").fill("100");
  await page.getByLabel("Category").fill("Transport");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL(/\/transactions$/);
  assert.equal(await accountBalance("DBBL"), originalDbbl - 100);
  await deleteTransaction(expenseNote);
  assert.equal(await accountBalance("DBBL"), originalDbbl);

  const originalBkash = await accountBalance("bKash");
  const incomeNote = `smoke-income-${Date.now()}`;
  await page.goto(`${baseURL}/transactions#new`);
  await page.locator("#new").getByLabel("Type").selectOption("INCOME");
  await page.locator("#new").getByLabel("Amount (BDT)").fill("250");
  await page.locator("#new").getByLabel("Account / from").selectOption({ label: "bKash" });
  await page.locator("#new").getByLabel(/Category/).fill("Freelance");
  await page.locator("#new").getByLabel("Note").fill(incomeNote);
  await page.locator("#new").getByRole("button", { name: "Add transaction" }).click();
  await page.waitForURL(/\/transactions$/);
  assert.equal(await accountBalance("bKash"), originalBkash + 250);
  await deleteTransaction(incomeNote);
  assert.equal(await accountBalance("bKash"), originalBkash);

  const transferNote = `smoke-transfer-${Date.now()}`;
  await page.goto(`${baseURL}/transactions#new`);
  await page.locator("#new").getByLabel("Type").selectOption("TRANSFER");
  await page.locator("#new").getByLabel("Amount (BDT)").fill("200");
  await page.locator("#new").getByLabel("Account / from").selectOption({ label: "DBBL" });
  await page.locator("#new").getByLabel(/To account/).selectOption({ label: "bKash" });
  await page.locator("#new").getByLabel("Note").fill(transferNote);
  await page.locator("#new").getByRole("button", { name: "Add transaction" }).click();
  await page.waitForURL(/\/transactions$/);
  assert.equal(await accountBalance("DBBL"), originalDbbl - 200);
  assert.equal(await accountBalance("bKash"), originalBkash + 200);
  await deleteTransaction(transferNote);
  assert.equal(await accountBalance("DBBL"), originalDbbl);
  assert.equal(await accountBalance("bKash"), originalBkash);

  for (const route of ["assets", "debts", "crypto", "backup", "settings"]) {
    const response = await page.goto(`${baseURL}/${route}`);
    assert.equal(response?.ok(), true, `${route} page should load`);
  }
  const backup = await page.evaluate(async () => { const response = await fetch("/api/export?format=json"); return { status: response.status, body: await response.json() }; });
  assert.equal(backup.status, 200);
  const backupBody = backup.body;
  assert.equal(backupBody.schemaVersion, 2);
  assert.ok(Array.isArray(backupBody.transactions));
  const exportCsv = await page.evaluate(async () => { const response = await fetch("/api/export?format=transactions-csv"); return { status: response.status, contentType: response.headers.get("content-type") }; });
  assert.equal(exportCsv.status, 200);
  assert.match(exportCsv.contentType || "", /text\/csv/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login/);
  await page.goto(`${baseURL}/dashboard`);
  await page.waitForURL(/\/login/);
  const unauthorizedExport = await context.request.get(`${baseURL}/api/export?format=json`);
  assert.equal(unauthorizedExport.status(), 401);

  console.log("LifeLedger browser smoke test passed.");
} finally {
  await browser.close();
}
