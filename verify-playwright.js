const { chromium } = require("playwright");
const path = require("path");

const executablePath = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge";
const baseUrl = process.env.SITE_URL || "http://127.0.0.1:4173/";
const screenshotDir = path.join(__dirname, "screenshots");

function base64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function openTool(page, name) {
  await page.locator(".tool-tabs").getByRole("button", { name, exact: true }).click();
}

async function verifyViewport(browser, name, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.route("https://ipv4.icanhazip.com/", (route) => route.fulfill({ status: 200, body: "8.8.8.8\n" }));
  await page.route("https://ipwho.is/**", (route) => {
    const url = new URL(route.request().url());
    const ip = decodeURIComponent(url.pathname.replace("/", "")) || "8.8.8.8";
    const isHongKong = ip === "43.255.191.171";
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        ip,
        type: "IPv4",
        country: isHongKong ? "香港" : "美国",
        region: isHongKong ? "香港,香港" : "California",
        city: isHongKong ? "香港" : "Mountain View",
        latitude: 37.386,
        longitude: -122.0838,
        connection: { asn: 15169, isp: "Google LLC", org: "Google LLC" },
        timezone: { id: "America/Los_Angeles" },
      }),
    });
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  if (!(await page.locator("#home").isVisible())) throw new Error(`${name}: home should be visible on first load`);
  if (await page.locator(".tools-section").isVisible()) throw new Error(`${name}: tools section should be hidden on home`);
  if (!(await page.locator("h1", { hasText: "把常用小工具放在手边。" }).isVisible())) {
    throw new Error(`${name}: home headline missing`);
  }
  await page.screenshot({
    path: path.join(screenshotDir, `${name}.png`),
    fullPage: true,
  });

  await page.locator("#toolSearchInput").fill("json");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  if (await page.locator("#home").isVisible()) throw new Error(`${name}: search should leave home view`);
  if (!(await page.locator(".tools-section").isVisible())) throw new Error(`${name}: tools section should open from search`);
  const jsonDtoActive = await page.locator('.tool-card[data-tool-panel="json-java"]').evaluate((node) => node.classList.contains("active"));
  if (!jsonDtoActive) throw new Error(`${name}: search keyboard navigation failed`);

  await page.locator(".brand").click();
  if (!(await page.locator("#home").isVisible())) throw new Error(`${name}: brand click should return home`);
  if (await page.locator(".tools-section").isVisible()) throw new Error(`${name}: tools section should hide after brand click`);

  await page.locator(".category-nav").getByRole("button", { name: "格式化", exact: true }).click();
  if (!(await page.locator(".tool-tabs").textContent()).includes("SQL")) {
    throw new Error(`${name}: category navigation failed`);
  }

  await openTool(page, "JSON");
  await page.locator("#jsonInput").fill('{"name":"site","ok":true}');
  await page.locator("#formatJsonBtn").click();
  const jsonOutput = await page.locator("#jsonOutput").textContent();
  if (!jsonOutput.includes('"name": "site"')) throw new Error(`${name}: JSON formatter failed`);
  const splitSizes = await page.locator('#tool-json').evaluate((node) => {
    const input = node.querySelector(".tool-inputs").getBoundingClientRect();
    const output = node.querySelector(".tool-results").getBoundingClientRect();
    const textarea = node.querySelector(".tool-textarea").getBoundingClientRect();
    const code = node.querySelector(".tool-output").getBoundingClientRect();
    return {
      inputWidth: Math.round(input.width),
      outputWidth: Math.round(output.width),
      textareaTop: Math.round(textarea.top),
      codeTop: Math.round(code.top),
    };
  });
  if (viewport.width > 760 && Math.abs(splitSizes.inputWidth - splitSizes.outputWidth) > 2) {
    throw new Error(`${name}: split panel widths are not equal`);
  }
  if (viewport.width > 760 && Math.abs(splitSizes.textareaTop - splitSizes.codeTop) > 2) {
    throw new Error(`${name}: split panel content tops are not aligned`);
  }
  if ((await page.locator("#jsonOutput .tok-key").count()) === 0) {
    throw new Error(`${name}: JSON syntax highlight failed`);
  }
  await page.locator('.output-search[data-search-output="jsonOutput"]').fill("site");
  if ((await page.locator("#jsonOutput .search-hit").count()) === 0) {
    throw new Error(`${name}: output internal search failed`);
  }

  await openTool(page, "SQL");
  await page.locator("#sqlInput").fill("select id,user_name from user where status=1 order by create_time desc");
  await page.locator("#formatSqlBtn").click();
  const sqlOutput = await page.locator("#sqlOutput").textContent();
  if (!sqlOutput.includes("SELECT") || !sqlOutput.includes("FROM")) throw new Error(`${name}: SQL formatter failed`);

  await page.locator(".category-nav").getByRole("button", { name: "时间戳", exact: true }).click();
  await openTool(page, "时间戳");
  await page.locator("#timestampInput").fill("1700000000000");
  await page.locator("#convertTimeBtn").click();
  const timeOutput = await page.locator("#timestampResults").textContent();
  if (!timeOutput.includes("秒时间戳")) throw new Error(`${name}: timestamp converter failed`);

  await page.locator(".category-nav").getByRole("button", { name: "转换", exact: true }).click();
  await openTool(page, "URL/Base64");
  await page.locator("#codecInput").fill("hello 世界");
  await page.locator("#base64EncodeBtn").click();
  const codecOutput = await page.locator("#codecOutput").textContent();
  if (!codecOutput.includes("aGVsbG8")) throw new Error(`${name}: Base64 encoder failed`);

  await openTool(page, "SQL 转实体");
  await page.locator("#sqlJavaInput").fill("CREATE TABLE `user` (`id` bigint COMMENT '主键', `user_name` varchar(64) COMMENT '用户名', `create_time` datetime COMMENT '创建时间');");
  await page.locator("#sqlJavaBtn").click();
  const sqlJavaOutput = await page.locator("#sqlJavaOutput").textContent();
  if (!sqlJavaOutput.includes("class UserDO") || !sqlJavaOutput.includes("private String userName")) {
    throw new Error(`${name}: SQL to Java failed`);
  }

  await openTool(page, "JSON 转 DTO");
  await page.locator("#jsonJavaInput").fill('{"id":1,"userName":"Tom","enabled":true}');
  await page.locator("#jsonJavaBtn").click();
  const jsonJavaOutput = await page.locator("#jsonJavaOutput").textContent();
  if (!jsonJavaOutput.includes("class DemoDTO") || !jsonJavaOutput.includes("private String userName")) {
    throw new Error(`${name}: JSON to DTO failed`);
  }
  if ((await page.locator("#jsonJavaOutput .tok-keyword").count()) === 0) {
    throw new Error(`${name}: JSON to DTO Java highlight failed`);
  }

  await page.locator(".category-nav").getByRole("button", { name: "时间戳", exact: true }).click();
  await openTool(page, "Cron");
  await page.locator("#cronInput").fill("*/10 * * * *");
  await page.locator("#cronBtn").click();
  const cronOutput = await page.locator("#cronResults").textContent();
  if (!cronOutput.includes("第 1 次")) throw new Error(`${name}: cron calculator failed`);

  await page.locator(".category-nav").getByRole("button", { name: "IP JWT等", exact: true }).click();
  await openTool(page, "JWT");
  const jwt = `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({ sub: "1", exp: 4102444800 })}.`;
  await page.locator("#jwtInput").fill(jwt);
  await page.locator("#jwtBtn").click();
  const jwtOutput = await page.locator("#jwtOutput").textContent();
  if (!jwtOutput.includes('"sub": "1"')) throw new Error(`${name}: JWT parser failed`);

  await openTool(page, "IP 地址");
  await page.locator("#ipInput").fill("8.8.8.8");
  await page.locator("#ipLookupBtn").click();
  await page.waitForSelector("#ipResults code");
  const ipOutput = await page.locator("#ipResults").textContent();
  if (!ipOutput.includes("8.8.8.8")) throw new Error(`${name}: IP lookup failed`);
  if (!ipOutput.includes("IP所在地址")) throw new Error(`${name}: IP location label missing`);
  await page.locator("#ipInput").fill("43.255.191.171");
  await page.locator("#ipLookupBtn").click();
  await page.waitForFunction(() => document.querySelector("#ipResults")?.textContent?.includes("43.255.191.171"));
  const hkIpOutput = (await page.locator("#ipResults").textContent()).replace(/\s+/g, " ").trim();
  if (!hkIpOutput.includes("香港 / 香港")) throw new Error(`${name}: Hong Kong IP location dedupe failed`);
  if (hkIpOutput.includes("香港,香港")) {
    throw new Error(`${name}: Hong Kong IP location still has duplicated comma value`);
  }

  await page.locator(".brand").click();
  await page.locator("#toolSearchInput").fill("枚举");
  await page.keyboard.press("Enter");
  await page.locator("#enumInput").fill("0 未认证 NOT_AUTH\n1 已认证 AUTHED");
  await page.locator("#enumBtn").click();
  const enumOutput = await page.locator("#enumOutput").textContent();
  if (!enumOutput.includes("enum AuthStatusEnum") || !enumOutput.includes("NOT_AUTH")) {
    throw new Error(`${name}: enum generator failed`);
  }

  if ((await page.locator("#fieldNameBtn").count()) > 0 || (await page.locator("#methodNameBtn").count()) > 0) {
    throw new Error(`${name}: old naming tools still exist`);
  }

  if (errors.length > 0) {
    throw new Error(`${name}: browser errors: ${errors.join("; ")}`);
  }

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath });
  await verifyViewport(browser, "desktop", { width: 1440, height: 1000 });
  await verifyViewport(browser, "mobile", { width: 390, height: 844 });
  await browser.close();
  console.log("Playwright verification passed");
  console.log(`Screenshots saved to ${screenshotDir}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
