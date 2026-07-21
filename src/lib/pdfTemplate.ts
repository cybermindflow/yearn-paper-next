/**
 * pdfTemplate.ts
 * Generates a self-contained HTML string for Puppeteer to render as PDF.
 * Supports all question types including diagram_mc (JSXGraph).
 */

import type { DiagramSpec } from '@/types/diagram'

interface PaperInfo {
  subject: string
  topic: string
  unit: string
  year?: string
}

interface QuestionRow {
  question_number: number
  question_type: string
  question_text: string
  options: Record<string, string> | null
  correct_answer: string
  explanation: string
  image_key?: string | null
  diagram_spec?: DiagramSpec | null
}

const TYPE_LABELS: Record<string, string> = {
  mc: '選擇題',
  tf: '判斷題',
  fill: '填充題',
  match: '配對題',
  classify: '分類題',
  short: '問答題',
  essay: '問答題',
  image_mc: '看圖選擇題',
  diagram_mc: '動態圖形選擇題',
  label: '標示題',
  experiment: '實驗題',
  dictation: '默寫題',
  reorder: '排列題',
  comprehension: '閱讀理解',
  composition: '寫作題',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderDiagramScript(spec: DiagramSpec, containerId: string): string {
  const specJson = JSON.stringify(spec)
  return `<script>
(function() {
  var spec = ${specJson};
  var containerId = '${containerId}';
  window.__diagramQueue = window.__diagramQueue || [];
  window.__diagramQueue.push({ spec: spec, containerId: containerId });
})();
</script>`
}

function renderQuestion(q: QuestionRow, type: 'question' | 'answer', idx: number): string {
  const label = TYPE_LABELS[q.question_type] || q.question_type
  const diagramId = `diagram-${idx}`

  let diagramHtml = ''
  if (q.question_type === 'diagram_mc' && q.diagram_spec) {
    diagramHtml = `
      <div class="diagram-container" id="${diagramId}"></div>
      ${renderDiagramScript(q.diagram_spec, diagramId)}
    `
  } else if (q.question_type === 'image_mc' && q.image_key) {
    // Fallback: show image_key label (SVG embed handled via base64 if available)
    diagramHtml = `<div class="image-placeholder">[圖形：${escapeHtml(q.image_key)}]</div>`
  }

  let bodyHtml = ''
  if (type === 'question') {
    // Options for mc / tf / diagram_mc
    if (q.options && typeof q.options === 'object') {
      const optEntries = Object.entries(q.options).filter(([k]) => k.length === 1)
      if (optEntries.length > 0) {
        bodyHtml += '<div class="options">'
        for (const [key, val] of optEntries) {
          bodyHtml += `<div class="option"><span class="opt-key">${escapeHtml(key)}.</span> ${escapeHtml(val)}</div>`
        }
        bodyHtml += '</div>'
      }
    }
    // Answer line for fill/short/essay
    if (['fill', 'short', 'essay', 'comprehension', 'composition'].includes(q.question_type)) {
      bodyHtml += '<div class="answer-line">答：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</div>'
      if (['short', 'essay', 'comprehension', 'composition'].includes(q.question_type)) {
        bodyHtml += '<div class="answer-line">＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</div>'
      }
    }
  } else {
    // Answer key mode
    bodyHtml += `<div class="answer-key">答案：<strong>${escapeHtml(q.correct_answer)}</strong></div>`
    if (q.explanation) {
      bodyHtml += `<div class="explanation">解釋：${escapeHtml(q.explanation)}</div>`
    }
  }

  return `
    <div class="question">
      <div class="question-header">
        <span class="type-badge">[${escapeHtml(label)}]</span>
        <span class="question-text">${q.question_number}. ${escapeHtml(q.question_text)}</span>
      </div>
      ${diagramHtml}
      ${bodyHtml}
    </div>
  `
}

export function buildPdfHtml(
  paper: PaperInfo,
  questions: QuestionRow[],
  type: 'question' | 'answer'
): string {
  const today = new Date().toLocaleDateString('zh-HK')
  const questionsHtml = questions.map((q, i) => renderQuestion(q, type, i)).join('')
  const hasDiagrams = questions.some(q => q.question_type === 'diagram_mc' && q.diagram_spec)

  const jsxgraphScript = hasDiagrams ? `
    <script src="https://cdn.jsdelivr.net/npm/jsxgraph@1.9.2/distrib/jsxgraphcore.js"></script>
    <script>
    window.addEventListener('load', function() {
      var queue = window.__diagramQueue || [];
      queue.forEach(function(item) {
        try {
          renderDiagram(item.spec, item.containerId);
        } catch(e) {
          console.error('Diagram render error:', e);
        }
      });
      // Signal that diagrams are ready
      window.__diagramsReady = true;
    });

    function renderDiagram(spec, containerId) {
      var el = document.getElementById(containerId);
      if (!el) return;
      el.style.width = '220px';
      el.style.height = '180px';

      var board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: [-5, 5, 5, -5],
        axis: false,
        grid: false,
        showNavigation: false,
        showCopyright: false,
        pan: { enabled: false },
        zoom: { enabled: false }
      });

      switch(spec.type) {
        case 'clock':
          renderClock(board, spec);
          break;
        case 'number_line':
          renderNumberLine(board, spec);
          break;
        case 'polygon':
          renderPolygon(board, spec);
          break;
        case 'circle':
          renderCircle(board, spec);
          break;
        case 'angle':
          renderAngle(board, spec);
          break;
        case 'compass':
          renderCompass(board, spec);
          break;
        case 'fraction_bar':
          renderFractionBar(board, spec);
          break;
        case 'bar_chart':
          renderBarChart(board, spec);
          break;
        default:
          board.create('text', [0, 0, spec.type || '圖形'], { fontSize: 14 });
      }
    }

    function renderClock(board, spec) {
      var hour = spec.hour || 12;
      var minute = spec.minute || 0;
      // Clock face
      board.create('circle', [[0,0], [0,4]], { strokeColor: '#1b4332', strokeWidth: 2, fillColor: '#f8fdf9' });
      // Hour markers
      for (var i = 1; i <= 12; i++) {
        var angle = (90 - i * 30) * Math.PI / 180;
        var x = 3.5 * Math.cos(angle);
        var y = 3.5 * Math.sin(angle);
        board.create('text', [x - 0.3, y - 0.2, i.toString()], { fontSize: 10, strokeColor: '#333' });
      }
      // Hour hand
      var hourAngle = (90 - (hour % 12) * 30 - minute * 0.5) * Math.PI / 180;
      board.create('line', [[0,0], [2.2 * Math.cos(hourAngle), 2.2 * Math.sin(hourAngle)]], {
        strokeColor: '#1b4332', strokeWidth: 3, straightFirst: false, straightLast: false
      });
      // Minute hand
      var minAngle = (90 - minute * 6) * Math.PI / 180;
      board.create('line', [[0,0], [3.2 * Math.cos(minAngle), 3.2 * Math.sin(minAngle)]], {
        strokeColor: '#2d6a4f', strokeWidth: 2, straightFirst: false, straightLast: false
      });
      // Center dot
      board.create('point', [0, 0], { size: 3, fillColor: '#1b4332', strokeColor: '#1b4332', name: '' });
    }

    function renderNumberLine(board, spec) {
      var min = spec.min !== undefined ? spec.min : 0;
      var max = spec.max !== undefined ? spec.max : 10;
      board.options.boundingbox = [min - 1, 2, max + 1, -2];
      board.setBoundingBox([min - 1, 2, max + 1, -2]);
      // Axis
      board.create('line', [[min, 0], [max, 0]], {
        strokeColor: '#333', strokeWidth: 2, straightFirst: false, straightLast: false
      });
      // Tick marks and labels
      for (var i = min; i <= max; i++) {
        board.create('line', [[i, 0.2], [i, -0.2]], {
          strokeColor: '#333', strokeWidth: 1, straightFirst: false, straightLast: false
        });
        board.create('text', [i - 0.15, -0.5, i.toString()], { fontSize: 10 });
      }
      // Marks
      if (spec.marks) {
        spec.marks.forEach(function(m) {
          board.create('point', [m.value, 0], {
            size: 4, fillColor: '#2d6a4f', strokeColor: '#1b4332', name: m.label || ''
          });
        });
      }
      // Jumps (arcs)
      if (spec.jumps) {
        spec.jumps.forEach(function(j) {
          var mid = (j.from + j.to) / 2;
          var height = Math.abs(j.to - j.from) * 0.3;
          board.create('curve', [
            function(t) { return mid + (j.to - j.from) / 2 * Math.cos(Math.PI - t); },
            function(t) { return height * Math.sin(t); },
            0, Math.PI
          ], { strokeColor: '#e63946', strokeWidth: 2 });
          if (j.label) {
            board.create('text', [mid - 0.3, height + 0.3, j.label], { fontSize: 11, strokeColor: '#e63946' });
          }
        });
      }
    }

    function renderPolygon(board, spec) {
      var pts = spec.vertices.map(function(v, i) {
        return board.create('point', [v[0], v[1]], {
          size: 3, fillColor: '#1b4332', strokeColor: '#1b4332',
          name: String.fromCharCode(65 + i), label: { fontSize: 11 }
        });
      });
      board.create('polygon', pts, { fillColor: '#d8f3dc', strokeColor: '#1b4332', strokeWidth: 2 });
      // Side labels
      if (spec.sideLabels) {
        spec.sideLabels.forEach(function(label, i) {
          var a = spec.vertices[i];
          var b = spec.vertices[(i + 1) % spec.vertices.length];
          var mx = (a[0] + b[0]) / 2;
          var my = (a[1] + b[1]) / 2;
          board.create('text', [mx + 0.2, my + 0.2, label], { fontSize: 10, strokeColor: '#2d6a4f' });
        });
      }
    }

    function renderCircle(board, spec) {
      var r = spec.radius || 3;
      board.create('circle', [[0,0], [0, r]], {
        strokeColor: '#1b4332', strokeWidth: 2, fillColor: '#d8f3dc'
      });
      board.create('point', [0, 0], { size: 3, fillColor: '#1b4332', name: 'O', label: { fontSize: 11 } });
      // Radius line
      board.create('line', [[0,0], [r, 0]], {
        strokeColor: '#e63946', strokeWidth: 2, dash: 2, straightFirst: false, straightLast: false
      });
      if (spec.radiusLabel) {
        board.create('text', [r/2 - 0.3, 0.4, spec.radiusLabel], { fontSize: 11, strokeColor: '#e63946' });
      }
    }

    function renderAngle(board, spec) {
      var deg = spec.degrees || 90;
      var rad = deg * Math.PI / 180;
      var len = 3;
      board.create('line', [[0,0], [len, 0]], {
        strokeColor: '#1b4332', strokeWidth: 2, straightFirst: false, straightLast: false
      });
      board.create('line', [[0,0], [len * Math.cos(rad), len * Math.sin(rad)]], {
        strokeColor: '#1b4332', strokeWidth: 2, straightFirst: false, straightLast: false
      });
      board.create('arc', [[0,0], [1.5, 0], [1.5 * Math.cos(rad), 1.5 * Math.sin(rad)]], {
        strokeColor: '#e63946', strokeWidth: 1.5
      });
      var labelAngle = rad / 2;
      var labelText = spec.label || (deg + '°');
      board.create('text', [1.8 * Math.cos(labelAngle) - 0.3, 1.8 * Math.sin(labelAngle), labelText], {
        fontSize: 11, strokeColor: '#e63946'
      });
    }

    function renderCompass(board, spec) {
      var highlight = spec.highlight || 'N';
      var dirs = [
        { label: 'N', x: 0, y: 3.5, angle: 90 },
        { label: 'S', x: 0, y: -3.5, angle: 270 },
        { label: 'E', x: 3.5, y: 0, angle: 0 },
        { label: 'W', x: -3.5, y: 0, angle: 180 }
      ];
      board.create('circle', [[0,0], [0,4]], {
        strokeColor: '#aaa', strokeWidth: 1, fillColor: '#f8fdf9'
      });
      dirs.forEach(function(d) {
        var color = d.label === highlight ? '#e63946' : '#1b4332';
        var angle = d.angle * Math.PI / 180;
        board.create('line', [[0,0], [3 * Math.cos(angle), 3 * Math.sin(angle)]], {
          strokeColor: color, strokeWidth: d.label === highlight ? 3 : 1.5,
          straightFirst: false, straightLast: false
        });
        board.create('text', [d.x - 0.2, d.y - 0.15, d.label], {
          fontSize: 13, strokeColor: color
        });
      });
      board.create('point', [0, 0], { size: 4, fillColor: '#1b4332', name: '' });
    }

    function renderFractionBar(board, spec) {
      var total = spec.total || 8;
      var shaded = spec.shaded || 3;
      var barW = 8, barH = 1.5;
      var segW = barW / total;
      board.options.boundingbox = [-1, 3, 9, -2];
      board.setBoundingBox([-1, 3, 9, -2]);
      for (var i = 0; i < total; i++) {
        var x = i * segW;
        var fill = i < shaded ? '#2d6a4f' : '#d8f3dc';
        board.create('polygon', [
          [x, 0], [x + segW, 0], [x + segW, barH], [x, barH]
        ], { fillColor: fill, strokeColor: '#1b4332', strokeWidth: 1 });
      }
      if (spec.label) {
        board.create('text', [barW / 2 - 0.5, -0.8, spec.label], { fontSize: 14, strokeColor: '#1b4332' });
      }
    }

    function renderBarChart(board, spec) {
      var bars = spec.bars || [];
      var n = bars.length;
      var maxVal = Math.max.apply(null, bars.map(function(b) { return b.value; }));
      var barW = 1.2, gap = 0.6;
      var totalW = n * (barW + gap);
      board.options.boundingbox = [-0.5, maxVal + 1, totalW + 0.5, -1.5];
      board.setBoundingBox([-0.5, maxVal + 1, totalW + 0.5, -1.5]);
      // Y axis
      board.create('line', [[0, 0], [0, maxVal + 0.5]], {
        strokeColor: '#333', strokeWidth: 1.5, straightFirst: false, straightLast: false
      });
      // X axis
      board.create('line', [[0, 0], [totalW, 0]], {
        strokeColor: '#333', strokeWidth: 1.5, straightFirst: false, straightLast: false
      });
      bars.forEach(function(b, i) {
        var x = i * (barW + gap) + gap / 2;
        board.create('polygon', [
          [x, 0], [x + barW, 0], [x + barW, b.value], [x, b.value]
        ], { fillColor: '#2d6a4f', strokeColor: '#1b4332', strokeWidth: 1 });
        board.create('text', [x + barW/2 - 0.3, -0.7, b.label], { fontSize: 10 });
        board.create('text', [x + barW/2 - 0.2, b.value + 0.2, b.value.toString()], { fontSize: 10 });
      });
    }
    </script>
  ` : ''

  const watermarkCss = type === 'question' ? `
    .watermark {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .watermark-text {
      font-size: 48px;
      color: rgba(45, 106, 79, 0.06);
      transform: rotate(-45deg);
      white-space: nowrap;
      font-family: 'Noto Sans TC', sans-serif;
      letter-spacing: 4px;
      user-select: none;
    }
  ` : ''

  return `<!DOCTYPE html>
<html lang="zh-HK">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>殷學社教育中心 - ${escapeHtml(paper.unit)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
      font-size: 11pt;
      color: #1a2e22;
      background: white;
      padding: 0;
    }
    @page {
      size: A4;
      margin: 15mm 15mm 18mm 15mm;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }

    /* Header */
    .page-header {
      text-align: center;
      border-bottom: 2px solid #2d6a4f;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .school-name {
      font-size: 18pt;
      font-weight: 700;
      color: #1b4332;
      letter-spacing: 2px;
    }
    .paper-info {
      font-size: 10pt;
      color: #2d6a4f;
      margin-top: 3px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #5a7a65;
      margin-top: 4px;
    }
    .student-info {
      display: flex;
      gap: 20px;
      margin-top: 8px;
      font-size: 10.5pt;
    }
    .student-info span {
      border-bottom: 1px solid #aaa;
      min-width: 100px;
      display: inline-block;
    }

    /* AI disclaimer */
    .ai-disclaimer {
      background: #fffbeb;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 8pt;
      color: #92400e;
      margin: 8px 0 10px;
    }

    /* Questions */
    .questions-container {
      column-count: 1;
    }
    .question {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 12px;
      padding: 8px 10px;
      border-left: 3px solid #d8f3dc;
      background: #fafffe;
    }
    .question-header {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .type-badge {
      font-size: 8.5pt;
      color: #2d6a4f;
      font-weight: 700;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .question-text {
      font-size: 11pt;
      line-height: 1.5;
    }

    /* Diagram */
    .diagram-container {
      width: 220px;
      height: 180px;
      margin: 8px 0 8px 20px;
      border: 1px solid #d8f3dc;
      border-radius: 4px;
      background: white;
    }
    .image-placeholder {
      display: inline-block;
      margin: 6px 0 6px 20px;
      padding: 6px 12px;
      background: #f0f7f4;
      border: 1px solid #2d6a4f;
      border-radius: 4px;
      font-size: 9pt;
      color: #2d6a4f;
    }

    /* Options */
    .options {
      margin: 6px 0 0 20px;
    }
    .option {
      font-size: 10.5pt;
      margin: 3px 0;
      line-height: 1.4;
    }
    .opt-key {
      font-weight: 700;
      color: #2d6a4f;
      margin-right: 4px;
    }

    /* Answer lines */
    .answer-line {
      font-size: 10pt;
      color: #aaa;
      margin: 4px 0 0 20px;
      letter-spacing: 1px;
    }

    /* Answer key */
    .answer-key {
      margin: 4px 0 0 20px;
      font-size: 10.5pt;
      color: #2d6a4f;
    }
    .explanation {
      margin: 3px 0 0 20px;
      font-size: 9.5pt;
      color: #5a7a65;
    }

    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 5mm;
      left: 15mm;
      right: 15mm;
      font-size: 7pt;
      color: #5a7a65;
      text-align: center;
      border-top: 1px solid #e0ebe3;
      padding-top: 3px;
    }

    ${watermarkCss}
  </style>
  ${jsxgraphScript}
</head>
<body>
  ${type === 'question' ? `
  <div class="watermark">
    <div class="watermark-text">殷學社教育中心 &nbsp; 殷學社教育中心 &nbsp; 殷學社教育中心</div>
  </div>` : ''}

  <div class="page-header">
    <div class="school-name">殷學社教育中心</div>
    <div class="paper-info">${escapeHtml(paper.subject)} · ${escapeHtml(paper.topic)} · ${escapeHtml(paper.unit)}</div>
    <div class="meta-row">
      <span>${type === 'answer' ? '【答案卷】' : '【練習卷】'}</span>
      <span>${today}</span>
    </div>
    ${type === 'question' ? `
    <div class="student-info">
      <div>姓名：<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
      <div>班別：<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
      <div>日期：<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
    </div>` : ''}
  </div>

  <div class="ai-disclaimer">
    【AI 生成內容｜僅供參考】本練習卷由 AI 自動生成，題目及答案可能不完全準確。建議家長在使用前核對內容。
  </div>

  <div class="questions-container">
    ${questionsHtml}
  </div>

  <div class="page-footer">
    免責聲明：本練習卷由殷學社教育中心 AI 系統自動生成，僅供學習參考之用。如有任何錯誤或遺漏，本中心恕不負責。
  </div>
</body>
</html>`
}
