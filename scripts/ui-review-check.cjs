const { chromium } = require("playwright");
const BASE = "http://localhost:5173";
const email = "review-1792269050430@test.local";
const pw = "rev" + "-" + "pw" + "99";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  async function check(name, fn) {
    try { await fn(); results.push("PASS  " + name); }
    catch (e) { results.push("FAIL  " + name + ": " + e.message.split("\n")[0]); }
  }

  await check("login as review user", async () => {
    await page.goto(BASE + "/login");
    await page.fill("input[type=email]", email);
    await page.fill("input[type=password]", pw);
    await page.click("button[type=submit]");
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  });

  await check("review page shows accepted + rejected drafts", async () => {
    await page.goto(BASE + "/review");
    await page.waitForSelector("text=Từ vựng N1 từ tài liệu", { timeout: 15000 });
    await page.waitForSelector("text=Đã chấp nhận");
    await page.waitForSelector("text=Đã từ chối");
  });

  await check("roadmap shows the lesson", async () => {
    await page.goto(BASE + "/roadmap");
    await page.waitForSelector("text=Từ vựng N1 từ tài liệu", { timeout: 15000 });
  });

  await check("jobs page shows succeeded jobs", async () => {
    await page.goto(BASE + "/jobs");
    await page.waitForSelector("text=Hoàn thành", { timeout: 15000 });
  });

  await browser.close();
  console.log(results.join("\n"));
  const fails = results.filter((r) => r.startsWith("FAIL")).length;
  console.log(fails === 0 ? "\nALL REVIEW-UI CHECKS PASSED" : "\n" + fails + " CHECK(S) FAILED");
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("CRASHED:", e.message); process.exit(1); });
