# Yearn-paper 大升級 TODO

## 目標一：PDF 重構（puppeteer-core + @sparticuz/chromium）
- [x] 安裝 puppeteer-core 和 @sparticuz/chromium 依賴
- [x] 移除 pdfkit 依賴
- [x] 建立 src/lib/pdfTemplate.ts（HTML 模板生成器）
- [x] 重構 src/app/api/papers/[id]/pdf/route.ts（改用 puppeteer）
- [x] 重構 src/app/api/exam/[id]/pdf/route.ts（改用 puppeteer）
- [ ] 建立 src/app/print/[paperId]/page.tsx（打印專用頁面）— 可選，已由 pdfTemplate.ts 覆蓋
- [x] 確認 Vercel Serverless 兼容性（@sparticuz/chromium 輕量版）

## 目標二：JSXGraph 動態圖形引擎
- [x] 安裝 jsxgraph 依賴
- [x] 建立 src/components/DynamicDiagram.tsx（JSXGraph 組件，dynamic import ssr:false）
- [x] 定義 DiagramSpec JSON schema（src/types/diagram.ts）
- [x] 修改 src/lib/mockLLM.ts：移除 image_mc，新增 diagram_mc 題型
- [x] 修改 DeepSeek Prompt：引導 AI 生成 JSXGraph JSON 描述
- [x] 更新 src/app/create/step3/page.tsx：image_mc 設為 available:false
- [x] 更新 src/app/api/questions/[paperId]/submit/route.ts：支援 diagram_mc 評分

## 目標三：線上與線下體驗統一
- [x] pdfTemplate.ts 使用與線上相同的 HTML 渲染邏輯
- [x] DynamicDiagram 在 PDF 頁面等待渲染後截取 SVG
- [x] 確保 PDF 和線上作答的圖形完全一致

## 目標四：學生端 PWA
- [x] 建立 src/app/role-select/page.tsx（角色選擇頁）
- [x] 修改登入後跳轉：/auth → /role-select
- [x] 建立 src/app/student/page.tsx（學生端首頁：待完成任務）
- [x] 建立 src/app/api/student/tasks/route.ts（學生任務 API）
- [x] 建立學生端路由保護（未登入跳轉 /auth）
- [x] 確保學生端無法訪問家長功能
- [ ] 建立 src/app/student/practice/[id]/page.tsx — 可選，直接使用 /practice/[id]
- [ ] 更新 manifest.json 支援 PWA 安裝 — 可選

## 清理
- [x] 移除 exam/[id]/pdf/route.ts 中的 pdfkit 依賴
- [x] 更新 PROGRESS_REPORT.md

## TypeScript 檢查
- [x] npx tsc --noEmit — 無錯誤 ✅
