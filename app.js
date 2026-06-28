const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(id, text = "") {
  const node = $(id);
  if (node) node.textContent = text;
}

async function copyText(value) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
}

function renderResults(target, rows) {
  target.innerHTML = rows
    .map(
      ([label, value]) => `
        <div class="result-item">
          <span>${escapeHtml(label)}</span>
          <code>${escapeHtml(value)}</code>
        </div>
      `,
    )
    .join("");
}

function setCode(target, value, lang = "text") {
  const text = String(value ?? "");
  target.dataset.raw = text;
  target.innerHTML =
    lang === "json"
      ? highlightJson(text)
      : lang === "sql"
        ? highlightSql(text)
        : lang === "java"
          ? highlightJava(text)
          : highlightPlain(text);
}

function getCode(target) {
  return target.dataset.raw || target.textContent || "";
}

function highlightJson(text) {
  return escapeHtml(text).replace(
    /(&quot;(?:\\u[\da-fA-F]{4}|\\[^u]|(?!&quot;).)*&quot;(?=\s*:))|(&quot;(?:\\u[\da-fA-F]{4}|\\[^u]|(?!&quot;).)*&quot;)|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key, string, bool, nil, number) => {
      if (key) return `<span class="tok-key">${key}</span>`;
      if (string) return `<span class="tok-string">${string}</span>`;
      if (bool) return `<span class="tok-bool">${bool}</span>`;
      if (nil) return `<span class="tok-null">${nil}</span>`;
      if (number) return `<span class="tok-number">${number}</span>`;
      return match;
    },
  );
}

function highlightSql(text) {
  const keywords =
    /\b(SELECT|FROM|WHERE|LEFT|RIGHT|INNER|JOIN|ON|AND|OR|GROUP|BY|ORDER|HAVING|LIMIT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|COMMENT|DESC|ASC)\b/g;
  return escapeHtml(text).replace(keywords, '<span class="tok-sql">$1</span>');
}

function highlightJava(text) {
  return escapeHtml(text).replace(
    /(\/\*\*[\s\S]*?\*\/|\/\/.*$)|(&quot;(?:\\.|(?!&quot;).)*&quot;)|(@[A-Za-z][A-Za-z0-9_]*)|\b(public|private|protected|class|static|final|void|return|new|import|package|enum|extends|implements|this)\b|\b(Integer|Long|String|Boolean|Double|Float|BigDecimal|LocalDate|LocalDateTime|LocalTime|List|Object)\b|\b(-?\d+(?:\.\d+)?)\b/gm,
    (match, comment, string, annotation, keyword, type, number) => {
      if (comment) return `<span class="tok-comment">${comment}</span>`;
      if (string) return `<span class="tok-string">${string}</span>`;
      if (annotation) return `<span class="tok-annotation">${annotation}</span>`;
      if (keyword) return `<span class="tok-keyword">${keyword}</span>`;
      if (type) return `<span class="tok-type">${type}</span>`;
      if (number) return `<span class="tok-number">${number}</span>`;
      return match;
    },
  );
}

function highlightPlain(text) {
  return escapeHtml(text).replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
}

function activateTool(tool) {
  $$(".tool-tab").forEach((tab) => {
    const active = tab.dataset.tool === tool;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  $$(".tool-card").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === tool);
  });

  history.replaceState(null, "", `#${tool}`);
}

function formatJson(minify = false) {
  const input = $("#jsonInput").value.trim();
  const output = $("#jsonOutput");

  if (!input) {
    setCode(output, "");
    setMessage("#jsonMessage", "请输入 JSON");
    return;
  }

  try {
    const parsed = JSON.parse(input);
    setCode(output, JSON.stringify(parsed, null, minify ? 0 : 2), "json");
    setMessage("#jsonMessage");
  } catch (error) {
    setCode(output, "");
    setMessage("#jsonMessage", error.message);
  }
}

function formatSql(compact = false) {
  const input = $("#sqlInput").value.trim();
  const output = $("#sqlOutput");
  if (!input) {
    setCode(output, "");
    setMessage("#sqlMessage", "请输入 SQL");
    return;
  }

  const keywords = [
    "select",
    "from",
    "where",
    "left join",
    "right join",
    "inner join",
    "join",
    "on",
    "and",
    "or",
    "group by",
    "order by",
    "having",
    "limit",
    "insert into",
    "values",
    "update",
    "set",
    "delete from",
  ];

  let sql = input.replace(/\s+/g, " ").trim();
  if (compact) {
    setCode(output, sql, "sql");
    setMessage("#sqlMessage");
    return;
  }

  keywords
    .sort((a, b) => b.length - a.length)
    .forEach((keyword) => {
      const pattern = new RegExp(`\\b${keyword.replace(" ", "\\s+")}\\b`, "gi");
      sql = sql.replace(pattern, `\n${keyword.toUpperCase()}`);
    });

  sql = sql
    .replace(/,\s*/g, ",\n  ")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .replace(/^\n/, "")
    .trim();

  setCode(output, sql, "sql");
  setMessage("#sqlMessage");
}

function parseDateInput(value) {
  const text = value.trim();
  if (!text) return new Date();
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
  if (/^\d{13}$/.test(text)) return new Date(Number(text));
  return new Date(text.replace(/-/g, "/"));
}

function convertTime() {
  const date = parseDateInput($("#timestampInput").value);
  if (Number.isNaN(date.getTime())) {
    renderResults($("#timestampResults"), [["错误", "无法识别时间"]]);
    return;
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  renderResults($("#timestampResults"), [
    ["本地时间", formatDateTime(date)],
    ["秒时间戳", Math.floor(date.getTime() / 1000)],
    ["毫秒时间戳", date.getTime()],
    ["当天开始", `${formatDateTime(start)} / ${start.getTime()}`],
    ["当天结束", `${formatDateTime(end)} / ${end.getTime()}`],
    ["UTC", date.toISOString()],
  ]);
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function runCodec(mode) {
  const input = $("#codecInput").value;
  const output = $("#codecOutput");
  try {
    if (mode === "urlEncode") setCode(output, encodeURIComponent(input));
    if (mode === "urlDecode") setCode(output, decodeURIComponent(input));
    if (mode === "base64Encode") setCode(output, btoa(unescape(encodeURIComponent(input))));
    if (mode === "base64Decode") setCode(output, decodeURIComponent(escape(atob(input))));
    setMessage("#codecMessage");
  } catch (error) {
    setCode(output, "");
    setMessage("#codecMessage", error.message);
  }
}

function toPascalCase(value) {
  return toWords(value)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toWords(value) {
  return String(value)
    .replace(/^t_/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function toCamelCase(value) {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function mapSqlType(sqlType) {
  const type = sqlType.toLowerCase();
  if (type.includes("bigint")) return "Long";
  if (/tinyint\s*\(\s*1\s*\)/i.test(type)) return "Boolean";
  if (type.includes("int")) return "Integer";
  if (type.includes("decimal") || type.includes("numeric")) return "BigDecimal";
  if (type.includes("double")) return "Double";
  if (type.includes("float")) return "Float";
  if (type.includes("datetime") || type.includes("timestamp")) return "LocalDateTime";
  if (type.includes("date")) return "LocalDate";
  if (type.includes("time")) return "LocalTime";
  if (type.includes("bit") || type.includes("boolean")) return "Boolean";
  return "String";
}

function parseCreateTable(sql) {
  const tableMatch = sql.match(/create\s+table\s+`?([a-zA-Z0-9_]+)`?/i);
  const tableName = tableMatch?.[1] || "demo";
  const tableComment = sql.match(/\)\s*[^;]*comment\s*=\s*'([^']*)'/i)?.[1] || "";
  const bodyMatch = sql.match(/\(([\s\S]*)\)/);
  const lines = bodyMatch ? splitSqlColumns(bodyMatch[1]) : [];
  const columns = lines
    .map((line) => line.trim())
    .filter((line) => /^`?[a-zA-Z_]/.test(line) && !/^(primary|unique|key|index|constraint)\b/i.test(line))
    .map((line) => {
      const match = line.match(/^`?([a-zA-Z0-9_]+)`?\s+([a-zA-Z0-9()_,]+)/);
      if (!match) return null;
      const comment = line.match(/comment\s+'([^']*)'/i)?.[1] || "";
      return {
        column: match[1],
        sqlType: match[2],
        javaType: mapSqlType(match[2]),
        field: toCamelCase(match[1]),
        comment,
      };
    })
    .filter(Boolean);

  return { tableName, tableComment, columns };
}

function splitSqlColumns(body) {
  const columns = [];
  let current = "";
  let depth = 0;
  for (const char of body) {
    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;
    if (char === "," && depth === 0) {
      columns.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) columns.push(current);
  return columns;
}

function generateSqlJava() {
  const input = $("#sqlJavaInput").value.trim();
  if (!input) {
    setMessage("#sqlJavaMessage", "请输入 CREATE TABLE SQL");
    return;
  }

  const { tableName, tableComment, columns } = parseCreateTable(input);
  if (columns.length === 0) {
    setMessage("#sqlJavaMessage", "没有解析到字段");
    return;
  }

  const suffix = $("#sqlJavaType").value;
  const className = $("#sqlJavaClassName").value.trim() || `${toPascalCase(tableName)}${suffix}`;
  const lombok = $("#sqlJavaLombok").checked;
  const imports = new Set();
  columns.forEach((column) => {
    if (column.javaType === "BigDecimal") imports.add("java.math.BigDecimal");
    if (column.javaType === "LocalDate") imports.add("java.time.LocalDate");
    if (column.javaType === "LocalDateTime") imports.add("java.time.LocalDateTime");
    if (column.javaType === "LocalTime") imports.add("java.time.LocalTime");
  });
  if (lombok) imports.add("lombok.Data");

  const lines = [];
  imports.forEach((item) => lines.push(`import ${item};`));
  if (imports.size) lines.push("");
  if (tableComment) {
    lines.push("/**");
    lines.push(` * ${tableComment}`);
    lines.push(" */");
  }
  if (lombok) lines.push("@Data");
  lines.push(`public class ${className} {`, "");
  columns.forEach((column) => {
    if (column.comment) lines.push(`    /** ${column.comment} */`);
    lines.push(`    private ${column.javaType} ${column.field};`, "");
  });

  if (!lombok) {
    columns.forEach((column) => {
      const method = column.field.charAt(0).toUpperCase() + column.field.slice(1);
      lines.push(`    public ${column.javaType} get${method}() {`);
      lines.push(`        return ${column.field};`);
      lines.push("    }", "");
      lines.push(`    public void set${method}(${column.javaType} ${column.field}) {`);
      lines.push(`        this.${column.field} = ${column.field};`);
      lines.push("    }", "");
    });
  }

  lines.push("}");
  setCode($("#sqlJavaOutput"), lines.join("\n"), "java");
  setMessage("#sqlJavaMessage");
}

function generateJsonJava() {
  const input = $("#jsonJavaInput").value.trim();
  const className = $("#jsonJavaClassName").value.trim() || "DemoDTO";
  if (!input) {
    setMessage("#jsonJavaMessage", "请输入 JSON");
    return;
  }

  try {
    const parsed = JSON.parse(input);
    const result = buildJavaClass(className, parsed, $("#jsonJavaLombok").checked);
    setCode($("#jsonJavaOutput"), result, "java");
    setMessage("#jsonJavaMessage");
  } catch (error) {
    setCode($("#jsonJavaOutput"), "");
    setMessage("#jsonJavaMessage", error.message);
  }
}

function buildJavaClass(className, value, lombok) {
  const imports = new Set();
  if (lombok) imports.add("lombok.Data");

  const rootValue = Array.isArray(value) ? value[0] : value;

  function inferType(fieldName, fieldValue, nestedRows, indent) {
    if (fieldValue === null) return "Object";
    if (Array.isArray(fieldValue)) {
      imports.add("java.util.List");
      if (fieldValue.length === 0) return "List<Object>";
      return `List<${inferType(fieldName, fieldValue[0], nestedRows, indent)}>`;
    }
    if (typeof fieldValue === "boolean") return "Boolean";
    if (typeof fieldValue === "number") {
      if (!Number.isInteger(fieldValue)) {
        imports.add("java.math.BigDecimal");
        return "BigDecimal";
      }
      return Math.abs(fieldValue) > 2147483647 ? "Long" : "Integer";
    }
    if (typeof fieldValue === "object") {
      const nestedName = toPascalCase(fieldName);
      nestedRows.push(renderClass(nestedName, fieldValue, `${indent}    `, false));
      return nestedName;
    }
    return "String";
  }

  function renderClass(name, objectValue, indent = "", root = false) {
    const rows = [];
    const nestedRows = [];
    if (lombok) rows.push(`${indent}@Data`);
    rows.push(`${indent}public ${root ? "" : "static "}class ${name} {`, "");
    Object.entries(objectValue || {}).forEach(([key, fieldValue]) => {
      rows.push(`${indent}    private ${inferType(key, fieldValue, nestedRows, indent)} ${toCamelCase(key)};`);
    });
    if (nestedRows.length > 0) rows.push("", ...nestedRows);
    rows.push("", `${indent}}`);
    return rows.join("\n");
  }

  if (!rootValue || typeof rootValue !== "object") {
    throw new Error("JSON 根节点需要是对象，或至少包含一个对象的数组");
  }

  const root = renderClass(className, rootValue, "", true);
  const importLines = Array.from(imports).sort().map((item) => `import ${item};`);
  return [...importLines, importLines.length ? "" : "", root].filter(Boolean).join("\n");
}

function parseCronPart(part, min, max) {
  const allowed = new Set();
  part.split(",").forEach((piece) => {
    const [range, stepText] = piece.split("/");
    const step = stepText ? Number(stepText) : 1;
    let start = min;
    let end = max;
    if (range !== "*") {
      if (range.includes("-")) {
        const [a, b] = range.split("-").map(Number);
        start = a;
        end = b;
      } else {
        start = Number(range);
        end = Number(range);
      }
    }
    for (let value = start; value <= end; value += step) {
      if (value >= min && value <= max) allowed.add(value);
    }
  });
  return allowed;
}

function calcCron() {
  const parts = $("#cronInput").value.trim().split(/\s+/);
  if (parts.length !== 5) {
    $("#cronResults").innerHTML = "";
    setMessage("#cronMessage", "当前支持 5 位 cron：分 时 日 月 周");
    return;
  }

  try {
    const [minute, hour, day, month, week] = [
      parseCronPart(parts[0], 0, 59),
      parseCronPart(parts[1], 0, 23),
      parseCronPart(parts[2], 1, 31),
      parseCronPart(parts[3], 1, 12),
      parseCronPart(parts[4], 0, 6),
    ];
    const hits = [];
    const cursor = new Date();
    cursor.setSeconds(0, 0);
    cursor.setMinutes(cursor.getMinutes() + 1);
    for (let i = 0; i < 525600 && hits.length < 5; i += 1) {
      if (
        minute.has(cursor.getMinutes()) &&
        hour.has(cursor.getHours()) &&
        day.has(cursor.getDate()) &&
        month.has(cursor.getMonth() + 1) &&
        week.has(cursor.getDay())
      ) {
        hits.push(new Date(cursor));
      }
      cursor.setMinutes(cursor.getMinutes() + 1);
    }
    renderResults($("#cronResults"), hits.map((date, index) => [`第 ${index + 1} 次`, formatDateTime(date)]));
    setMessage("#cronMessage");
  } catch (error) {
    $("#cronResults").innerHTML = "";
    setMessage("#cronMessage", error.message);
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

function parseJwt() {
  const token = $("#jwtInput").value.trim();
  const parts = token.split(".");
  if (parts.length < 2) {
    setCode($("#jwtOutput"), "");
    $("#jwtMeta").innerHTML = "";
    setMessage("#jwtMessage", "JWT 至少需要 header.payload 两段");
    return;
  }

  try {
    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    setCode($("#jwtOutput"), JSON.stringify({ header, payload }, null, 2), "json");
    const rows = [];
    if (payload.iat) rows.push(["iat", `${payload.iat} / ${formatDateTime(new Date(payload.iat * 1000))}`]);
    if (payload.exp) rows.push(["exp", `${payload.exp} / ${formatDateTime(new Date(payload.exp * 1000))}`]);
    if (payload.nbf) rows.push(["nbf", `${payload.nbf} / ${formatDateTime(new Date(payload.nbf * 1000))}`]);
    renderResults($("#jwtMeta"), rows);
    setMessage("#jwtMessage");
  } catch (error) {
    setCode($("#jwtOutput"), "");
    $("#jwtMeta").innerHTML = "";
    setMessage("#jwtMessage", error.message);
  }
}

function generateEnum() {
  const className = $("#enumClassName").value.trim() || "DemoEnum";
  const lombok = $("#enumLombok").checked;
  const lines = $("#enumInput").value.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    setMessage("#enumMessage", "请输入枚举项");
    return;
  }

  const items = lines.map((line, index) => {
    const parts = line.split(/\s+/);
    const code = parts[0] ?? index;
    const name = parts[1] ?? code;
    const constant = parts[2] || toEnumConstant(name);
    return { code, name, constant };
  });

  const output = [];
  if (lombok) output.push("import lombok.Getter;", "", "@Getter");
  output.push(`public enum ${className} {`, "");
  items.forEach((item, index) => {
    const suffix = index === items.length - 1 ? ";" : ",";
    output.push(`    ${item.constant}(${item.code}, "${item.name}")${suffix}`);
  });
  output.push("", "    private final Integer code;", "    private final String desc;", "");
  output.push(`    ${className}(Integer code, String desc) {`);
  output.push("        this.code = code;", "        this.desc = desc;", "    }");
  if (!lombok) {
    output.push("", "    public Integer getCode() {", "        return code;", "    }");
    output.push("", "    public String getDesc() {", "        return desc;", "    }");
  }
  output.push("}");

  setCode($("#enumOutput"), output.join("\n"), "java");
  setMessage("#enumMessage");
}

async function lookupIp(current = false) {
  let ip = $("#ipInput").value.trim();
  $("#ipLookupBtn").disabled = true;
  $("#currentIpBtn").disabled = true;
  $("#browserLocationBtn").disabled = true;
  setMessage("#ipMessage", "查询中...");
  try {
    if (current || !ip) {
      ip = await fetchCurrentIpv4();
      $("#ipInput").value = ip;
    }
    const url = `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`请求失败：${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "查询失败");
    $("#ipInput").value = data.ip || ip;
    renderResults($("#ipResults"), [
      ["IP", data.ip || ""],
      ["类型", data.type || ""],
      ["IP所在地址", [data.country, data.region, data.city].filter(Boolean).join(" / ")],
      ["运营商登记", data.connection?.isp || data.connection?.org || ""],
      ["ASN", data.connection?.asn ? `AS${data.connection.asn}` : ""],
      ["时区", data.timezone?.id || ""],
      ["IP库经纬度", data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : ""],
    ]);
    setCode($("#ipOutput"), JSON.stringify(data, null, 2), "json");
    setMessage("#ipMessage");
  } catch (error) {
    $("#ipResults").innerHTML = "";
    setCode($("#ipOutput"), "");
    setMessage("#ipMessage", error.message);
  } finally {
    $("#ipLookupBtn").disabled = false;
    $("#currentIpBtn").disabled = false;
    $("#browserLocationBtn").disabled = false;
  }
}

async function fetchCurrentIpv4() {
  const response = await fetch("https://ipv4.icanhazip.com");
  if (!response.ok) throw new Error(`获取 IPv4 失败：${response.status}`);
  const ip = (await response.text()).trim();
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) throw new Error("未获取到有效 IPv4");
  return ip;
}

function locateBrowser() {
  if (!navigator.geolocation) {
    setMessage("#ipMessage", "当前浏览器不支持定位");
    return;
  }

  $("#browserLocationBtn").disabled = true;
  setMessage("#ipMessage", "等待浏览器定位授权...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      renderResults($("#realLocationResults"), [
        ["真实位置", "浏览器定位授权返回"],
        ["经纬度", `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`],
        ["精度", `${Math.round(accuracy)} 米`],
        ["更新时间", formatDateTime(new Date(position.timestamp))],
      ]);
      setMessage("#ipMessage", "真实位置来自浏览器定位，IP所在地址来自IP库，两者可能不同。");
      $("#browserLocationBtn").disabled = false;
    },
    (error) => {
      const messages = {
        1: "定位权限被拒绝",
        2: "无法获取当前位置",
        3: "定位请求超时",
      };
      setMessage("#ipMessage", messages[error.code] || error.message);
      $("#browserLocationBtn").disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function toEnumConstant(value) {
  const map = { 未: "NOT", 已: "DONE", 认证: "AUTH", 失败: "FAILED", 成功: "SUCCESS", 中: "PROCESSING" };
  let result = value;
  Object.entries(map).forEach(([cn, en]) => {
    result = result.replaceAll(cn, `_${en}_`);
  });
  return result
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase() || "UNKNOWN";
}

function drawTree() {
  const canvas = $("#treeCanvas");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = "#e9e0d0";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.strokeStyle = "rgba(32, 32, 29, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 20; x < rect.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 60, rect.height);
    ctx.stroke();
  }

  const isNarrow = rect.width < 520;
  const baseX = rect.width * (isNarrow ? 0.82 : 0.76);
  const baseY = rect.height + 14;
  ctx.lineCap = "round";

  function branch(x, y, length, angle, width, depth) {
    if (depth === 0) return;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    ctx.strokeStyle = depth > 4 ? "#3d3026" : "rgba(82, 98, 77, 0.86)";
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    branch(endX, endY, length * 0.72, angle - 0.42, width * 0.72, depth - 1);
    branch(endX, endY, length * 0.68, angle + 0.36, width * 0.68, depth - 1);
  }

  if (isNarrow) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.width * 0.62, 0, rect.width * 0.38, rect.height);
    ctx.clip();
  }
  branch(baseX, baseY, rect.height * 0.24, -Math.PI / 2, 16, 7);
  if (isNarrow) ctx.restore();

  ctx.fillStyle = "rgba(162, 96, 69, 0.16)";
  for (let i = 0; i < 38; i += 1) {
    const x = baseX - 190 + ((i * 47) % 340);
    const y = 24 + ((i * 31) % 150);
    ctx.beginPath();
    ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function bindEvents() {
  $$(".tool-tab").forEach((tab) => tab.addEventListener("click", () => activateTool(tab.dataset.tool)));
  $$("[data-copy-from]").forEach((button) => {
    button.addEventListener("click", () => copyText(getCode($(`#${button.dataset.copyFrom}`))));
  });

  $("#formatJsonBtn").addEventListener("click", () => formatJson(false));
  $("#minifyJsonBtn").addEventListener("click", () => formatJson(true));
  $("#formatSqlBtn").addEventListener("click", () => formatSql(false));
  $("#compactSqlBtn").addEventListener("click", () => formatSql(true));
  $("#convertTimeBtn").addEventListener("click", convertTime);
  $("#useNowBtn").addEventListener("click", () => {
    $("#timestampInput").value = Date.now();
    convertTime();
  });
  $("#urlEncodeBtn").addEventListener("click", () => runCodec("urlEncode"));
  $("#urlDecodeBtn").addEventListener("click", () => runCodec("urlDecode"));
  $("#base64EncodeBtn").addEventListener("click", () => runCodec("base64Encode"));
  $("#base64DecodeBtn").addEventListener("click", () => runCodec("base64Decode"));
  $("#sqlJavaBtn").addEventListener("click", generateSqlJava);
  $("#jsonJavaBtn").addEventListener("click", generateJsonJava);
  $("#cronBtn").addEventListener("click", calcCron);
  $("#jwtBtn").addEventListener("click", parseJwt);
  $("#ipLookupBtn").addEventListener("click", () => lookupIp(false));
  $("#currentIpBtn").addEventListener("click", () => lookupIp(true));
  $("#browserLocationBtn").addEventListener("click", locateBrowser);
  $("#enumBtn").addEventListener("click", generateEnum);
  window.addEventListener("resize", drawTree);
}

function init() {
  $("#todayText").textContent = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  bindEvents();
  drawTree();
  convertTime();
  calcCron();

  const initial = location.hash.replace("#", "");
  if ($(`.tool-tab[data-tool="${initial}"]`)) activateTool(initial);
}

init();
