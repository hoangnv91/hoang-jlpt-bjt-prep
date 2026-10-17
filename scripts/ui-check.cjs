const { chromium } = require("playwright");

const BASE = "http://localhost:5173";
const email = `ui-${Date.now()}@t.local`;
const pw = "pw" + "-" + "1234";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push(`PASS  ${name}`);
    } catch (e) {
      results.push(`FAIL  ${name}: ${e.message.split("\n")[0]}`);
    }
  }

  await check("landing page loads", async () => {
    await page.goto(BASE + "/");
    await page.waitForSelector("text=JLPT N1");
  });

  await check("register page loads", async () => {
    await page.goto(BASE + "/register");
    await page.waitForSelector("input[type=email]");
  });

  await check("register + login flow", async () => {
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", pw);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  await check("dashboard shows", async () => {
    await page.waitForSelector("text=Bảng điều khiển");
  });

  await check("ingest page shows tabs", async () => {
    await page.goto(BASE + "/ingest");
    await page.waitForSelector("text=Nhập nội dung");
  });

  await check("ingest text document via UI", async () => {
    await page.locator("button", { hasText: "Văn bản" }).click();
    await page.waitForSelector("textarea", { timeout: 10000 });
    await page.fill("input[placeholder*='Tiêu đề']", "UI test doc");
    await page.fill("textarea", "日本語の敬語は複雑だが、相手を尊重する気持ちが大切である。");
    await page.click("button:has-text('Nhập tài liệu')");
    await page.waitForSelector("text=UI test doc", { timeout: 15000 });
  });

  await check("review page loads", async () => {
    await page.goto(BASE + "/review");
    await page.waitForSelector("text=Duyệt bản nháp");
  });

  await check("roadmap page loads", async () => {
    await page.goto(BASE + "/roadmap");
    await page.waitForSelector("text=Lộ trình học tập");
  });

  await check("jobs page loads", async () => {
    await page.goto(BASE + "/jobs");
    await page.waitForSelector("text=Trạng thái xử lý");
  });

  await check("language switcher to Japanese", async () => {
    await page.goto(BASE + "/");
    await page.click("text=日本語");
    await page.waitForSelector("text=日本語検定対策");
  });

  await browser.close();
  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(fails === 0 ? "\nALL UI CHECKS PASSED" : `\n${fails} UI CHECK(S) FAILED`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => {
  console.error("UI CHECK CRASHED:", e.message);
  process.exit(1);
});
