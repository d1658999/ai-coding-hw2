# 二次元カノジョ（AI-coding-HW2）

給喜歡二次元的宅男的陪伴網站：五種宅男類型，各有一位專屬的二次元角色。她會鼓勵你、不會嫌棄你，並且能用你自己的 API Key 跟她聊天。

## 功能

- **五位角色 × 五種宅男類型**：遊戲宅、科技宅、動畫偶像宅、模型機械宅、隱宅。
- **AI 對話**：每位角色有獨立的角色設定與說話風格，回覆以繁體中文為主。
- **BYOK（Bring Your Own Key）**：不用本站的環境變數，使用者在「API 設定」輸入自己的金鑰。
- **金鑰存在瀏覽器**：設定寫入 `localStorage`（key：`ai-coding-hw2.settings.v1`），不會上傳到資料庫。
- **固定模型**：Ollama 只使用 `deepseek-v4.1-flash:1017-cloud`；OpenAI 只使用 `gpt-6-luna`。
- **深色響應式介面**：桌機、手機皆可使用；角色插圖為本站自製 AI 圖像。

## 金鑰如何流動

1. 使用者在「API 設定」輸入金鑰，選擇供應商（Ollama / OpenAI）。
2. 金鑰只存進瀏覽器的 `localStorage`。
3. 每次送出訊息時，前端以 `Authorization: Bearer <你的 Key>` 呼叫本站的 `POST /api/chat`。
4. 本站伺服器驗證請求、套用角色 system prompt，再把請求轉發給對應供應商：
   - Ollama：`{Base URL}/api/chat`（預設 `https://ollama.com`）
   - OpenAI：`{Base URL}/chat/completions`（預設 `https://api.openai.com/v1`）
5. 伺服器只回傳模型產生的文字，不記錄金鑰或對話內容。

> Base URL 只接受 `ollama.com`、`localhost`、`127.0.0.1`（Ollama）與 `api.openai.com`（OpenAI）；本機 Ollama 可用 `http://localhost:11434`。

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
