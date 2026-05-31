# Yearn-paper 進度報告（Progress Report）

**專案名稱**：殷學社教育中心 AI 智能出卷平台  
**Vercel URL**：https://yearn-paper-next.vercel.app/  
**GitHub Repo**：私有倉庫（cybermindflows/yearn-paper-next）  
**最後更新**：2026-05-31  
**最新 Commit**：`6a37dfd93fe4edee58f1457c131f6a0620a5b1ae`

---

## 一、整體架構概覽

| 層次 | 技術選型 | 說明 |
|------|----------|------|
| 前端框架 | Next.js 14 (App Router) | React Server Components + Client Components |
| 樣式 | Tailwind CSS | 響應式設計 |
| 後端 API | Next.js Route Handlers | `/api/*` REST API |
| 資料庫 | Supabase (PostgreSQL) | 雲端託管，免費方案 |
| 部署平台 | Vercel | 自動 CI/CD，免費方案 |
| AI 出題 | Mock LLM（可切換 OpenAI） | 由 `USE_MOCK_LLM` 環境變數控制 |
| 認證方式 | 手機號 + 密碼 + JWT Cookie | httpOnly Cookie，7 天有效期 |

---

## 二、資料庫 Schema（最終版）

### `parents` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| phone | VARCHAR(20) | 手機號（唯一） |
| password_hash | TEXT | bcrypt 雜湊 |
| name | VARCHAR(100) | 家長姓名 |
| created_at | TIMESTAMPTZ | 建立時間 |

### `children` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| parent_id | UUID | 外鍵 → parents |
| name | VARCHAR(100) | 孩子姓名 |
| grade | VARCHAR(20) | 年級 |
| created_at | TIMESTAMPTZ | 建立時間 |

### `papers` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| parent_id | UUID | 外鍵 → parents |
| child_id | UUID | 外鍵 → children（可為空） |
| subject | VARCHAR(50) | 科目 |
| grade | VARCHAR(20) | 年級 |
| topic | VARCHAR(200) | 主題/單元 |
| question_count | INTEGER | 題目數量 |
| question_types | TEXT | 題型（JSON 字串） |
| **mode** | VARCHAR(20) | **學習模式**：practice \| diagnosis \| exam（Phase 1 新增） |
| **delivery_mode** | VARCHAR(20) | **交付方式**：online \| pdf（原 mode 欄位重命名） |
| status | VARCHAR(20) | generated \| completed |
| created_at | TIMESTAMPTZ | 建立時間 |

### `questions` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| paper_id | UUID | 外鍵 → papers |
| question_number | INTEGER | 題號 |
| type | VARCHAR(20) | mc \| tf \| short |
| question_text | TEXT | 題目內容 |
| options | TEXT | 選項（JSON 字串，MC 用） |
| correct_answer | TEXT | 正確答案 |
| explanation | TEXT | 解題說明 |
| created_at | TIMESTAMPTZ | 建立時間 |

### `scores` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| paper_id | UUID | 外鍵 → papers |
| parent_id | UUID | 外鍵 → parents |
| child_id | UUID | 外鍵 → children（可為空） |
| total_questions | INTEGER | 總題數 |
| correct_count | INTEGER | 答對題數 |
| score_percentage | DECIMAL(5,2) | 百分比分數 |
| answers | TEXT | 作答記錄（JSON 字串） |
| **mode** | VARCHAR(20) | **學習模式**：practice \| diagnosis \| exam（Phase 1 新增） |
| completed_at | TIMESTAMPTZ | 完成時間 |

### `knowledge_chunks` 表
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| subject | VARCHAR(50) | 科目 |
| grade | VARCHAR(20) | 年級 |
| topic | VARCHAR(200) | 主題 |
| content | TEXT | 知識點內容 |
| created_at | TIMESTAMPTZ | 建立時間 |

---

## 三、已實作功能清單

### 認證系統
- [x] 家長帳號註冊（手機號 + 密碼）
- [x] 家長登入（JWT Cookie，httpOnly，7 天有效）
- [x] 登出功能
- [x] 測試帳號：手機號 `12345678`，密碼 `1234`

### 家長儀錶板（`/dashboard`）
- [x] **三種模式入口卡片**（Phase 1 修正）
  - 🩺 診斷模式（灰色，「即將推出」，不可點擊）
  - 📝 練習模式（綠色邊框，可點擊，連結 `/create/step1?mode=practice`）
  - 🏆 模擬考試（灰色，「即將推出」，不可點擊）
  - 提示文字：「建議先完成診斷，了解孩子弱項，再生成針對性練習。」
- [x] 統計概覽（孩子數、出卷次數、已完成份數、平均分數）
- [x] 孩子檔案管理（新增/刪除）
- [x] 最近出卷記錄（顯示「練習模式」標籤）
- [x] 最近成績概覽
- [x] 所有出卷入口統一傳入 `?mode=practice`

### 三步出卷流程
- [x] Step 1（`/create/step1`）：選擇年級、科目；讀取 URL `mode` 參數存入 sessionStorage
- [x] Step 2（`/create/step2`）：選擇知識點/單元
- [x] Step 3（`/create/step3`）：設定題型、數量、交付方式；傳入 `learningMode` 和 `deliveryMode`
- [x] AI 題目生成（Mock LLM，支援 MC/TF/Short 三種題型）

### 線上練習模式
- [x] 線上作答介面（`/practice/[id]`）
- [x] 即時批改與解說
- [x] 作答完成後自動記錄成績（含 `mode` 欄位）

### PDF 下載
- [x] 生成中文 PDF 練習卷（`/api/papers/[id]/pdf`）
- [x] **均勻分頁邏輯**（Phase 1 修正）：按題目數量均勻分配，15 題 5 頁 → 每頁 3 題
- [x] 支援 MC/TF/Short 三種題型排版

### 成績系統
- [x] 成績列表頁（`/scores`）
- [x] 成績詳情（含答對/答錯明細）
- [x] 手動輸入 PDF 成績
- [x] `GET /api/scores` 支援 `?mode=practice` 篩選

---

## 四、後端 API 清單

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/auth/register` | 家長註冊 |
| POST | `/api/auth/login` | 家長登入 |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/auth/me` | 取得當前用戶 |
| GET | `/api/children` | 取得孩子列表 |
| POST | `/api/children` | 新增孩子 |
| DELETE | `/api/children/[id]` | 刪除孩子 |
| GET | `/api/papers` | 取得出卷列表 |
| POST | `/api/papers` | 創建試卷（強制傳入 `mode`，預設 `practice`） |
| GET | `/api/papers/[id]` | 取得試卷詳情（含 `mode`） |
| GET | `/api/papers/[id]/pdf` | 下載 PDF 練習卷 |
| GET | `/api/questions/[paperId]` | 取得題目列表 |
| POST | `/api/questions/[paperId]/submit` | 提交作答（自動從 paper 讀取 mode 記錄到 scores） |
| GET | `/api/scores` | 取得成績列表（支援 `?mode=` 篩選） |
| POST | `/api/scores` | 手動記錄成績（傳入 `mode`） |
| GET | `/api/knowledge` | 取得知識點列表 |
| GET | `/api/setup` | 初始化資料庫（僅首次使用） |

---

## 五、操作歷程記錄

### Phase 0：初始建置（2026-05-30）

#### ✅ 成功
1. 建立 Next.js 14 專案，完成所有功能頁面和 API Route
2. 推送代碼至 GitHub 私有倉庫（cybermindflows/yearn-paper-next）
3. 安裝 Vercel CLI，設定 9 個環境變數（SUPABASE_URL、SUPABASE_ANON_KEY 等）
4. 第三次 Vercel 部署成功（前兩次因 build 錯誤失敗）
5. 透過瀏覽器 Console JavaScript 成功初始化 Supabase 資料庫（6 張資料表 + 10 個知識點 + 測試帳號）

#### ❌ 失敗
1. **第一次 Vercel 部署**：`supabaseUrl is required`（環境變數在 build-time 未注入）
   - 修正：`supabase.ts` 改為 lazy initialization，避免 build-time 崩潰
2. **第二次 Vercel 部署**：4 個 ESLint `no-unused-vars` 錯誤
   - 修正：移除未使用的 `step1`、`answered`、`SEED_SQL` 等變數
3. **資料庫初始化方法一**：`/api/setup` 依賴不存在的 `exec_sql` RPC
4. **資料庫初始化方法二**：`psycopg2` 直接連接（沙盒不支援 IPv6，被防火牆阻擋）
5. **資料庫初始化方法三**：Supabase 連接池（port 6543）同樣被防火牆阻擋
6. **資料庫初始化方法四**：REST API `exec_sql` RPC 不存在
7. **資料庫初始化方法五**：Management API 需要用戶 JWT，服務角色金鑰無效

#### ⚠️ 偏離原計劃
1. `next.config.mjs` 選項位置錯誤：`serverExternalPackages` 放在頂層，應在 `experimental` 區塊
2. 資料庫初始化需要用戶手動登入 Supabase Dashboard，由瀏覽器 Console 完成（原計劃全自動）

---

### Phase 1：修正一 — 儀錶板模式卡片 + PDF 分頁（2026-05-31）

#### 修正要求
- 儀錶板新增三種模式入口卡片（診斷/練習/模擬考試）
- 修復 PDF 多頁分頁 Bug（題目堆在前幾頁）

#### ✅ 成功
1. 儀錶板新增三種模式入口卡片（診斷灰色/練習綠色/模擬考試灰色）
2. 練習模式連結加入 `?mode=practice` URL 參數
3. PDF 分頁邏輯重寫：改用按題目數量均勻分配（`Math.ceil(totalQ / targetPages)`）
4. 修正 `useSearchParams` 需用 Suspense 包裹的 Next.js build 錯誤
5. 第四次 Vercel 部署成功（commit `cc58530`）

#### ❌ 失敗
1. **第一次 PDF 分頁修正**：高度估算法（height-based pagination）對 TF 題估算偏低，導致後幾頁堆積
   - 修正：改用題目數量均勻分配法

---

### Phase 1：修正二 — Mode 架構（2026-05-31）

#### 修正要求
- 資料庫 `papers`/`scores` 表新增 `mode` 欄位（practice \| diagnosis \| exam）
- 後端 API 強制傳入 `mode` 參數
- 前端所有出卷入口統一傳入 `mode=practice`

#### ✅ 成功
1. **資料庫 Migration**：
   - `papers` 表新增 `mode` VARCHAR(20) DEFAULT 'practice'（學習模式）
   - `papers` 表新增 `delivery_mode` VARCHAR(20)（原 `mode` 欄位語義重命名）
   - `scores` 表新增 `mode` VARCHAR(20) DEFAULT 'practice'
   - 現有 8 筆 papers 記錄 `mode` 更新為 `'practice'`
2. **後端 API 修正**：
   - `POST /api/papers`：強制接收 `mode` 參數（預設 `'practice'`）
   - `GET /api/papers/[id]`：返回包含 `mode` 欄位
   - `POST /api/questions/[id]/submit`：從 paper 讀取 mode 同步記錄到 scores
   - `GET /api/scores`：支援 `?mode=practice` 篩選
3. **前端修正**：
   - Step1 讀取 URL `?mode=` 參數存入 sessionStorage
   - Step3 從 sessionStorage 讀取 `learningMode` 傳入 API
   - Dashboard 所有出卷入口（新增、開始出卷、快速出卷）統一傳入 `?mode=practice`
   - 出卷記錄顯示「練習模式/診斷模式/模擬考試」標籤
4. 第五次 Vercel 部署成功（commit `88d451e`）
5. 第六次 Vercel 部署成功（commit `6a37dfd`，含文件更新）

#### ⚠️ 架構決策說明
原有 `mode` 欄位值為 `'online'`/`'pdf'`，語義是「交付方式」而非「學習模式」。本次修正將兩個概念分開：
- `mode`：學習模式（practice \| diagnosis \| exam）
- `delivery_mode`：交付方式（online \| pdf）

這樣未來新增診斷模式或模擬考試，只需改變傳入的 `mode` 值，無需修改資料庫結構。

---

## 六、待辦事項（未來 Phase）

| 優先級 | 功能 | 說明 |
|--------|------|------|
| 高 | 診斷模式 | 自動分析弱項，生成針對性練習 |
| 高 | 模擬考試模式 | 計時、全卷、正式評分 |
| 中 | 真實 AI 出題 | 切換 `USE_MOCK_LLM=false` + OpenAI API Key |
| 中 | 孩子個人成績追蹤 | 按孩子篩選成績，顯示進步趨勢 |
| 中 | 知識點擴充 | 增加更多科目和年級的知識點 |
| 低 | 電郵通知 | 出卷完成後發送 PDF 至家長電郵 |
| 低 | 多語言支援 | 英文介面 |

---

## 七、環境變數清單

| 變數名 | 說明 | 設定位置 |
|--------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL | Vercel 環境變數 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名金鑰 | Vercel 環境變數 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服務角色金鑰 | Vercel 環境變數 |
| `JWT_SECRET` | JWT 簽名密鑰 | Vercel 環境變數 |
| `NEXT_PUBLIC_APP_URL` | 應用程式 URL | Vercel 環境變數 |
| `USE_MOCK_LLM` | 是否使用 Mock LLM（true/false） | Vercel 環境變數 |
| `OPENAI_API_KEY` | OpenAI API 金鑰（USE_MOCK_LLM=false 時需要） | Vercel 環境變數 |

---

## 八、測試帳號

| 欄位 | 值 |
|------|-----|
| 手機號 | `12345678` |
| 密碼 | `1234` |
| 角色 | 家長 |

---

*報告最後更新：2026-05-31 by Manus AI*
