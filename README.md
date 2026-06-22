# Yearn-paper 殷學社教育中心 AI 智能出卷平台

**版本**：v1.0.0-p3（小三階段對外測試版）  
**線上版本**：https://yearn-paper-next.vercel.app/  
**更新日期**：2026-06-22

---

## 產品簡介

Yearn-paper 是由殷學社教育中心開發的 AI 智能出卷系統，專為香港小學生（目前支援小三）設計。家長可根據孩子的學習進度，自動生成個人化練習卷，支援線上作答、成績追蹤及 PDF 下載。

系統採用 DeepSeek AI 模型，根據香港課程指引自動出題，題目貼近本地課程內容。

---

## 如何開始使用

### 示範帳號（對外測試用）

| 角色 | 手機號碼 | 密碼 |
|------|----------|------|
| 示範家長（陳太） | 51111111 | yearn2026 |
| 示範孩子（小杰） | 51111112 | yearn2026 |

1. 訪問 https://yearn-paper-next.vercel.app/
2. 輸入示範帳號手機號碼和密碼登入
3. 選擇孩子，開始出卷

---

## 三大學習模式

### 1. 練習模式（Practice）
- 按科目和知識點選題，生成練習卷
- 支援線上作答，即時顯示成績
- 可下載 PDF 版本

### 2. 診斷模式（Diagnosis）
- 系統自動選取多個知識點進行診斷測試
- 完成後生成學習報告，標示強弱項
- 可根據診斷結果生成針對性練習卷

### 3. 模擬考試（Exam）
- 模擬真實考試環境（30 分鐘計時）
- 完成後顯示詳細成績報告

---

## 支援科目與年級

**目前支援年級**：小三（Primary 3）

| 科目 | 說明 |
|------|------|
| 中文科 | 選擇、填充、默寫、排列句子、閱讀理解、寫作 |
| 英文科 | Multiple Choice, Fill in Blanks, True/False, Matching, Rearrange, Reading Comprehension |
| 數學科 | 選擇、判斷、填充、配對、分類、問答 |
| 常識科 | 選擇、判斷、填充、配對、分類、問答 |
| 人文科 | 選擇、判斷、填充、配對、分類、問答（使用常識科知識庫） |
| 科學科 | 選擇、判斷、填充、標示、實驗設計、問答 |

> **注意**：看圖題型（image_mc）目前暫停開放，圖庫完善後將陸續推出。

---

## 技術架構

| 層次 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router) + React |
| 樣式 | Tailwind CSS |
| 後端 API | Next.js Route Handlers |
| 資料庫 | Supabase (PostgreSQL) |
| AI 出題 | DeepSeek API (`deepseek-chat`) |
| 部署 | Vercel |
| 認證 | 手機號 + 密碼 + JWT Cookie |

---

## 本地開發

```bash
# 安裝依賴
pnpm install

# 設定環境變數
cp .env.example .env.local
# 填入 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY、
# SUPABASE_SERVICE_ROLE_KEY、DEEPSEEK_API_KEY

# 啟動開發伺服器
pnpm dev
```

---

## 免責聲明

1. **AI 生成內容**：本系統使用 AI 自動生成題目，題目內容僅供練習參考，不代表正式考試題目。家長應自行核實題目的準確性。

2. **學習成效**：本系統旨在輔助學習，不保證任何學習成效或考試成績。

3. **資料私隱**：本系統收集的學習資料（包括作答記錄和成績）僅用於提供個人化學習建議，不會用於其他用途。

4. **對外測試版本**：目前版本為對外測試版（v1.0.0-p3），功能可能有所調整，如遇問題請聯絡殷學社教育中心。

5. **版權**：© 2026 殷學社教育中心 Yearn Hopes Education Centre. All rights reserved.

---

## 聯絡我們

如有任何問題或建議，請聯絡殷學社教育中心。
