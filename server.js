import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 静态前端 =====
app.use(express.static(path.join(__dirname, "public")));

// ===== 从环境变量读取 System Prompt（支持 \n）=====
function getSystemPrompt() {
  const raw = process.env.SYSTEM_PROMPT || "";
  const fromEnv = raw.replace(/\\n/g, "\n").trim();
  if (fromEnv) return fromEnv;

  // 兜底默认 prompt（你也可以完全删掉，只依赖 env）
  return `
你是一个专业的日语翻译与润色助手。我会给你一个单词或短语，可能是中文、日语或其他任何语言。

规则：
- 如果输入不是日语：将其翻译成自然、地道的日语。
- 如果输入已经是日语：请将其润色为更通顺、更自然的日语（可纠正不自然表达、用词、语法、敬语；保留原意，不要改成不同意思）。
- 专有名词、数字、单位尽量保留（必要时可补充常见日语写法）。
- 输出只包含指定格式内容，不要额外解释或客套话。
- 不要写百科式长段落，不要展开背景知识。
- “假名拼读”只写对应日语译词的读音，不要把中文解释或多余内容写进来；英文缩写按日语常见读法。

输出内容必须包含：
1. 日语翻译：
2. 假名拼读：
3. 解释：
4. 例句：至少2句（每句附中文翻译）

严格按以下字段名逐行输出（字段名必须一模一样）：
日语翻译：
假名拼读：
解释：
例句：

回答格式如下：
日语翻译：
假名拼读：
解释：
例句：
例句 1（日语） - 中文翻译
例句 2（日语） - 中文翻译
`.trim();
}

// ===== 提取返回文本（兼容不同返回结构）=====
function extractOutputText(data) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks = [];
  const out = data?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (typeof c?.text === "string") chunks.push(c.text);
          else if (typeof c?.content === "string") chunks.push(c.content);
        }
      }
    }
  }

  const joined = chunks.join("").trim();
  if (joined) return joined;

  return "";
}

// ===== 翻译接口 =====
app.post("/api/translate", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not set" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";
    const systemPrompt = getSystemPrompt();

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 420,
        temperature: 0.2,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ]
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const data = await resp.json();
    const outputText = extractOutputText(data);

    // 可选：调试用（不要长期开，避免日志太长）
    if (!outputText && process.env.DEBUG_OPENAI === "1") {
      console.log("OpenAI raw response:", JSON.stringify(data).slice(0, 4000));
    }

    return res.json({ result: outputText || "" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

// 健康检查（可选）
app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
