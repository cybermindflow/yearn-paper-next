# Phase 3 診斷模式 TODO

## 資料庫
- [ ] ALTER TABLE papers ADD COLUMN source VARCHAR(20) DEFAULT 'manual'
- [ ] ALTER TABLE scores ADD COLUMN source VARCHAR(20) DEFAULT 'practice'
- [ ] ALTER TABLE questions ADD COLUMN knowledge_point_id TEXT DEFAULT NULL

## API
- [ ] POST /api/diagnosis/generate（診斷題目生成）
- [ ] GET /api/diagnosis/[score_id]（診斷報告數據）
- [ ] 修改 GET /api/scores 支援 ?mode=diagnosis 篩選（已有，確認）

## 前端頁面
- [ ] /diagnosis/create（診斷發起頁：科目/年級選擇 + 知識點勾選 + localStorage 記憶）
- [ ] /diagnosis/[score_id]（診斷報告頁：掌握度總覽 + 詳細分析 + 一鍵生成針對練習）

## 儀錶板修改
- [ ] 診斷模式卡片改為可點擊（綠色邊框，移除「即將推出」）
- [ ] 新增診斷歷史區塊（置於最近出卷記錄上方）

## Step 3 修改
- [ ] 支援 URL 參數 source=diagnosis 和預選知識點列表

## 測試與部署
- [ ] TypeScript 類型檢查無錯誤
- [ ] 端對端測試：發起 → 勾選 → 作答 → 查看報告 → 生成針對練習
- [ ] Vercel 部署成功
- [ ] 6 張截圖驗收
- [ ] PROGRESS_REPORT.md 更新
