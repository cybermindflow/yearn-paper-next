import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SETUP_SECRET = process.env.SETUP_SECRET || 'yearn-setup-2026'

// 48 math knowledge chunks
// Columns: subject, year, topic (範疇), unit (知識點代碼), knowledge_point, learning_objective, level, applicable_question_types, source
// Note: id is auto-generated UUID, unit stores the knowledge point code (e.g. M3_01_L1)
const MATH_CHUNKS = [
  // ── 數（Number）── M3_01 五位數以內的數
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_01_L1', knowledge_point: '五位數以內的數（L1 基礎）', learning_objective: '能讀出、寫出和比較 10,000 以內的數；直接讀寫，數字範圍小，單步驟', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_01_L2', knowledge_point: '五位數以內的數（L2 標準）', learning_objective: '能讀出、寫出和比較 100,000 以內的數；含位值比較，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_01_L3', knowledge_point: '五位數以內的數（L3 挑戰）', learning_objective: '能應用位值概念解決非常規問題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_02 加法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_02_L1', knowledge_point: '加法（不超過四位數）（L1 基礎）', learning_objective: '能進行不超過三位數的加法運算（不進位）；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_02_L2', knowledge_point: '加法（不超過四位數）（L2 標準）', learning_objective: '能進行不超過四位數的加法運算（含進位）；含進位，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_02_L3', knowledge_point: '加法（不超過四位數）（L3 挑戰）', learning_objective: '能解決涉及加法的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_03 減法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_03_L1', knowledge_point: '減法（不超過四位數）（L1 基礎）', learning_objective: '能進行不超過三位數的減法運算（不退位）；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_03_L2', knowledge_point: '減法（不超過四位數）（L2 標準）', learning_objective: '能進行不超過四位數的減法運算（含退位）；含退位，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_03_L3', knowledge_point: '減法（不超過四位數）（L3 挑戰）', learning_objective: '能解決涉及減法的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_04 乘法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_04_L1', knowledge_point: '乘法（不超過兩位數乘一位數）（L1 基礎）', learning_objective: '能進行一位數乘一位數的乘法；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_04_L2', knowledge_point: '乘法（不超過兩位數乘一位數）（L2 標準）', learning_objective: '能進行兩位數乘一位數的乘法（不進位）；含乘法，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_04_L3', knowledge_point: '乘法（不超過兩位數乘一位數）（L3 挑戰）', learning_objective: '能進行兩位數乘一位數的乘法（含進位）及應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_05 除法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_05_L1', knowledge_point: '除法（不超過兩位數除一位數）（L1 基礎）', learning_objective: '能進行基本除法（整除）；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_05_L2', knowledge_point: '除法（不超過兩位數除一位數）（L2 標準）', learning_objective: '能進行兩位數除一位數的除法（有餘數）；含餘數，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_05_L3', knowledge_point: '除法（不超過兩位數除一位數）（L3 挑戰）', learning_objective: '能解決涉及除法的應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_06 分數
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_06_L1', knowledge_point: '分數的認識（分母不超過 10）（L1 基礎）', learning_objective: '能辨認和讀出基本分數；直接辨認，數字範圍小', level: 1, applicable_question_types: ['mc'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_06_L2', knowledge_point: '分數的認識（分母不超過 10）（L2 標準）', learning_objective: '能比較同分母分數的大小；含比較，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_06_L3', knowledge_point: '分數的認識（分母不超過 10）（L3 挑戰）', learning_objective: '能解決涉及分數的生活情境題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_07 分數加法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_07_L1', knowledge_point: '同分母分數加法（L1 基礎）', learning_objective: '能進行同分母分數的加法（結果不超過 1）；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_07_L2', knowledge_point: '同分母分數加法（L2 標準）', learning_objective: '能進行同分母分數的加法（結果可超過 1）；含帶分數，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_07_L3', knowledge_point: '同分母分數加法（L3 挑戰）', learning_objective: '能解決涉及分數加法的應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_08 分數減法
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_08_L1', knowledge_point: '同分母分數減法（L1 基礎）', learning_objective: '能進行同分母分數的減法（結果不小於 0）；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_08_L2', knowledge_point: '同分母分數減法（L2 標準）', learning_objective: '能進行同分母分數的減法（含帶分數）；含帶分數，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '數（Number）', unit: 'M3_08_L3', knowledge_point: '同分母分數減法（L3 挑戰）', learning_objective: '能解決涉及分數減法的應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // ── 度量（Measures）── M3_09 長度
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_09_L1', knowledge_point: '長度的度量（L1 基礎）', learning_objective: '能使用厘米（cm）和米（m）量度長度；直接量度，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_09_L2', knowledge_point: '長度的度量（L2 標準）', learning_objective: '能進行厘米和米之間的換算；含單位換算，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_09_L3', knowledge_point: '長度的度量（L3 挑戰）', learning_objective: '能解決涉及長度的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_10 重量
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_10_L1', knowledge_point: '重量的度量（L1 基礎）', learning_objective: '能使用克（g）和千克（kg）量度重量；直接量度，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_10_L2', knowledge_point: '重量的度量（L2 標準）', learning_objective: '能進行克和千克之間的換算；含單位換算，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_10_L3', knowledge_point: '重量的度量（L3 挑戰）', learning_objective: '能解決涉及重量的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_11 容量
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_11_L1', knowledge_point: '容量的度量（L1 基礎）', learning_objective: '能使用毫升（mL）和升（L）量度容量；直接量度，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_11_L2', knowledge_point: '容量的度量（L2 標準）', learning_objective: '能進行毫升和升之間的換算；含單位換算，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_11_L3', knowledge_point: '容量的度量（L3 挑戰）', learning_objective: '能解決涉及容量的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_12 時間
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_12_L1', knowledge_point: '時間的認識（L1 基礎）', learning_objective: '能讀出時鐘上的時間（整點和半點）；直接讀取，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_12_L2', knowledge_point: '時間的認識（L2 標準）', learning_objective: '能計算時間的經過（小時和分鐘）；含時間計算，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_12_L3', knowledge_point: '時間的認識（L3 挑戰）', learning_objective: '能解決涉及時間的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_13 貨幣
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_13_L1', knowledge_point: '貨幣的認識（L1 基礎）', learning_objective: '能辨認港幣的面值並計算簡單金額；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_13_L2', knowledge_point: '貨幣的認識（L2 標準）', learning_objective: '能計算購物找贖；含找贖計算，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '度量（Measures）', unit: 'M3_13_L3', knowledge_point: '貨幣的認識（L3 挑戰）', learning_objective: '能解決涉及貨幣的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // ── 圖形與空間（Shape and Space）── M3_14 周界
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_14_L1', knowledge_point: '周界的計算（L1 基礎）', learning_objective: '能計算正方形和長方形的周界；直接計算，數字範圍小', level: 1, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_14_L2', knowledge_point: '周界的計算（L2 標準）', learning_objective: '能計算不規則多邊形的周界；含多邊形，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_14_L3', knowledge_point: '周界的計算（L3 挑戰）', learning_objective: '能解決涉及周界的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_15 平面圖形
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_15_L1', knowledge_point: '平面圖形的認識（L1 基礎）', learning_objective: '能辨認三角形、四邊形、五邊形、六邊形；直接辨認，數字範圍小', level: 1, applicable_question_types: ['mc'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_15_L2', knowledge_point: '平面圖形的認識（L2 標準）', learning_objective: '能描述平面圖形的特徵（邊數、角數）；含特徵描述，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_15_L3', knowledge_point: '平面圖形的認識（L3 挑戰）', learning_objective: '能解決涉及平面圖形的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
  // M3_16 方向和位置
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_16_L1', knowledge_point: '方向和位置（L1 基礎）', learning_objective: '能辨認東、南、西、北四個方向；直接辨認，數字範圍小', level: 1, applicable_question_types: ['mc'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_16_L2', knowledge_point: '方向和位置（L2 標準）', learning_objective: '能使用方格圖描述位置；含座標，數字範圍中等', level: 2, applicable_question_types: ['mc', 'fill'], source: '香港教育局《小學數學科課程指引》' },
  { subject: '數學科', year: 'P3', topic: '圖形與空間（Shape and Space）', unit: 'M3_16_L3', knowledge_point: '方向和位置（L3 挑戰）', learning_objective: '能解決涉及方向和位置的多步驟應用題；數字範圍大，需多步驟推理', level: 3, applicable_question_types: ['short'], source: '香港教育局《小學數學科課程指引》' },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('placeholder')) {
    return NextResponse.json({ error: 'Missing or placeholder Supabase credentials' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })

  const results: string[] = []

  // Step 1: Check if math chunks already exist
  const { count: existingCount } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('subject', '數學科')

  if (existingCount && existingCount >= 48) {
    return NextResponse.json({
      success: true,
      message: `已存在 ${existingCount} 筆數學科知識點，無需重複匯入`,
      results: [`✅ 驗證：knowledge_chunks 中數學科記錄共 ${existingCount} 筆`]
    })
  }

  // Step 2: Delete existing math chunks to avoid duplicates
  if (existingCount && existingCount > 0) {
    await supabase.from('knowledge_chunks').delete().eq('subject', '數學科')
    results.push(`🗑️ 已清除舊有 ${existingCount} 筆數學科記錄`)
  }

  // Step 3: Insert 48 math knowledge chunks in batches
  let successCount = 0
  let failCount = 0
  const BATCH_SIZE = 12

  for (let i = 0; i < MATH_CHUNKS.length; i += BATCH_SIZE) {
    const batch = MATH_CHUNKS.slice(i, i + BATCH_SIZE)
    try {
      const { error } = await supabase
        .from('knowledge_chunks')
        .insert(batch)
      if (error) {
        results.push(`⚠️ Batch ${Math.floor(i/BATCH_SIZE)+1} failed: ${error.message.substring(0, 150)}`)
        failCount += batch.length
      } else {
        successCount += batch.length
        results.push(`✅ Batch ${Math.floor(i/BATCH_SIZE)+1} (${batch.length} records) inserted`)
      }
    } catch (e) {
      results.push(`❌ Batch ${Math.floor(i/BATCH_SIZE)+1} exception: ${String(e).substring(0, 100)}`)
      failCount += batch.length
    }
  }

  results.push(`📊 INSERT 結果：成功 ${successCount} 筆，失敗 ${failCount} 筆（共 ${MATH_CHUNKS.length} 筆）`)

  // Step 4: Verify final count
  const { count: finalCount } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('subject', '數學科')

  results.push(`✅ 驗證：knowledge_chunks 中數學科記錄共 ${finalCount ?? 0} 筆`)

  return NextResponse.json({
    success: failCount === 0,
    message: `Phase 2 Migration 完成：${successCount}/${MATH_CHUNKS.length} 筆知識點已匯入`,
    results
  })
}
