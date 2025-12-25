import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 静态前端
app.use(express.static(path.join(__dirname, "public")));

function getSystemPrompt() {
  // ✅ Zeabur 有时多行会被处理得不一致：支持 \n 转换（推荐）
  const raw = process.env.SYSTEM_PROMPT || "";
  const fromEnv = raw.replace(/\\n/g, "\n").trim();

  if (fromEnv) return fromEnv;

  // ✅ 兜底默认 prompt
  return `
你是一个专业的日语翻译与润色助手。我会给你一个单词或短语，可能是中文、日语或其他任何语言。

规则：
- 如果输入不是日语：将其翻译成自然、地道的日语。
- 如果输入已经是日语：请将其润色为更通顺、更自然的日语（可纠正不自然表达、用词、语法、敬语；保留原意，不要改成不同意思）。
- 专有名词、数字、单位尽量保留（必要时可补充常见日语写法）。
- 输出只包含指定格式内容，不要额外解释或客套话。

输出内容必须包含：
1. 日语翻译：
2. 假名拼读：
3. 解释：
4. 例句：至少3句（每句附中文翻译）

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
例句 3（日语） - 中文翻译
`.trim();
}



function extractOutputText(data) {
  // 1) 最常见
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  // 2) 有些返回会把文本放到 output 数组里（多段 content）
  const chunks = [];
  const out = data?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          // 兼容 text 字段
          if (typeof c?.text === "string") chunks.push(c.text);
          // 兼容其他可能字段（保守兜底）
          else if (typeof c?.content === "string") chunks.push(c.content);
        }
      }
    }
  }
  const joined = chunks.join("").trim();
  if (joined) return joined;

  // 3) 兜底：把整个返回 JSON 打出来，方便你排查（线上建议关掉）
  return "";
}


app.post("/api/translate", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const systemPrompt = getSystemPrompt();

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const data = await resp.json();
    const outputText = extractOutputText(data);
    
    res.json({ result: (outputText || "").trim() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 健康检查（可选，Zeabur 有时会用到）
app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Listening on", port));
