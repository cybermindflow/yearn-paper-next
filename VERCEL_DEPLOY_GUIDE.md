# 殷學社教育中心 — Vercel 部署詳盡指引

> 預計完成時間：約 10–15 分鐘  
> 難度：初學者友善

---

## 前置準備（需要的帳號）

| 帳號 | 用途 | 免費方案 |
|------|------|----------|
| [Supabase](https://supabase.com) | 資料庫（PostgreSQL） | ✅ 免費 |
| [Vercel](https://vercel.com) | 部署平台 | ✅ 免費 |
| [GitHub](https://github.com) | 程式碼儲存庫 | ✅ 免費 |

---

## 第一步：建立 Supabase 資料庫

### 1.1 建立新專案

1. 前往 [https://supabase.com](https://supabase.com) 並登入
2. 點擊右上角 **「New project」**
3. 填寫：
   - **Project name**：`yearn-paper`
   - **Database Password**：設定一個強密碼（請記下，後面不需要用到）
   - **Region**：選擇 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
4. 點擊 **「Create new project」**，等待約 1–2 分鐘建立完成

### 1.2 執行 Schema SQL

1. 在 Supabase Dashboard 左側選單點擊 **「SQL Editor」**
2. 點擊 **「New query」**
3. 將 `supabase-schema.sql` 的**完整內容**貼上
4. 點擊右下角 **「Run」**（或按 `Ctrl+Enter`）
5. 確認底部顯示 **「Success. No rows returned」** 或類似成功訊息

> ⚠️ 如果出現 `already exists` 錯誤，可以忽略，這是正常的（因為 SQL 使用了 `IF NOT EXISTS`）

### 1.3 取得 API 金鑰

1. 在左側選單點擊 **「Project Settings」**（齒輪圖示）
2. 點擊 **「API」**
3. 記下以下三個值：

```
Project URL:       https://xxxxxxxxxxxx.supabase.co
anon public key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（很長的字串）
service_role key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...（另一個很長的字串）
```

> ⚠️ `service_role key` 擁有完整資料庫存取權限，**絕對不要公開**

---

## 第二步：將程式碼推送至 GitHub

### 2.1 解壓 ZIP 並初始化 Git

```bash
# 解壓 ZIP
unzip yearn-paper-nextjs-complete.zip
cd yearn-paper-next

# 安裝依賴（確認可以正常運行）
npm install

# 初始化 Git 儲存庫
git init
git add .
git commit -m "feat: initial commit - 殷學社教育中心 AI 出卷平台"
```

### 2.2 在 GitHub 建立新儲存庫

1. 前往 [https://github.com/new](https://github.com/new)
2. 填寫：
   - **Repository name**：`yearn-paper`
   - **Visibility**：選 `Private`（建議）
3. **不要**勾選「Add a README file」
4. 點擊 **「Create repository」**

### 2.3 推送程式碼

複製 GitHub 頁面上顯示的指令，類似：

```bash
git remote add origin https://github.com/你的用戶名/yearn-paper.git
git branch -M main
git push -u origin main
```

---

## 第三步：在 Vercel 部署

### 3.1 匯入 GitHub 儲存庫

1. 前往 [https://vercel.com/new](https://vercel.com/new)
2. 點擊 **「Import Git Repository」**
3. 找到 `yearn-paper` 並點擊 **「Import」**

### 3.2 設定環境變數（最重要的步驟）

在 **「Configure Project」** 頁面，展開 **「Environment Variables」** 區塊，逐一新增以下變數：

| 變數名稱 | 值 | 說明 |
|---------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | 第一步 1.3 的 Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | 第一步 1.3 的 anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | 第一步 1.3 的 service_role key |
| `JWT_SECRET` | 任意 32 位以上隨機字串 | 例如：`yearn-paper-jwt-2026-super-secret-key` |
| `ENABLE_USAGE_LIMITS` | `true` | 啟用使用次數限制 |
| `FREE_USAGE_LIMIT` | `999` | MVP 測試期間設為 999 次 |
| `USE_MOCK_LLM` | `true` | 使用 Mock LLM（改為 `false` 切換真實 API） |

**新增方式：**
1. 在「Name」欄填入變數名稱
2. 在「Value」欄填入對應值
3. 點擊 **「Add」**
4. 重複以上步驟直到所有變數都加入

### 3.3 確認 Framework 設定

Vercel 應該自動偵測到 Next.js，確認以下設定：
- **Framework Preset**：`Next.js`
- **Root Directory**：`./`（預設）
- **Build Command**：`npm run build`（預設）
- **Output Directory**：`.next`（預設）

### 3.4 部署

點擊 **「Deploy」** 按鈕，等待約 2–3 分鐘。

部署成功後，Vercel 會顯示：
```
🎉 Congratulations! Your project has been successfully deployed.
```

並提供一個類似 `https://yearn-paper-xxxx.vercel.app` 的網址。

---

## 第四步：驗證部署

### 4.1 測試登入

1. 開啟 Vercel 提供的網址
2. 點擊 **「家長登入」**
3. 輸入測試帳號：
   - **手機號碼**：`12345678`
   - **密碼**：`1234`
4. 確認成功進入儀錶板

### 4.2 測試出卷流程

1. 在儀錶板點擊 **「+ 出卷」**
2. 第一步：選擇「小三」→「常識科」→ 下一步
3. 第二步：勾選知識點 → 全選 → 下一步
4. 第三步：選擇題型、難度、頁數 → 點擊「生成練習卷」
5. 確認題目生成成功

### 4.3 測試 PDF 下載

1. 進入練習卷詳情頁
2. 點擊「下載題目卷」
3. 確認 PDF 含「殷學社教育中心」斜角浮水印

---

## 常見問題排解

### Q: 部署失敗，顯示 Build Error

**原因**：環境變數未設定或設定錯誤

**解決方法**：
1. 在 Vercel Dashboard 進入專案 → Settings → Environment Variables
2. 確認所有 7 個環境變數都已正確設定
3. 點擊 Deployments → 最新部署 → 右上角 **「Redeploy」**

---

### Q: 登入失敗，顯示「手機號碼或密碼錯誤」

**原因**：Supabase Schema SQL 未正確執行，測試帳號未建立

**解決方法**：
1. 前往 Supabase Dashboard → SQL Editor
2. 執行以下 SQL 確認測試帳號是否存在：
   ```sql
   SELECT phone, nickname FROM parents WHERE phone = '12345678';
   ```
3. 如果沒有結果，重新執行 `supabase-schema.sql`

---

### Q: PDF 下載失敗或顯示亂碼

**原因**：字體檔案未正確包含在部署中

**解決方法**：
確認 `next.config.mjs` 包含以下設定（已預設包含）：
```js
outputFileTracingIncludes: {
  '/api/papers/[id]/pdf': ['./fonts/**'],
},
```

---

### Q: 如何切換至真實 Claude API

1. 在 Vercel Dashboard → Settings → Environment Variables
2. 將 `USE_MOCK_LLM` 改為 `false`
3. 新增 `ANTHROPIC_API_KEY`：填入您的 Claude API Key
4. Redeploy

---

## 環境變數完整清單

```bash
# 必填（Supabase）
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 必填（安全）
JWT_SECRET=yearn-paper-jwt-2026-super-secret-key-change-me

# 選填（功能開關，以下為預設值）
ENABLE_USAGE_LIMITS=true
FREE_USAGE_LIMIT=999
USE_MOCK_LLM=true

# 選填（切換真實 Claude API 時需要）
# ANTHROPIC_API_KEY=sk-ant-...
```

---

## 本機開發設定

```bash
# 1. 解壓並進入目錄
unzip yearn-paper-nextjs-complete.zip && cd yearn-paper-next

# 2. 安裝依賴
npm install

# 3. 建立 .env.local（複製以下內容並填入您的 Supabase 金鑰）
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=local-dev-secret-2026
ENABLE_USAGE_LIMITS=true
FREE_USAGE_LIMIT=999
USE_MOCK_LLM=true
EOF

# 4. 啟動開發伺服器
npm run dev

# 5. 開啟瀏覽器
open http://localhost:3000
```

---

*文件版本：1.0.0 | 殷學社教育中心 AI 出卷平台*
