export interface KnowledgeChunk {
  id: string
  subject: string
  year: string
  topic: string
  unit: string
  knowledge_point: string
  learning_objective: string
  level: number
  applicable_question_types: string[]
  source: string
}

export const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    id: 'P3-CS-U1-K01',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '社區購物場所的種類與特點',
    learning_objective: '認識社區內不同類型的購物場所，包括超級市場、街市、商場及便利店，並了解各自的特點與功能。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'match'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K02',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '精明購物的考慮因素',
    learning_objective: '學習在購物時需考慮的因素，包括價格比較、品質檢查、有效日期及購物清單的重要性。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K03',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '消費者的基本權利',
    learning_objective: '了解消費者享有的基本權利，包括獲得安全產品的權利、知情權及投訴權。',
    level: 2,
    applicable_question_types: ['mc', 'tf', 'fill', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K04',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '消費者的義務與責任',
    learning_objective: '認識消費者的責任，包括誠實付款、愛護公共財物及妥善處理廢物。',
    level: 2,
    applicable_question_types: ['mc', 'tf', 'fill', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K05',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '香港主要公共交通工具',
    learning_objective: '認識香港各種公共交通工具，包括地鐵、巴士、小巴、電車及渡輪的特點與用途。港鐵（地鐵）是香港最主要的集體運輸系統，覆蓋市區主要區域，班次頻密，是市區居民最常用的交通工具。渡輪主要服務離峳（如大嶼山、長洲、滿月峳）和部分港內航線，不是市區主要交通工具。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'match'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K06',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '公共交通的便利與優點',
    learning_objective: '理解使用公共交通工具的好處，包括減少交通擠塞、環保及節省費用。',
    level: 2,
    applicable_question_types: ['mc', 'tf', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K07',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '乘搭交通工具的禮儀與規則',
    learning_objective: '學習乘搭公共交通工具時應遵守的禮儀，包括排隊候車、讓座及保持安靜。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K08',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '社區設施的種類與用途',
    learning_objective: '認識社區內各種設施，包括圖書館、郵政局、診所及公園，並了解其功能與服務對象。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'match'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K09',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '愛護社區環境的方法',
    learning_objective: '學習保護社區環境的具體方法，包括垃圾分類、節約用水及愛護公共設施。',
    level: 2,
    applicable_question_types: ['mc', 'tf', 'fill', 'short'],
    source: '小三常識科課程指引',
  },
  {
    id: 'P3-CS-U1-K10',
    subject: '常識科',
    year: 'P3',
    topic: '生活多姿彩',
    unit: '單元一',
    knowledge_point: '社區服務人員的工作與貢獻',
    learning_objective: '認識社區中各種服務人員，包括警察、消防員、醫護人員及清潔工人的工作與貢獻。',
    level: 1,
    applicable_question_types: ['mc', 'tf', 'fill', 'match', 'short'],
    source: '小三常識科課程指引',
  },
]

export function getKnowledgeByIds(ids: string[]): KnowledgeChunk[] {
  return KNOWLEDGE_BASE.filter(k => ids.includes(k.id))
}
