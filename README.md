# 殷學社教育中心 AI 出卷平台

> Yearn Hopes Education Centre — AI-powered Practice Paper Generator

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| 樣式 | Tailwind CSS 3 + 自定義 CSS 變數 |
| 資料庫 | Supabase (PostgreSQL) |
| 認證 | 自建 JWT（jose）+ httpOnly Cookie |
| PDF 生成 | pdfkit + Noto Sans TC 中文字體 |
| 部署 | Vercel |

---

## 快速開始（本機開發）

### 1. 安裝依賴

```bash
npm install
# 或
yarn install
```

### 2. 設定環境變數

複製 `.env.local.example` 為 `.env.local`：

```bash
cp .env.local .env.local
```

填入以下環境變數：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars

# 使用次數限制（設為 false 可停用）
ENABLE_USAGE_LIMITS=true
FREE_USAGE_LIMIT=999

# Mock LLM（設為 false 可切換至真實 Claude API）
USE_MOCK_LLM=true
```

### 3. 建立 Supabase 資料庫

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 建立新專案
3. 進入 **SQL Editor**
4. 貼上 `supabase-schema.sql` 的完整內容並執行
5. 確認所有資料表已建立（parents, children, papers, questions, scores, knowledge_chunks）

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器訪問 `http://localhost:3000`

### 5. 測試帳號

| 欄位 | 值 |
|------|-----|
| 手機號碼 | `12345678` |
| 密碼 | `1234` |

> **注意**：測試帳號的密碼 hash 在 `supabase-schema.sql` 中已預設。若 bcrypt 版本不同導致登入失敗，請手動在 Supabase 中更新 `password_hash` 欄位，或直接透過 `/auth` 頁面重新註冊。

---

## 功能測試步驟

### 家長端流程

1. 訪問 `/auth` → 點擊「使用測試帳號」→ 登入
2. 儀錶板：新增孩子檔案（姓名 + 年級）
3. 點擊「出卷」→ 選擇「小三」→「常識科」→ 下一步
4. 勾選知識點（預設全選）→ 下一步
5. 選擇題型、難度、頁數、作答模式 → 點擊「生成練習卷」
6. 在練習卷詳情頁：
   - 點擊「下載題目卷」→ 確認 PDF 含斜角浮水印
   - 點擊「下載答案卷」→ 確認 PDF 不含浮水印
   - 點擊「開始線上作答」→ 進入孩子端 PWA

### 孩子端流程

1. 訪問 `/practice/[paper-id]`
2. 逐題作答（選擇題點選選項、填充題輸入文字）
3. 點擊「提交作答」→ 查看成績結果
4. 返回儀錶板 → 確認成績已記錄

### PDF 模式流程

1. 出卷時選擇「PDF 下載」模式
2. 下載題目卷後手動作答
3. 在練習卷詳情頁點擊「手動輸入成績」
4. 填入總題數與正確題數 → 確認記錄

---

## 環境變數說明

| 變數名 | 說明 | 預設值 |
|--------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | 必填 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | 必填 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務角色金鑰（繞過 RLS） | 必填 |
| `JWT_SECRET` | JWT 簽名密鑰（至少 32 字元） | 必填 |
| `ENABLE_USAGE_LIMITS` | 是否啟用使用次數限制 | `true` |
| `FREE_USAGE_LIMIT` | 免費版最大出卷次數 | `999` |
| `USE_MOCK_LLM` | 使用 Mock LLM（`false` 切換真實 API） | `true` |

---

## Claude API 切換說明

目前系統使用 **Mock LLM**，題目由預設知識庫隨機生成。

切換至真實 Claude API：

1. 在 `.env.local` 設定：
   ```env
   USE_MOCK_LLM=false
   ANTHROPIC_API_KEY=sk-ant-...
   ```

2. 修改 `src/lib/mockLLM.ts` 中的 `generateQuestions` 函式：
   ```typescript
   // 在函式頂部
   if (process.env.USE_MOCK_LLM !== 'false') {
     return generateMockQuestions(params) // 目前使用 Mock
   }
   // 以下加入真實 Claude API 呼叫
   const response = await anthropic.messages.create({
     model: 'claude-3-5-sonnet-20241022',
     max_tokens: 4096,
     messages: [{ role: 'user', content: buildPrompt(params) }]
   })
   ```

---

## Vercel 部署步驟

### 方法一：GitHub 整合（推薦）

1. 將專案推送至 GitHub：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/yearn-paper.git
   git push -u origin main
   ```

2. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
3. 點擊「New Project」→ 選擇 GitHub 倉庫
4. 在「Environment Variables」填入所有環境變數
5. 點擊「Deploy」

### 方法二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### 重要注意事項

- **字體檔案**：`fonts/` 目錄中的 Noto Sans TC 字體（約 11MB）需要包含在部署中
- **Vercel 免費方案**：函式執行時間上限 10 秒，PDF 生成可能超時，建議升級至 Pro
- **環境變數**：`SUPABASE_SERVICE_ROLE_KEY` 為敏感資訊，確保只在 Vercel 後端環境設定

---

## 檔案結構

```
yearn-paper-next/
├── fonts/                          # Noto Sans TC 中文字體
│   ├── NotoSansTC-Regular.otf
│   └── NotoSansTC-Bold.otf
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 根 Layout（PWA meta、字體）
│   │   ├── globals.css             # 全域設計系統（CSS 變數）
│   │   ├── page.tsx                # 首頁 Landing Page
│   │   ├── auth/page.tsx           # 登入/註冊頁面
│   │   ├── dashboard/page.tsx      # 家長儀錶板
│   │   ├── create/
│   │   │   ├── step1/page.tsx      # 出卷第一步：年級/科目
│   │   │   ├── step2/page.tsx      # 出卷第二步：知識點
│   │   │   └── step3/page.tsx      # 出卷第三步：題型設定
│   │   ├── paper/[id]/page.tsx     # 練習卷詳情頁
│   │   ├── practice/[id]/page.tsx  # 孩子端 PWA 作答頁
│   │   ├── scores/page.tsx         # 成績記錄頁
│   │   └── api/
│   │       ├── auth/               # 登入/註冊/登出/me
│   │       ├── children/           # 孩子檔案 CRUD
│   │       ├── papers/             # 練習卷 CRUD + 生成
│   │       ├── questions/          # 題目查詢 + 提交作答
│   │       ├── scores/             # 成績記錄
│   │       └── knowledge/          # 知識庫查詢
│   ├── components/
│   │   ├── AppLayout.tsx           # 共用導航 + 免責聲明
│   │   └── StepIndicator.tsx       # 步驟進度指示器
│   └── lib/
│       ├── supabase.ts             # Supabase 客戶端
│       ├── session.ts              # JWT session 工具
│       ├── knowledgeBase.ts        # 知識庫資料（10 個知識點）
│       ├── mockLLM.ts              # Mock LLM 題目生成
│       └── usageLimits.ts          # 使用次數限制
├── supabase-schema.sql             # 完整資料庫 Schema
├── .env.local                      # 環境變數（不提交至 Git）
└── package.json
```

---

## 免責聲明

本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。題目內容已力求準確，惟如有任何錯誤或遺漏，本中心恕不負責。如有疑問，請向老師查詢。

© 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.
