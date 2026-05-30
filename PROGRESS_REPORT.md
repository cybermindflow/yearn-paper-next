# PROGRESS_REPORT.md — 殷學社教育中心 AI 出卷平台

**版本：** Phase 1 MVP  
**日期：** 2026-05-31  
**技術棧：** Next.js 14 (App Router) + Supabase + Vercel  

---

## ✅ 已完成功能清單

以下逐項對照 Phase 1 驗收標準：

### 1. 家長端帳號系統

| 項目 | 狀態 | 說明 |
|------|------|------|
| 手機號碼註冊 | ✅ 完成 | `/api/auth/register`，bcryptjs 加密密碼 |
| 手機號碼登入 | ✅ 完成 | `/api/auth/login`，JWT httpOnly Cookie |
| 預設測試帳號 | ✅ 完成 | `12345678` / `1234`，在 `supabase-schema.sql` 中預設 |
| 登出功能 | ✅ 完成 | `/api/auth/logout`，清除 Cookie |
| Session 保持 | ✅ 完成 | 7 天 JWT，`yearn_parent_session` Cookie |

### 2. 家長儀錶板

| 項目 | 狀態 | 說明 |
|------|------|------|
| 孩子檔案顯示 | ✅ 完成 | 顯示姓名、年級，支援新增/刪除 |
| 歷次出卷記錄 | ✅ 完成 | 列出所有練習卷，含日期、科目、狀態 |
| 成績概覽 | ✅ 完成 | 顯示最近成績，含正確率 |
| 快速出卷入口 | ✅ 完成 | 儀錶板直接跳轉至出卷第一步 |

### 3. 三步出卷流程

| 項目 | 狀態 | 說明 |
|------|------|------|
| 第一步：年級/科目選擇 | ✅ 完成 | 小三常識科可選，其餘灰色不可選 |
| 第二步：知識點勾選 | ✅ 完成 | 10 個知識點，支援全選/清除 |
| 第三步：題型與參數設定 | ✅ 完成 | 7 種題型、3 級難度、1-6 頁、線上/PDF 模式 |
| 步驟進度指示器 | ✅ 完成 | `StepIndicator` 元件，顯示當前步驟 |
| 非可選項目灰色顯示 | ✅ 完成 | 除小三常識科外，所有選項 `opacity-40 cursor-not-allowed` |

### 4. 題目生成邏輯

| 項目 | 狀態 | 說明 |
|------|------|------|
| 知識庫（10 個知識點） | ✅ 完成 | `src/lib/knowledgeBase.ts`，小三常識科生活多姿彩單元一 |
| Mock LLM 題目生成 | ✅ 完成 | `src/lib/mockLLM.ts`，支援 7 種題型 |
| API 切換開關 | ✅ 完成 | `USE_MOCK_LLM` 環境變數，`false` 切換真實 API |
| 題目存入資料庫 | ✅ 完成 | 生成後存入 Supabase `questions` 表 |

### 5. 孩子端 PWA

| 項目 | 狀態 | 說明 |
|------|------|------|
| 練習卷詳情頁 | ✅ 完成 | `/paper/[id]`，含下載、作答、手動成績入口 |
| 線上作答介面 | ✅ 完成 | `/practice/[id]`，計時器、逐題作答 |
| 客觀題自動批改 | ✅ 完成 | MC、TF、填充、配對、分類題自動判斷正誤 |
| 主觀題參考答案 | ✅ 完成 | 問答題顯示參考答案並提示「需人手核對」 |
| 作答結果頁 | ✅ 完成 | 顯示正確率、各題對錯、解釋 |

### 6. PDF 生成與下載

| 項目 | 狀態 | 說明 |
|------|------|------|
| 題目卷 PDF | ✅ 完成 | 含斜角「殷學社教育中心」浮水印（所有頁面） |
| 答案卷 PDF | ✅ 完成 | 不含浮水印，含答案與解釋 |
| 中文字體支援 | ✅ 完成 | Noto Sans TC OTF 字體嵌入 |
| 免責聲明 | ✅ 完成 | 顯示於 PDF 每頁底部 |
| 多頁浮水印 | ✅ 完成 | 使用 `bufferPages + switchToPage` 對所有頁面套用 |

### 7. 成績記錄

| 項目 | 狀態 | 說明 |
|------|------|------|
| 線上作答自動記錄 | ✅ 完成 | 提交後自動計算並存入 `scores` 表 |
| PDF 模式手動輸入 | ✅ 完成 | 練習卷詳情頁提供手動輸入表單 |
| 成績列表頁 | ✅ 完成 | `/scores`，顯示所有成績記錄 |
| 正確率計算 | ✅ 完成 | 客觀題自動計算，主觀題排除在外 |
| 用時記錄 | ✅ 完成 | 線上作答模式記錄秒數 |

### 8. 免費版使用次數限制

| 項目 | 狀態 | 說明 |
|------|------|------|
| 使用次數限制邏輯 | ✅ 完成 | `src/lib/usageLimits.ts` |
| 程式碼開關 | ✅ 完成 | `ENABLE_USAGE_LIMITS` 環境變數 |
| MVP 設定 999 次 | ✅ 完成 | `FREE_USAGE_LIMIT=999` |
| 超限提示 | ✅ 完成 | 超過限制時回傳 403 錯誤並顯示提示 |

### 9. PWA 設定

| 項目 | 狀態 | 說明 |
|------|------|------|
| manifest.json | ✅ 完成 | `public/manifest.json`，含圖示、主題色 |
| Apple Web App meta | ✅ 完成 | `layout.tsx` 中設定 `appleWebApp` |
| 主題色 | ✅ 完成 | `#2d6a4f`（殷學社品牌綠） |
| 安裝至主畫面 | ✅ 完成 | `display: standalone` |

### 10. 響應式設計

| 項目 | 狀態 | 說明 |
|------|------|------|
| 手機版適配 | ✅ 完成 | 所有頁面使用 Tailwind 響應式斷點 |
| 桌面版適配 | ✅ 完成 | 最大寬度 `max-w-5xl`，居中佈局 |
| 行動導航 | ✅ 完成 | 漢堡選單，`md:hidden` 切換 |

### 11. 免責聲明

| 項目 | 狀態 | 說明 |
|------|------|------|
| 頁面底部 | ✅ 完成 | `AppLayout` footer，所有頁面顯示 |
| PDF 文件中 | ✅ 完成 | 每頁底部 7pt 小字 |

---

## ❌ 未完成或已知問題

| 問題 | 優先級 | 說明 |
|------|--------|------|
| 測試帳號密碼 hash 需確認 | 高 | `supabase-schema.sql` 中的 bcrypt hash 需在目標環境重新生成，建議直接透過 `/auth` 頁面重新註冊 |
| Vercel 部署需手動設定環境變數 | 高 | 需在 Vercel Dashboard 填入 Supabase 金鑰 |
| 孩子端獨立登入 | 低 | 目前孩子端透過家長端連結進入，無獨立帳號系統 |
| 成績知識點分析 | 低 | 目前僅記錄總體正確率，未細分各知識點表現 |

---

## 📂 檔案結構說明

```
yearn-paper-next/
├── fonts/
│   ├── NotoSansTC-Regular.otf      # 中文字體（PDF 用）
│   └── NotoSansTC-Bold.otf         # 中文粗體（PDF 用）
├── public/
│   └── manifest.json               # PWA manifest
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
│   │       ├── auth/login/         # POST 登入
│   │       ├── auth/register/      # POST 註冊
│   │       ├── auth/logout/        # POST 登出
│   │       ├── auth/me/            # GET 當前用戶
│   │       ├── children/           # GET/POST 孩子檔案
│   │       ├── papers/             # GET/POST 練習卷
│   │       ├── papers/[id]/        # GET 單一練習卷
│   │       ├── papers/[id]/generate/ # POST 生成題目
│   │       ├── papers/[id]/pdf/    # GET PDF 下載
│   │       ├── questions/[paperId]/ # GET 題目列表
│   │       ├── questions/[paperId]/submit/ # POST 提交作答
│   │       ├── scores/             # GET/POST 成績
│   │       └── knowledge/          # GET 知識庫
│   ├── components/
│   │   ├── AppLayout.tsx           # 共用導航 + 免責聲明
│   │   └── StepIndicator.tsx       # 步驟進度指示器
│   └── lib/
│       ├── supabase.ts             # Supabase 客戶端（anon + service role）
│       ├── session.ts              # JWT session 工具（jose）
│       ├── knowledgeBase.ts        # 知識庫資料（10 個知識點）
│       ├── mockLLM.ts              # Mock LLM 題目生成（7 種題型）
│       └── usageLimits.ts          # 使用次數限制工具
├── supabase-schema.sql             # 完整資料庫 Schema + 知識庫資料
├── README.md                       # 完整開發文件
├── PROGRESS_REPORT.md              # 本報告
├── .env.local                      # 環境變數範本（不提交 Git）
└── package.json
```

---

## 💾 Supabase 資料庫設定說明

### 步驟一：建立 Supabase 專案

1. 訪問 [https://supabase.com](https://supabase.com) 並登入
2. 點擊「New Project」
3. 填入專案名稱（建議：`yearn-paper`）
4. 選擇資料庫密碼（請妥善保存）
5. 選擇最近的地區（建議：Southeast Asia）

### 步驟二：執行 Schema SQL

1. 進入 Supabase Dashboard → **SQL Editor**
2. 點擊「New Query」
3. 貼上 `supabase-schema.sql` 的完整內容
4. 點擊「Run」執行
5. 確認以下資料表已建立：
   - `parents`（含測試帳號）
   - `children`
   - `papers`
   - `questions`
   - `scores`
   - `knowledge_chunks`（含 10 個知識點）

### 步驟三：取得 API 金鑰

1. 進入 **Project Settings → API**
2. 複製以下金鑰至 `.env.local`：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 保密，不可暴露於前端）

### 知識庫 JSON 匯入

知識庫資料已直接包含在 `supabase-schema.sql` 的 `INSERT INTO knowledge_chunks` 語句中，無需額外匯入 JSON 檔案。

---

## ⚙️ Claude API 設定說明

### 目前狀態：Mock LLM（預設）

系統預設使用 Mock LLM，題目由 `src/lib/mockLLM.ts` 根據知識庫隨機生成，**無需任何 API 金鑰**。

Mock LLM 支援以下 7 種題型：
- `mc`：選擇題（4 個選項）
- `tf`：判斷題（對/錯）
- `fill`：填充題
- `match`：配對題
- `classify`：分類題
- `short`：問答題（短答）
- `essay`：問答題（長答）

### 切換至真實 Claude API

**步驟一：設定環境變數**

```env
USE_MOCK_LLM=false
ANTHROPIC_API_KEY=sk-ant-api03-...
```

**步驟二：修改 `src/lib/mockLLM.ts`**

在 `generateQuestions` 函式頂部找到以下程式碼：

```typescript
if (process.env.USE_MOCK_LLM !== 'false') {
  console.log('[LLM] Using Mock LLM...')
  return generateMockQuestions(params)
}
// TODO: Replace with real Claude API call
console.warn('[LLM] USE_MOCK_LLM=false but real API not implemented yet')
return generateMockQuestions(params)
```

替換為真實 API 呼叫：

```typescript
if (process.env.USE_MOCK_LLM !== 'false') {
  return generateMockQuestions(params)
}

// 真實 Claude API
const Anthropic = (await import('@anthropic-ai/sdk')).default
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const response = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 8192,
  messages: [{
    role: 'user',
    content: buildClaudePrompt(params)
  }]
})
return parseClaudeResponse(response.content[0].text)
```

---

## 🧪 本機測試步驟

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.local .env.local
# 填入 Supabase URL、金鑰、JWT_SECRET

# 3. 啟動開發伺服器
npm run dev

# 4. 訪問 http://localhost:3000

# 5. 登入測試帳號
# 手機：12345678 / 密碼：1234

# 6. 測試出卷流程
# 儀錶板 → 出卷 → 選擇小三常識科 → 選知識點 → 設定題型 → 生成

# 7. 測試 PDF 下載
# 練習卷詳情頁 → 下載題目卷（含浮水印）/ 下載答案卷

# 8. 測試線上作答
# 練習卷詳情頁 → 開始線上作答 → 逐題作答 → 提交
```

---

## 🌐 Vercel 部署步驟

### 方法一：GitHub 整合

```bash
# 1. 初始化 Git
git init
git add .
git commit -m "feat: 殷學社教育中心 AI 出卷平台 Phase 1"

# 2. 建立 GitHub 倉庫並推送
gh repo create yearn-paper --private
git remote add origin https://github.com/YOUR_USERNAME/yearn-paper.git
git push -u origin main

# 3. 在 Vercel Dashboard 匯入 GitHub 倉庫
# https://vercel.com/new

# 4. 設定環境變數（在 Vercel Dashboard > Settings > Environment Variables）
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
ENABLE_USAGE_LIMITS=true
FREE_USAGE_LIMIT=999
USE_MOCK_LLM=true

# 5. 點擊 Deploy
```

### 方法二：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
# 按照提示設定環境變數
```

### 部署注意事項

1. **字體檔案**：`fonts/` 目錄中的 Noto Sans TC 字體必須包含在部署中（已在 `.gitignore` 中排除，需手動確認）
2. **函式超時**：Vercel 免費方案 API Routes 超時 10 秒，PDF 生成可能超時，建議升級至 Pro（60 秒）
3. **環境變數**：`SUPABASE_SERVICE_ROLE_KEY` 只應設定在 Vercel 後端，不可設定為 `NEXT_PUBLIC_` 前綴

---

*報告生成時間：2026-05-31*  
*殷學社教育中心 Yearn Hopes Education Centre*
