const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const CATEGORIES = {
  all: "全部工具",
  format: "格式化",
  convert: "转换",
  time: "时间戳",
  parse: "IP JWT等",
  generate: "生成",
};

const TOOLS = [
  { id: "json", title: "JSON", fullTitle: "JSON 格式化", category: "format", aliases: ["json", "format", "格式化", "json格式化"] },
  { id: "sql", title: "SQL", fullTitle: "SQL 格式化", category: "format", aliases: ["sql", "format", "格式化", "sql格式化"] },
  { id: "timestamp", title: "时间戳", fullTitle: "时间戳转换", category: "time", aliases: ["time", "timestamp", "日期", "时间"] },
  { id: "url", title: "URL", fullTitle: "URL 编解码", category: "convert", aliases: ["url", "encode", "decode", "编码", "解码", "urlencode", "urldecode"] },
  { id: "base64", title: "Base64", fullTitle: "Base64 编解码", category: "convert", aliases: ["base64", "encode", "decode", "编码", "解码"] },
  { id: "sql-java", title: "SQL 转实体", fullTitle: "SQL 转 Java 实体", category: "convert", aliases: ["sql", "java", "entity", "实体", "do", "dto", "vo"] },
  { id: "json-java", title: "JSON 转 DTO", fullTitle: "JSON 转 Java DTO", category: "convert", aliases: ["json", "java", "dto", "class", "实体"] },
  { id: "cron", title: "Cron", fullTitle: "Cron 表达式", category: "time", aliases: ["cron", "定时", "表达式"] },
  { id: "jwt", title: "JWT", fullTitle: "JWT 解析", category: "parse", aliases: ["jwt", "token", "解析", "登录"] },
  { id: "ip", title: "IP 地址", fullTitle: "IP 地址查询", category: "parse", aliases: ["ip", "地址", "公网", "归属地"] },
  { id: "enum", title: "枚举", fullTitle: "枚举生成器", category: "parse", aliases: ["enum", "枚举", "生成"] },
];

const CATEGORY_ORDER = ["format", "convert", "time", "parse"];
const SETTINGS_STORAGE_KEY = "yifang_toolbox_settings";
const DEFAULT_SETTINGS = {
  categories: CATEGORY_ORDER,
  tools: TOOLS.map((tool) => tool.id),
  live2dRole: "default",
};

const state = {
  activeCategory: null,
  searchIndex: 0,
  searchMatches: [],
  inToolsView: false,
  companionTipIndex: 0,
  dailyEncouragementVisible: false,
  settings: null,
};

const COMPANION_TIPS = [
  "需要工具时，先搜一下会更快。",
  "JSON 很长的话，左右分栏更适合对照。",
  "结果框右上角可以搜关键词，也可以直接复制。",
  "SQL 转实体前，保留 COMMENT 会生成字段注释。",
  "IP 归属地来自公开 IP 库，不等于你的真实位置。",
];

const DAILY_ENCOURAGEMENTS = [
  "愿你今天被温柔以待，也记得温柔地对待自己。",
  "慢慢来，好的事情会在自己的节奏里长出来。",
  "你不需要一直发光，安静地恢复也很珍贵。",
  "先照顾好此刻的自己，路会一点点清晰起来。",
  "愿今天有一件小事，让你觉得生活还不错。",
  "不要急着追赶风，先听听自己的呼吸。",
  "真正重要的东西，往往值得慢一点靠近。",
  "愿你拥有松弛的心，也拥有重新开始的勇气。",
  "每个平凡的今天，都可以藏着一点小小的好运。",
  "山高路远，看世界，也找自己。",
  "你已经走过很多路，今天也可以轻轻往前一点。",
  "愿你心里有光，脚下有路，身边有温暖。",
  "即使只是普通的一天，也值得被认真生活。",
  "不必事事圆满，留一点空白给风和月亮。",
  "愿你在忙碌里，仍能遇见片刻的安宁。",
  "向前走时，也别忘了看看沿途的花。",
  "愿今天的你，比昨天更自在一点。",
  "世界很大，先把自己安放好。",
  "愿所有不容易，都慢慢变成刚刚好。",
  "把心放宽一点，好运也许正在路上。",
];

const LIVE2D_ROLES = {
  default: {
    title: "默认",
    fallback: true,
    tapMotions: [],
  },
  female: {
    title: "女性",
    path: "./assets/live2d/mingshi/mingshi.model3.json",
    scale: 0.18,
    motionGroup: "",
    tapMotions: [7, 8, 13, 14],
  },
  male: {
    title: "男性",
    path: "./assets/live2d/chiaki_kitty/chiaki_kitty.model.json",
    scale: 0.145,
    motionGroup: "tap",
    tapMotions: [0, 1, 2],
  },
  pet: {
    title: "宠物",
    path: "./assets/live2d/penchan/penchan.model.json",
    scale: 0.22,
    motionGroup: "",
    tapMotions: [],
  },
};

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

function cloneDefaultSettings() {
  return {
    categories: [...DEFAULT_SETTINGS.categories],
    tools: [...DEFAULT_SETTINGS.tools],
    live2dRole: DEFAULT_SETTINGS.live2dRole,
  };
}

function loadSettings() {
  let settings = cloneDefaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") {
      settings = {
        categories: Array.isArray(saved.categories) ? saved.categories : settings.categories,
        tools: Array.isArray(saved.tools) ? saved.tools : settings.tools,
        live2dRole: LIVE2D_ROLES[saved.live2dRole] ? saved.live2dRole : settings.live2dRole,
      };
    }
  } catch (error) {
    settings = cloneDefaultSettings();
  }
  return normalizeSettings(settings);
}

function normalizeSettings(settings) {
  const validCategories = new Set(CATEGORY_ORDER);
  const validTools = new Set(TOOLS.map((tool) => tool.id));
  settings.categories = settings.categories.filter((category) => validCategories.has(category));
  settings.tools = settings.tools.filter((tool) => validTools.has(tool));
  if (settings.categories.length === 0) settings.categories = [DEFAULT_SETTINGS.categories[0]];
  CATEGORY_ORDER.forEach((category) => {
    const categoryTools = TOOLS.filter((tool) => tool.category === category).map((tool) => tool.id);
    if (categoryTools.length > 0 && !categoryTools.some((tool) => settings.tools.includes(tool))) {
      settings.tools.push(categoryTools[0]);
    }
  });
  if (!LIVE2D_ROLES[settings.live2dRole]) settings.live2dRole = DEFAULT_SETTINGS.live2dRole;
  return settings;
}

function saveSettings() {
  state.settings = normalizeSettings(state.settings || cloneDefaultSettings());
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state.settings));
}

function isCategoryEnabled(category) {
  return state.settings?.categories.includes(category);
}

function isToolEnabled(toolId) {
  return state.settings?.tools.includes(toolId);
}

function getEnabledCategories() {
  return CATEGORY_ORDER.filter((category) => isCategoryEnabled(category));
}

function getVisibleTools() {
  return TOOLS.filter((tool) => isCategoryEnabled(tool.category) && isToolEnabled(tool.id));
}

function getCategoryTools(category) {
  return TOOLS.filter((tool) => tool.category === category);
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
  target.dataset.lang = lang;
  renderCode(target);
}

function renderCode(target) {
  const text = target.dataset.raw || "";
  const lang = target.dataset.lang || "text";
  target.innerHTML =
    lang === "json"
      ? highlightJson(text)
      : lang === "sql"
        ? highlightSql(text)
        : lang === "java"
          ? highlightJava(text)
          : highlightPlain(text);
  const query = $(`.output-search[data-search-output="${target.id}"]`)?.value.trim() || "";
  if (query) markSearchHits(target, query);
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

function markSearchHits(root, query) {
  const pattern = new RegExp(escapeRegExp(query), "gi");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!pattern.test(node.nodeValue)) return;
    pattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    node.nodeValue.replace(pattern, (match, offset) => {
      fragment.append(document.createTextNode(node.nodeValue.slice(lastIndex, offset)));
      const mark = document.createElement("span");
      mark.className = "search-hit";
      mark.textContent = match;
      fragment.append(mark);
      lastIndex = offset + match.length;
      return match;
    });
    fragment.append(document.createTextNode(node.nodeValue.slice(lastIndex)));
    node.parentNode.replaceChild(fragment, node);
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function showHome() {
  state.inToolsView = false;
  $(".app-shell").classList.remove("tools-mode");
  $("#home").classList.remove("hidden");
  $(".tools-section").classList.add("hidden");
  $$(".category-link").forEach((button) => button.classList.remove("active"));
  $("#toolSearchInput").value = "";
  $("#toolSearchResults").classList.remove("active");
  history.replaceState(null, "", location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showTools() {
  state.inToolsView = true;
  $(".app-shell").classList.add("tools-mode");
  $("#home").classList.add("hidden");
  $(".tools-section").classList.remove("hidden");
}

function activateTool(tool, options = {}) {
  if (!getVisibleTools().some((item) => item.id === tool)) {
    const fallbackTool = getVisibleTools()[0];
    if (!fallbackTool) return showHome();
    return activateTool(fallbackTool.id, options);
  }
  showTools();
  $$(".tool-tab").forEach((tab) => {
    const active = tab.dataset.tool === tool;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  $$(".tool-card").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.toolPanel === tool);
  });

  history.replaceState(null, "", `#${tool}`);
  if (options.scroll !== false) {
    document.querySelector("#tool-" + tool)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderCategoryNav() {
  $(".category-nav").innerHTML = getEnabledCategories()
    .map((category) => `<button class="category-link" type="button" data-category="${category}">${escapeHtml(CATEGORIES[category])}</button>`)
    .join("");
  $$(".category-link").forEach((button) => {
    button.addEventListener("click", () => activateCategory(button.dataset.category));
  });
}

function renderToolTabs(category = state.activeCategory) {
  const visibleTools = getToolsByCategory(category);
  $(".tool-tabs").innerHTML = visibleTools
    .map((tool) => `<button class="tool-tab" type="button" data-tool="${tool.id}">${escapeHtml(tool.title)}</button>`)
    .join("");
  $$(".tool-tab").forEach((tab) => tab.addEventListener("click", () => activateTool(tab.dataset.tool)));
  return visibleTools;
}

function getToolsByCategory(category) {
  if (category === "all") return getVisibleTools();
  if (!isCategoryEnabled(category)) return [];
  return getVisibleTools().filter((tool) => tool.category === category);
}

function activateCategory(category) {
  if (!isCategoryEnabled(category)) {
    category = getEnabledCategories()[0];
  }
  if (!category) return showHome();
  showTools();
  state.activeCategory = category;
  $$(".category-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
  $("#categoryTitle").textContent = CATEGORIES[category] || "全部工具";
  const visibleTools = renderToolTabs(category);
  if (visibleTools.length > 0) activateTool(visibleTools[0].id, { scroll: false });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function searchTools(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return getVisibleTools().filter((tool) => {
    const haystack = [tool.title, tool.fullTitle, CATEGORIES[tool.category], ...tool.aliases].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}

function renderSearchResults(query) {
  const results = searchTools(query);
  state.searchMatches = results;
  state.searchIndex = Math.min(state.searchIndex, Math.max(results.length - 1, 0));
  const container = $("#toolSearchResults");
  container.classList.toggle("active", results.length > 0);
  container.innerHTML = results
    .map(
      (tool, index) => `
        <button class="search-result-item ${index === state.searchIndex ? "active" : ""}" type="button" data-tool="${tool.id}" data-index="${index}">
          <strong>${escapeHtml(tool.fullTitle)}</strong>
          <span>${escapeHtml(CATEGORIES[tool.category])}</span>
        </button>
      `,
    )
    .join("");
  $$(".search-result-item").forEach((item) => {
    item.addEventListener("mouseenter", () => {
      state.searchIndex = Number(item.dataset.index || 0);
    });
    item.addEventListener("click", () => selectSearchTool(item.dataset.tool));
  });
}

function selectSearchTool(toolId) {
  const tool = getVisibleTools().find((item) => item.id === toolId);
  if (!tool) return;
  $("#toolSearchResults").classList.remove("active");
  $("#toolSearchInput").blur();
  activateCategory(tool.category);
  activateTool(tool.id, { scroll: false });
}

function openToolFromHash() {
  const initial = location.hash.replace("#", "");
  const initialTool = getVisibleTools().find((tool) => tool.id === initial);
  if (initialTool) {
    activateCategory(initialTool.category);
    activateTool(initialTool.id, { scroll: false });
    return true;
  }
  return false;
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

function runUrlCodec(mode) {
  const input = $("#urlInput").value;
  const output = $("#urlOutput");
  try {
    if (mode === "encode") setCode(output, encodeURIComponent(input));
    if (mode === "decode") setCode(output, decodeURIComponent(input));
    setMessage("#urlMessage");
  } catch (error) {
    setCode(output, "");
    setMessage("#urlMessage", error.message);
  }
}

function runBase64Codec(mode) {
  const input = $("#base64Input").value;
  const output = $("#base64Output");
  try {
    if (mode === "encode") setCode(output, btoa(unescape(encodeURIComponent(input))));
    if (mode === "decode") setCode(output, decodeURIComponent(escape(atob(input))));
    setMessage("#base64Message");
  } catch (error) {
    setCode(output, "");
    setMessage("#base64Message", error.message);
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
  setMessage("#ipMessage", "查询中...");
  try {
    if (current || !ip) {
      ip = await fetchCurrentIpv4();
      $("#ipInput").value = ip;
    }
    const { data, fallbackUsed } = await queryIpInfo(ip);
    $("#ipInput").value = data.ip || ip;
    renderResults($("#ipResults"), [
      ["IP", data.ip || ""],
      ["类型", data.type || ""],
      ["IP所在地址", formatIpLocation(data)],
      ["运营商登记", data.connection?.isp || data.connection?.org || ""],
      ["ASN", data.connection?.asn ? `AS${data.connection.asn}` : ""],
      ["时区", data.timezone?.id || ""],
      ["IP库经纬度", data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : ""],
    ]);
    setCode($("#ipOutput"), JSON.stringify(data, null, 2), "json");
    setMessage("#ipMessage", fallbackUsed ? "主 IP 库限流，已使用备用 IP 库。" : "");
  } catch (error) {
    $("#ipResults").innerHTML = "";
    setCode($("#ipOutput"), "");
    setMessage("#ipMessage", error.message);
  } finally {
    $("#ipLookupBtn").disabled = false;
    $("#currentIpBtn").disabled = false;
  }
}

async function queryIpInfo(ip) {
  const primaryUrl = `https://ipwho.is/${encodeURIComponent(ip)}?lang=zh-CN`;
  try {
    const response = await fetch(primaryUrl);
    if (response.status === 429) throw new Error("PRIMARY_RATE_LIMIT");
    if (!response.ok) throw new Error(`主 IP 库请求失败：${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message || "主 IP 库查询失败");
    return { data: normalizeIpWhoData(data), fallbackUsed: false };
  } catch (error) {
    const fallbackData = await queryIpApiFallback(ip, error);
    return { data: fallbackData, fallbackUsed: true };
  }
}

function normalizeIpWhoData(data) {
  return {
    ...data,
    type: data.type || "",
    timezone: data.timezone || {},
    connection: data.connection || {},
  };
}

async function queryIpApiFallback(ip, cause) {
  const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
  const response = await fetch(url);
  if (!response.ok) {
    if (cause?.message === "PRIMARY_RATE_LIMIT") {
      throw new Error("IP 查询服务被限流，请稍后再试。");
    }
    throw new Error(`备用 IP 库请求失败：${response.status}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.reason || "备用 IP 库查询失败");
  return {
    ip: data.ip || ip,
    type: data.version ? `IPv${data.version}` : "",
    country: translateIpPlace(data.country_name),
    region: translateIpPlace(data.region),
    city: translateIpPlace(data.city),
    latitude: data.latitude,
    longitude: data.longitude,
    connection: {
      asn: parseAsnNumber(data.asn),
      isp: data.org || "",
      org: data.org || "",
    },
    timezone: {
      id: data.timezone || "",
    },
    source: "ipapi.co",
  };
}

function translateIpPlace(value) {
  const map = {
    China: "中国",
    "Hong Kong": "香港",
    Macau: "澳门",
    Taiwan: "台湾",
    Beijing: "北京",
    Shanghai: "上海",
    Tianjin: "天津",
    Chongqing: "重庆",
    Guangdong: "广东",
    Jiangsu: "江苏",
    Zhejiang: "浙江",
    Shandong: "山东",
    Henan: "河南",
    Sichuan: "四川",
    Hubei: "湖北",
    Hunan: "湖南",
    Fujian: "福建",
    Anhui: "安徽",
    Hebei: "河北",
    Jiangxi: "江西",
    Liaoning: "辽宁",
    Shaanxi: "陕西",
    Yunnan: "云南",
    Guangxi: "广西",
    Shanxi: "山西",
    Guizhou: "贵州",
    Jilin: "吉林",
    Heilongjiang: "黑龙江",
    Xinjiang: "新疆",
    Gansu: "甘肃",
    Hainan: "海南",
    Ningxia: "宁夏",
    Qinghai: "青海",
    Tibet: "西藏",
    "Inner Mongolia": "内蒙古",
    Nanjing: "南京",
    Hangzhou: "杭州",
    Suzhou: "苏州",
    Wuxi: "无锡",
    Guangzhou: "广州",
    Shenzhen: "深圳",
    Chengdu: "成都",
    Wuhan: "武汉",
    Xian: "西安",
    "Xi'an": "西安",
  };
  return map[String(value || "").trim()] || value || "";
}

function parseAsnNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : "";
}

function formatIpLocation(data) {
  const country = String(data.country || "").trim();
  const localValues = [data.region, data.city]
    .flatMap((value) => String(value || "").split(/[,，]/))
    .map((value) => value.trim())
    .filter(Boolean);
  const parts = country ? [country] : [];
  return [...parts, ...new Set(localValues)].join(" / ");
}

async function fetchCurrentIpv4() {
  const urls = ["https://ipv4.icanhazip.com", "https://api.ipify.org"];
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status}`);
      const ip = (await response.text()).trim();
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("未获取到有效 IPv4");
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

function bindEvents() {
  $(".brand").addEventListener("click", (event) => {
    event.preventDefault();
    showHome();
  });

  $("#toolSearchInput").addEventListener("input", (event) => {
    state.searchIndex = 0;
    renderSearchResults(event.target.value);
  });

  $("#toolSearchInput").addEventListener("keydown", (event) => {
    if (state.searchMatches.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.searchIndex = (state.searchIndex + 1) % state.searchMatches.length;
      renderSearchResults(event.currentTarget.value);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.searchIndex = (state.searchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
      renderSearchResults(event.currentTarget.value);
    }
    if (event.key === "Enter") {
      event.preventDefault();
      selectSearchTool(state.searchMatches[state.searchIndex]?.id);
    }
    if (event.key === "Escape") {
      $("#toolSearchResults").classList.remove("active");
    }
  });

  $$(".output-search").forEach((input) => {
    input.addEventListener("input", () => renderCode($(`#${input.dataset.searchOutput}`)));
  });

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
  $("#urlEncodeBtn").addEventListener("click", () => runUrlCodec("encode"));
  $("#urlDecodeBtn").addEventListener("click", () => runUrlCodec("decode"));
  $("#base64EncodeBtn").addEventListener("click", () => runBase64Codec("encode"));
  $("#base64DecodeBtn").addEventListener("click", () => runBase64Codec("decode"));
  $("#sqlJavaBtn").addEventListener("click", generateSqlJava);
  $("#jsonJavaBtn").addEventListener("click", generateJsonJava);
  $("#cronBtn").addEventListener("click", calcCron);
  $("#jwtBtn").addEventListener("click", parseJwt);
  $("#ipLookupBtn").addEventListener("click", () => lookupIp(false));
  $("#currentIpBtn").addEventListener("click", () => lookupIp(true));
  $("#enumBtn").addEventListener("click", generateEnum);
  bindSettingsPanel();
  bindCompanion();
  window.addEventListener("hashchange", () => {
    if (!location.hash) {
      showHome();
      return;
    }
    openToolFromHash();
  });
}

function bindSettingsPanel() {
  const menu = $("#settingsMenu");
  const button = $("#settingsButton");
  const panel = $("#settingsPanel");
  const close = $("#settingsClose");
  if (!menu || !button || !panel || !close) return;

  const setOpen = (open) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("settings-open", open);
    if (open) renderSettingsPanel();
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(panel.hidden);
  });
  close.addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (event) => event.stopPropagation());
  document.addEventListener("click", (event) => {
    if (!panel.hidden && !menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
}

function renderSettingsPanel() {
  const content = $("#settingsContent");
  if (!content) return;
  const enabledCategories = getEnabledCategories();
  const roleRows = Object.entries(LIVE2D_ROLES)
    .map(
      ([role, config]) => `
        <label class="settings-radio">
          <span>${escapeHtml(config.title)}</span>
          <input type="radio" name="live2dRole" value="${role}" ${state.settings.live2dRole === role ? "checked" : ""} data-setting-role />
        </label>
      `,
    )
    .join("");

  const toolGroups = CATEGORY_ORDER.map((category) => {
    const categoryEnabled = isCategoryEnabled(category);
    const categoryTools = getCategoryTools(category);
    const enabledToolCount = categoryTools.filter((tool) => isToolEnabled(tool.id)).length;
    const toolRows = categoryTools
      .map((tool) => {
        const checked = isToolEnabled(tool.id);
        const disabled = !categoryEnabled || (checked && enabledToolCount <= 1);
        return `
          <label class="settings-check">
            <span>${escapeHtml(tool.fullTitle)}</span>
            <input type="checkbox" data-setting-tool="${tool.id}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
          </label>
        `;
      })
      .join("");
    return `
      <div class="settings-subgroup" aria-disabled="${categoryEnabled ? "false" : "true"}">
        <div class="settings-subtitle">${escapeHtml(CATEGORIES[category])}</div>
        ${toolRows}
      </div>
    `;
  }).join("");

  content.innerHTML = `
    <section class="settings-group">
      <div class="settings-group-title"><span>顶部 Tab</span><span>${enabledCategories.length}/${CATEGORY_ORDER.length}</span></div>
      <div class="settings-group-note">至少保留一个。关闭后，对应工具也不会出现在首页搜索里。</div>
      ${CATEGORY_ORDER.map((category) => {
        const checked = isCategoryEnabled(category);
        const disabled = checked && enabledCategories.length <= 1;
        return `
          <label class="settings-check">
            <span>${escapeHtml(CATEGORIES[category])}</span>
            <input type="checkbox" data-setting-category="${category}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />
          </label>
        `;
      }).join("")}
    </section>
    <section class="settings-group">
      <div class="settings-group-title"><span>子 Tab</span></div>
      <div class="settings-group-note">每个开启的顶部 Tab 至少保留一个子工具。</div>
      ${toolGroups}
    </section>
    <section class="settings-group">
      <div class="settings-group-title"><span>Live2D 角色</span></div>
      <div class="settings-group-note">当前只展示一个角色。</div>
      ${roleRows}
    </section>
  `;

  $$("[data-setting-category]").forEach((input) => {
    input.addEventListener("change", () => updateCategorySetting(input.dataset.settingCategory, input.checked));
  });
  $$("[data-setting-tool]").forEach((input) => {
    input.addEventListener("change", () => updateToolSetting(input.dataset.settingTool, input.checked));
  });
  $$("[data-setting-role]").forEach((input) => {
    input.addEventListener("change", () => updateRoleSetting(input.value));
  });
}

function updateCategorySetting(category, enabled) {
  const categories = new Set(state.settings.categories);
  if (enabled) categories.add(category);
  if (!enabled && categories.size > 1) categories.delete(category);
  state.settings.categories = CATEGORY_ORDER.filter((item) => categories.has(item));
  saveSettings();
  applySettingsChange();
}

function updateToolSetting(toolId, enabled) {
  const tool = TOOLS.find((item) => item.id === toolId);
  if (!tool) return;
  const tools = new Set(state.settings.tools);
  const categoryToolIds = getCategoryTools(tool.category).map((item) => item.id);
  const enabledCount = categoryToolIds.filter((id) => tools.has(id)).length;
  if (enabled) tools.add(toolId);
  if (!enabled && enabledCount > 1) tools.delete(toolId);
  state.settings.tools = TOOLS.map((item) => item.id).filter((id) => tools.has(id));
  saveSettings();
  applySettingsChange();
}

function updateRoleSetting(role) {
  if (!LIVE2D_ROLES[role]) return;
  state.settings.live2dRole = role;
  saveSettings();
  renderSettingsPanel();
  initLive2dCompanion({ force: true });
}

function applySettingsChange() {
  saveSettings();
  renderCategoryNav();
  renderSettingsPanel();
  renderSearchResults($("#toolSearchInput")?.value || "");

  const visibleTools = getVisibleTools();
  if (visibleTools.length === 0) return showHome();
  if (!state.inToolsView) return;

  if (!isCategoryEnabled(state.activeCategory)) {
    activateCategory(getEnabledCategories()[0]);
    return;
  }

  const categoryTools = renderToolTabs(state.activeCategory);
  const activeTool = $(".tool-card.active")?.dataset.toolPanel;
  if (!categoryTools.some((tool) => tool.id === activeTool)) {
    activateTool(categoryTools[0]?.id || visibleTools[0].id, { scroll: false });
  }
}

function bindCompanion() {
  const companion = $("#siteCompanion");
  const bubble = $("#companionBubble");
  const stage = $("#companionStage");
  const toggle = $("#companionToggle");
  if (!companion || !bubble || !stage || !toggle) return;

  const collapsed = localStorage.getItem("yifang_toolbox_companion_collapsed") === "1";
  setCompanionCollapsed(collapsed);
  showDailyEncouragementIfNeeded(bubble);

  stage.addEventListener("click", () => {
    state.dailyEncouragementVisible = false;
    companion.classList.remove("has-daily-encouragement");
    state.companionTipIndex = (state.companionTipIndex + 1) % COMPANION_TIPS.length;
    bubble.textContent = COMPANION_TIPS[state.companionTipIndex];
    playCompanionMotion();
  });

  toggle.addEventListener("click", () => {
    setCompanionCollapsed(!companion.classList.contains("is-collapsed"));
  });

  initLive2dCompanion();
}

function showDailyEncouragementIfNeeded(bubble) {
  const today = getLocalDateKey();
  const dateKey = "yifang_toolbox_daily_encouragement_date";
  const indexKey = "yifang_toolbox_daily_encouragement_index";
  if (localStorage.getItem(dateKey) === today) return;

  const index = Math.floor(Math.random() * DAILY_ENCOURAGEMENTS.length);
  bubble.textContent = DAILY_ENCOURAGEMENTS[index];
  state.dailyEncouragementVisible = true;
  $("#siteCompanion")?.classList.add("has-daily-encouragement");
  localStorage.setItem(dateKey, today);
  localStorage.setItem(indexKey, String(index));
  setCompanionCollapsed(false);
  playCompanionMotion();
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setCompanionCollapsed(collapsed) {
  const companion = $("#siteCompanion");
  const toggle = $("#companionToggle");
  if (!companion || !toggle) return;
  companion.classList.toggle("is-collapsed", collapsed);
  toggle.textContent = collapsed ? "伙伴" : "收起";
  toggle.setAttribute("aria-label", collapsed ? "展开工具伙伴" : "收起工具伙伴");
  localStorage.setItem("yifang_toolbox_companion_collapsed", collapsed ? "1" : "0");
}

async function initLive2dCompanion(options = {}) {
  const companion = $("#siteCompanion");
  const canvas = $("#live2dCanvas");
  if (!companion || !canvas) return;
  const roleKey = state.settings?.live2dRole || DEFAULT_SETTINGS.live2dRole;
  const role = LIVE2D_ROLES[roleKey] || LIVE2D_ROLES.default;
  if (!options.force && companion.live2dRole === roleKey && companion.live2dModel) return;

  companion.live2dRole = roleKey;
  companion.classList.toggle("is-fallback-companion", Boolean(role.fallback));
  companion.classList.toggle("is-live2d-loading", !role.fallback);
  companion.classList.remove("is-live2d-ready");

  if (role.fallback) {
    companion.live2dApp?.stage?.removeChildren().forEach((child) => child.destroy?.({ children: true }));
    companion.live2dModel = null;
    companion.classList.remove("is-live2d-loading");
    return;
  }

  if (!window.PIXI?.Application || !window.PIXI?.live2d?.Live2DModel) {
    companion.classList.remove("is-live2d-loading");
    companion.classList.add("is-fallback-companion");
    return;
  }

  try {
    const app =
      companion.live2dApp ||
      new PIXI.Application({
        view: canvas,
        width: 240,
        height: 240,
        autoStart: true,
        transparent: true,
        backgroundAlpha: 0,
        antialias: true,
      });
    app.stage.removeChildren().forEach((child) => child.destroy?.({ children: true }));
    companion.live2dModel = null;
    const model = await PIXI.live2d.Live2DModel.from(role.path, { autoInteract: false });
    model.anchor.set(0.5, 0.9);
    model.position.set(120, 218);
    model.scale.set(role.scale);
    model.interactive = false;
    app.stage.addChild(model);
    companion.classList.add("is-live2d-ready");
    companion.classList.remove("is-live2d-loading");
    companion.live2dApp = app;
    companion.live2dModel = model;
  } catch (error) {
    companion.classList.remove("is-live2d-loading");
    companion.classList.add("is-fallback-companion");
    console.warn("Live2D companion failed to load", error);
  }
}

function playCompanionMotion() {
  const model = $("#siteCompanion")?.live2dModel;
  if (!model?.motion) return;
  const role = LIVE2D_ROLES[state.settings?.live2dRole || DEFAULT_SETTINGS.live2dRole] || LIVE2D_ROLES.default;
  if (!role.tapMotions.length) return;
  const motionIndex = role.tapMotions[Math.floor(Math.random() * role.tapMotions.length)];
  model.motion(role.motionGroup, motionIndex).catch(() => {});
}

function init() {
  state.settings = loadSettings();

  renderCategoryNav();
  bindEvents();
  renderToolTabs(getEnabledCategories()[0]);
  convertTime();
  calcCron();

  if (!openToolFromHash()) {
    showHome();
  }
  document.body.classList.remove("app-loading");
  document.body.classList.add("app-ready");
}

function updateVisitCounter() {
  const key = "yifang_toolbox_visit_count";
  const sessionKey = "yifang_toolbox_visit_counted";
  let current = Number(localStorage.getItem(key) || "0");
  if (!sessionStorage.getItem(sessionKey)) {
    current += 1;
    localStorage.setItem(key, String(current));
    sessionStorage.setItem(sessionKey, "1");
  }
  localStorage.setItem(key, String(current));
  $("#visitCounter").textContent = `访问量 ${current.toLocaleString("zh-CN")}`;
  $("#visitCounter").title = "当前浏览器本地会话访问次数，刷新不重复计数";
}

init();
