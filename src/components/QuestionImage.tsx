'use client';

import React, { useState } from 'react';

// Mapping from image_key to SVG file path and description
const IMAGE_MAP: Record<string, { path: string; alt: string }> = {
  // Mathematics
  right_triangle: { path: '/images/shapes/right_triangle.svg', alt: '直角三角形' },
  square: { path: '/images/shapes/square.svg', alt: '正方形' },
  rectangle: { path: '/images/shapes/rectangle.svg', alt: '長方形' },
  circle: { path: '/images/shapes/circle.svg', alt: '圓形' },
  compass_rose: { path: '/images/shapes/compass_rose.svg', alt: '指南針方向圖' },
  position_map: { path: '/images/shapes/position_map.svg', alt: '位置示意圖' },
  angle_types: { path: '/images/shapes/angle_types.svg', alt: '角度類型示意' },
  number_line: { path: '/images/shapes/number_line.svg', alt: '數線' },
  cuboid: { path: '/images/shapes/cuboid.svg', alt: '長方體' },
  clock: { path: '/images/shapes/clock.svg', alt: '時鐘' },
  multiplication_table: { path: '/images/shapes/multiplication_table.svg', alt: '乘法表' },
  // Science
  simple_circuit: { path: '/images/shapes/simple_circuit.svg', alt: '簡單串聯電路' },
  states_of_matter: { path: '/images/shapes/states_of_matter.svg', alt: '物質三態變化' },
  light_and_shadow: { path: '/images/shapes/light_and_shadow.svg', alt: '光與影形成' },
  plant_structure: { path: '/images/shapes/plant_structure.svg', alt: '植物結構' },
  simple_food_chain: { path: '/images/shapes/simple_food_chain.svg', alt: '簡單食物鏈' },
  water_cycle: { path: '/images/shapes/water_cycle.svg', alt: '水循環' },
  force_push_pull: { path: '/images/shapes/force_push_pull.svg', alt: '力（推與拉）' },
  magnet: { path: '/images/shapes/magnet.svg', alt: '馬蹄形磁鐵' },
  five_senses: { path: '/images/shapes/five_senses.svg', alt: '五感' },
  inclined_plane: { path: '/images/shapes/inclined_plane.svg', alt: '簡單機械：斜面' },
  // General Studies
  hk_simple_map: { path: '/images/shapes/hk_simple_map.svg', alt: '香港簡圖' },
  traffic_light: { path: '/images/shapes/traffic_light.svg', alt: '交通燈' },
  stop_sign: { path: '/images/shapes/stop_sign.svg', alt: '停止標誌' },
  zebra_crossing: { path: '/images/shapes/zebra_crossing.svg', alt: '行人過路處' },
  community_facilities: { path: '/images/shapes/community_facilities.svg', alt: '社區設施示意' },
  mtr_train: { path: '/images/shapes/mtr_train.svg', alt: '港鐵列車簡圖' },
  weather_symbols: { path: '/images/shapes/weather_symbols.svg', alt: '天氣符號' },
  family_tree: { path: '/images/shapes/family_tree.svg', alt: '家庭結構圖' },
  // Chinese
  stroke_order: { path: '/images/shapes/stroke_order.svg', alt: '筆順示意' },
  sentence_structure: { path: '/images/shapes/sentence_structure.svg', alt: '句子結構分析' },
  metaphor_simile: { path: '/images/shapes/metaphor_simile.svg', alt: '修辭手法：比喻' },
  // English
  alphabet_case: { path: '/images/shapes/alphabet_case.svg', alt: '字母大小寫對照' },
  tense_comparison: { path: '/images/shapes/tense_comparison.svg', alt: '英文時態對比' },
  paragraph_structure: { path: '/images/shapes/paragraph_structure.svg', alt: '段落結構' },
  parts_of_speech: { path: '/images/shapes/parts_of_speech.svg', alt: '詞性標記' },
};

interface QuestionImageProps {
  imageKey: string;
  caption?: string;
  className?: string;
  width?: number;
  height?: number;
}

export function QuestionImage({
  imageKey,
  caption,
  className = '',
  width = 320,
  height = 240,
}: QuestionImageProps) {
  const [hasError, setHasError] = useState(false);
  const imageInfo = IMAGE_MAP[imageKey];

  // If no mapping found or load error, show placeholder
  if (!imageInfo || hasError) {
    return (
      <div
        className={`border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 ${className}`}
        style={{ width, height }}
      >
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-xs">圖形：{imageKey}</div>
        </div>
      </div>
    );
  }

  return (
    <figure className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex items-center justify-center"
        style={{ maxWidth: width }}
      >
        {/* Use plain <img> instead of next/image to avoid SVG restrictions */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageInfo.path}
          alt={imageInfo.alt}
          width={width}
          height={height}
          style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          onError={() => setHasError(true)}
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-gray-600 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// Export image map for use in other components (e.g., PDF generation)
export { IMAGE_MAP };
export type { QuestionImageProps };
