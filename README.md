# 二次元カノジョ（AI-coding-HW2）

給喜歡二次元的宅男的陪伴網站：五種宅男類型，各有一位專屬的二次元角色。她會鼓勵你、不會嫌棄你，並且能用你自己的 API Key 跟她聊天。

## 功能

- **五位角色 × 五種宅男類型**：遊戲宅、科技宅、動畫偶像宅、模型機械宅、隱宅。
- **AI 對話**：每位角色有獨立的角色設定與說話風格，回覆以繁體中文為主。
- **BYOK（Bring Your Own Key）**：不用本站的環境變數，使用者在「API 設定」輸入自己的金鑰。
- **金鑰存在瀏覽器**：設定寫入 `localStorage`（key：`ai-coding-hw2.settings.v1`），不會上傳到資料庫。
- **固定模型**：Ollama Cloud `deepseek-v4.1-flash:1017`（本機 Ollama 自動改用別名 `deepseek-v4.1-flash:1017-cloud`）、OpenAI `gpt-6-luna`、Google Gemini `gemini-3.5-flash-lite`。
- **深色響應式介面**：桌機、手機皆可使用；角色插圖為本站自製 AI 圖像。

## 金鑰如何流動

1. 使用者在「API 設定」輸入金鑰，選擇供應商（Ollama / OpenAI / Gemini）。
2. 金鑰只存進瀏覽器的 `localStorage`。
3. 每次送出訊息時，前端以 `Authorization: Bearer <你的 Key>` 呼叫本站的 `POST /api/chat`。
4. 本站伺服器驗證請求、套用角色 system prompt，再把請求轉發給對應供應商：
   - Ollama：`{Base URL}/api/chat`（預設 `https://ollama.com`；本機 `http://localhost:11434`）
   - OpenAI：`{Base URL}/chat/completions`（預設 `https://api.openai.com/v1`）
   - Gemini：`{Base URL}/models/gemini-3.5-flash-lite:generateContent`（預設 `https://generativelanguage.googleapis.com/v1beta`，金鑰以 `x-goog-api-key` 傳送）
5. 伺服器只回傳模型產生的文字，不記錄金鑰或對話內容。

> Base URL 只接受 `ollama.com`、`localhost`、`127.0.0.1`（Ollama）、`api.openai.com`（OpenAI）與 `generativelanguage.googleapis.com`（Gemini）。

## 本機 Ollama（免 API Key）

如果你平常是在 Ollama App / CLI 裡用雲端模型，代表你是用「本機登入憑證」而不是 API Key，直接打 `https://ollama.com/api` 會得到 401 Unauthorized。

1. 確認 Ollama 正在執行，且已登入：
   ```bash
   ollama serve
   ollama signin
   ```
2. 網站「API 設定 → Ollama → 本機 Ollama」按一下儲存，Base URL 會設為 `http://localhost:11434`。
3. API Key 可以留空；聊天時前端不會帶 Authorization，伺服器也不會要求金鑰。

模型會依模式自動切換：直連 `https://ollama.com` 使用 `deepseek-v4.1-flash:1017`；本機 Ollama 使用 `deepseek-v4.1-flash:1017-cloud` 別名，由本機代理到同一個雲端模型。

## 開發

```bash
npm install
npm run dev     # http://localhost:3000（若被占用會自動換埠）
npm run build
npm run lint
```

## 專案結構

```
src/
├─ app/
│  ├─ api/chat/route.ts     # 驗證請求、組 system prompt、代理供應商
│  ├─ globals.css           # Tailwind v4 主題與動畫
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  ├─ home-shell.tsx        # 角色列表、對話狀態、金鑰設定流程
│  ├─ character-card.tsx
│  ├─ chat-panel.tsx
│  ├─ settings-dialog.tsx
│  └─ icons.tsx
└─ lib/
   ├─ characters.ts         # 五位角色的公開資料
   ├─ character-prompts.ts  # 角色 persona 與共同守則（僅伺服器使用）
   ├─ chat-config.ts        # 供應商、模型、訊息型別
   ├─ settings.ts           # localStorage 讀寫
   └─ settings-store.ts     # useSyncExternalStore 的設定來源
```

## 注意事項

- 所有角色皆為虛構的 AI 角色；對話內容由使用者自備的 API Key 生成。
- 角色被設計為不貶低、不製造依賴，也不索取個人資料；若使用者處於心理危機，會引導尋求協助。
- 這是課程作業專案；金鑰透過本站伺服器轉發，請勿在不可信任的部署環境輸入正式金鑰。
