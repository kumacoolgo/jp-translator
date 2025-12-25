---

日语翻译助手

一个基于 OpenAI API 的日语翻译与润色网页工具。
支持 非日语 → 日语翻译，以及 日语输入的自然润色，并输出假名读音、简要解释和例句。

功能

自动判断输入语言（中文 / 日语 / 其他）

日语翻译或润色（更自然、更通顺）

输出：

日语翻译

假名拼读（平假名）

中文解释

至少 3 个日常例句（含中文翻译）


前端一键翻译、清空

后端可配置模型与 Prompt（环境变量）



---

技术栈

Node.js 18+

Express

OpenAI Responses API

前端：原生 HTML / JS

部署：Zeabur



---

本地运行

npm install
npm start

访问：

http://localhost:3000


---

环境变量

在 Zeabur 或本地设置以下变量：

OPENAI_API_KEY=sk-xxxxxxxx
OPENAI_MODEL=gpt-4.1-mini
SYSTEM_PROMPT=你的 system prompt（支持 \n 换行）

可选：

DEBUG_OPENAI=1


---

部署（Zeabur）

1. 将项目推送到 GitHub


2. 在 Zeabur 创建 Node.js 项目


3. 配置环境变量


4. 部署完成后访问分配的域名




---

说明

API Key 请勿暴露在前端

模型名称需以 OpenAI 官方文档为准

可通过修改环境变量快速切换模型或调整输出规则



---

License

MIT


---
