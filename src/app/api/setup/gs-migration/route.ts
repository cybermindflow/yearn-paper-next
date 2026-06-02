import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 新版常識科 P3 知識點（去出版商化版本）
// unit 欄位格式：「代碼 | 單元名稱」，方便識別
const NEW_GS_P3_CHUNKS = [
  {
    unit_code: 'GS_P3_011',
    topic: '社會與公民',
    unit: 'GS_P3_011 | 社區設施與服務',
    knowledge_point: '社區主要設施與服務的功能',
    learning_objective: '認識社區內常見設施（如圖書館、郵局、診所、消防局等）的功能及其提供的服務，了解這些設施如何滿足居民的日常需要。',
    applicable_question_types: ['mc', 'match', 'fill', 'classify'],
  },
  {
    unit_code: 'GS_P3_020',
    topic: '個人、家庭與社會',
    unit: 'GS_P3_020 | 消費與理財',
    knowledge_point: '需要與想要的區分及消費決定',
    learning_objective: '分辨「需要」（生活必需品）與「想要」（非必需的欲望），並能根據輕重緩急作出合理的消費決定，培養理性消費習慣。',
    applicable_question_types: ['mc', 'scenario', 'tf', 'short'],
  },
  {
    unit_code: 'GS_P3_021',
    topic: '個人、家庭與社會',
    unit: 'GS_P3_021 | 消費與理財',
    knowledge_point: '消費者的基本權利與義務',
    learning_objective: '了解消費者享有的基本權利（如獲得安全產品、準確資訊、公平交易等）及應盡的義務（如誠實付款、合理使用商品等）。',
    applicable_question_types: ['mc', 'tf', 'scenario', 'match'],
  },
  {
    unit_code: 'GS_P3_023',
    topic: '個人、家庭與社會',
    unit: 'GS_P3_023 | 消費與理財',
    knowledge_point: '精明消費的考慮因素',
    learning_objective: '掌握精明消費的方法，包括比較價格與品質、查看產品標籤、認識消費者保障機構，以及避免衝動消費的策略。',
    applicable_question_types: ['mc', 'scenario', 'tf', 'short'],
  },
  {
    unit_code: 'GS_P3_024',
    topic: '個人、家庭與社會',
    unit: 'GS_P3_024 | 消費與理財',
    knowledge_point: '社區常見交易場所與服務',
    learning_objective: '認識社區內不同類型的交易場所（如超級市場、街市、商場、網上商店等）及其特點，了解各種付款方式（現金、八達通、信用卡等）。',
    applicable_question_types: ['mc', 'match', 'fill', 'classify'],
  },
  {
    unit_code: 'GS_P3_025',
    topic: '個人、家庭與社會',
    unit: 'GS_P3_025 | 消費與理財',
    knowledge_point: '簡單買賣與找續計算',
    learning_objective: '能進行簡單的買賣計算，包括計算總價、找續金額，以及判斷是否得到正確找續，培養基本的數學應用能力。',
    applicable_question_types: ['mc', 'fill', 'scenario', 'short'],
  },
  {
    unit_code: 'GS_P3_031',
    topic: '社會與公民',
    unit: 'GS_P3_031 | 交通與公共服務',
    knowledge_point: '香港主要公共交通工具與使用方法',
    learning_objective: '認識香港主要的公共交通工具（港鐵、巴士、小巴、渡輪、電車、的士等），了解各種交通工具的特點、路線及購票/付款方式。',
    applicable_question_types: ['mc', 'match', 'fill', 'classify'],
  },
  {
    unit_code: 'GS_P3_032',
    topic: '社會與公民',
    unit: 'GS_P3_032 | 交通與公共服務',
    knowledge_point: '乘搭交通工具的安全守則與禮貌',
    learning_objective: '掌握乘搭各種交通工具時應遵守的安全守則（如扶穩手把、不把頭手伸出窗外等）及應有的禮貌行為（如讓座、排隊候車等）。',
    applicable_question_types: ['mc', 'tf', 'scenario', 'short'],
  },
  {
    unit_code: 'GS_P3_033',
    topic: '社會與公民',
    unit: 'GS_P3_033 | 交通與公共服務',
    knowledge_point: '選擇合適交通工具的考慮因素',
    learning_objective: '能根據目的地、時間、費用、便利程度等因素，選擇最合適的交通工具，並能規劃簡單的交通路線。',
    applicable_question_types: ['mc', 'scenario', 'short', 'tf'],
  },
  {
    unit_code: 'GS_P3_042',
    topic: '科學、科技與環境',
    unit: 'GS_P3_042 | 資訊科技與生活',
    knowledge_point: '資訊科技在日常生活中的應用',
    learning_objective: '認識資訊科技（如互聯網、智能手機、電腦等）在日常生活各方面的應用（學習、通訊、娛樂、購物等），了解使用資訊科技的注意事項。',
    applicable_question_types: ['mc', 'tf', 'scenario', 'short'],
  },
]

export async function POST(req: NextRequest) {
  // Simple security: require a secret header
  const secret = req.headers.get('x-migration-secret')
  if (secret !== 'gs-p3-migrate-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: Delete existing 常識科 P3 records
    const { error: deleteError, count: deleteCount } = await supabaseAdmin
      .from('knowledge_chunks')
      .delete({ count: 'exact' })
      .eq('subject', '常識科')
      .eq('year', 'P3')

    if (deleteError) {
      console.error('[gs-migration] Delete error:', deleteError.message)
      return NextResponse.json({ error: `Delete failed: ${deleteError.message}` }, { status: 500 })
    }

    console.log(`[gs-migration] Deleted ${deleteCount} existing 常識科 P3 records`)

    // Step 2: Insert new records
    const inserts = NEW_GS_P3_CHUNKS.map(chunk => ({
      subject: '常識科',
      year: 'P3',
      topic: chunk.topic,
      unit: chunk.unit, // format: "GS_P3_XXX | 單元名稱"
      knowledge_point: chunk.knowledge_point,
      learning_objective: chunk.learning_objective,
      applicable_question_types: chunk.applicable_question_types,
      source: '教育局《小學常識科課程指引（2017）》',
      level: 1,
    }))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('knowledge_chunks')
      .insert(inserts)
      .select('id, unit, knowledge_point')

    if (insertError) {
      console.error('[gs-migration] Insert error:', insertError.message)
      return NextResponse.json({ error: `Insert failed: ${insertError.message}` }, { status: 500 })
    }

    // Step 3: Verify count
    const { count: verifyCount } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('subject', '常識科')
      .eq('year', 'P3')

    return NextResponse.json({
      success: true,
      deleted: deleteCount,
      inserted: inserted?.length ?? 0,
      verified_count: verifyCount,
      records: inserted?.map(r => ({ id: r.id, unit: r.unit, knowledge_point: r.knowledge_point })),
    })
  } catch (err) {
    console.error('[gs-migration] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
