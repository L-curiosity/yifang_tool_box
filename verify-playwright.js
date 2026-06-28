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
  await page.getByRole("button", { name, exact: true }).click();
}

async function verifyViewport(browser, name, viewport) {
  const context = await browser.newContext({
    viewport,
    permissions: ["geolocation"],
    geolocation: { latitude: 30.2741, longitude: 120.1551 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(screenshotDir, `${name}.png`),
    fullPage: true,
  });

  await openTool(page, "JSON");
  await page.locator("#jsonInput").fill('{"name":"site","ok":true}');
  await page.locator("#formatJsonBtn").click();
  const jsonOutput = await page.locator("#jsonOutput").textContent();
  if (!jsonOutput.includes('"name": "site"')) throw new Error(`${name}: JSON formatter failed`);
  if ((await page.locator("#jsonOutput .tok-key").count()) === 0) {
    throw new Error(`${name}: JSON syntax highlight failed`);
  }

  await openTool(page, "SQL");
  await page.locator("#sqlInput").fill("select id,user_name from user where status=1 order by create_time desc");
  await page.locator("#formatSqlBtn").click();
  const sqlOutput = await page.locator("#sqlOutput").textContent();
  if (!sqlOutput.includes("SELECT") || !sqlOutput.includes("FROM")) throw new Error(`${name}: SQL formatter failed`);

  await openTool(page, "时间戳");
  await page.locator("#timestampInput").fill("1700000000000");
  await page.locator("#convertTimeBtn").click();
  const timeOutput = await page.locator("#timestampResults").textContent();
  if (!timeOutput.includes("秒时间戳")) throw new Error(`${name}: timestamp converter failed`);

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

  await openTool(page, "Cron");
  await page.locator("#cronInput").fill("*/10 * * * *");
  await page.locator("#cronBtn").click();
  const cronOutput = await page.locator("#cronResults").textContent();
  if (!cronOutput.includes("第 1 次")) throw new Error(`${name}: cron calculator failed`);

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
  await page.locator("#browserLocationBtn").click();
  await page.waitForSelector("#realLocationResults code");
  const realLocationOutput = await page.locator("#realLocationResults").textContent();
  if (!realLocationOutput.includes("真实位置") || !realLocationOutput.includes("30.274100")) {
    throw new Error(`${name}: browser real location failed`);
  }

  await openTool(page, "枚举");
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
