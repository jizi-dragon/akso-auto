/**
 * 纯 Node.js .docx 大纲提取器（v2 — 双遍解析版）
 *
 * 替代 extract-outline.py，无需 Python 依赖。
 * 通过 PowerShell 解压 docx → 解析 word/document.xml → 提取章节结构
 * v2: 双遍解析，遍历 <w:body> 下所有 <w:p>、<w:tbl>、<w:sdt> 子元素
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 仅 Title、Heading1 和数字编号样式可产生 chapter 级标题
const CHAPTER_STYLES = new Set(['Title', 'Heading1', '1', '2', '3', '9', '10', '11']);
// 所有可被识别为标题的样式
const HEADING_STYLES = new Set(['Title', 'Heading1', 'Heading2', '1', '2', '3', '9', '10', '11', '19', '20', '26', '23']);
const ATTACHMENT_KEYWORDS = ['附件', '附表'];
const INDENT = '\u3000\u3000';

/**
 * 判断是否为纯目录条目（仅"目录"标题行）
 */
function isTocEntry(text) {
  return text.trim() === '目录';
}

/**
 * 清理目录条目末尾的页码数字
 * "1. 系统概述1" → "1. 系统概述"
 * "4 氮气监测趋势分析及评价7" → "4 氮气监测趋势分析及评价"
 */
function cleanTocTrailing(text) {
  return text.replace(/\s*\d+$/, '').trim();
}

/**
 * 从 body 内容中提取有序的元素数组
 * 遍历 <w:body> 下所有顶层子元素：<w:p>、<w:tbl>、<w:sdt>
 * 返回 [{ type, text?, style?, leftIndent?, texts? }]
 */
function parseBodyElements(xml) {
  const bodyMatch = xml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/);
  if (!bodyMatch) return [];
  const bodyContent = bodyMatch[1];

  const elements = [];

  // 用正则匹配所有 w:p / w:tbl / w:sdt 的开闭标签位置
  // 注意：需正确处理自闭合标签（<w:p ... />），避免深度追踪卡死
  const tagRe = /<(\/)?(w:p|w:tbl|w:sdt)([\s/][^>]*?)?(\/)?>/g;
  const positions = [];
  let m;
  while ((m = tagRe.exec(bodyContent)) !== null) {
    const selfClosing = !!m[4] || m[0].endsWith('/>');
    if (m[1]) {
      positions.push({ index: m.index, isOpen: false, tag: m[2], selfClosing: false });
    } else {
      positions.push({ index: m.index, isOpen: true, tag: m[2], selfClosing });
    }
  }

  // 深度追踪，提取顶层元素边界
  const topLevelEls = [];
  let depth = 0;
  let currentStart = -1;
  let currentTag = '';

  for (const pos of positions) {
    if (pos.selfClosing) {
      // 自闭合标签：视为完整的顶层元素（不改变深度）
      if (depth === 0) {
        const selfCloseEnd = bodyContent.indexOf('>', pos.index) + 1;
        topLevelEls.push({ start: pos.index, end: selfCloseEnd, tag: pos.tag });
      }
      continue;
    }
    if (pos.isOpen) {
      if (depth === 0) {
        currentStart = pos.index;
        currentTag = pos.tag;
      }
      depth++;
    } else {
      depth--;
      if (depth === 0 && pos.tag === currentTag) {
        const closeEnd = bodyContent.indexOf('>', pos.index) + 1;
        topLevelEls.push({ start: currentStart, end: closeEnd, tag: currentTag });
      }
    }
  }

  // 解析每个顶层元素
  for (const el of topLevelEls) {
    const elXml = bodyContent.substring(el.start, el.end);

    if (el.tag === 'w:p') {
      const text = extractParagraphText(elXml);
      const style = extractParagraphStyle(elXml);
      const leftIndent = extractParagraphLeftIndent(elXml);

      // 段落含图片标记 → 若含节编号文本，优先当作段落处理
      if (/<(?:w:drawing|wp:inline|a:blip)/.test(elXml)) {
        const secNum = getSectionNum(text);
        if (text && secNum) {
          // 有节编号的图文段落 → 保留为段落（文本优先）
          elements.push({ type: 'p', text, style, leftIndent });
        } else {
          elements.push({ type: 'img', text, style, leftIndent });
        }
      } else if (text) {
        elements.push({ type: 'p', text, style, leftIndent });
      }
    } else if (el.tag === 'w:tbl') {
      const texts = extractTableCellTexts(elXml);
      elements.push({ type: 'tbl', texts });
    } else if (el.tag === 'w:sdt') {
      // <w:sdt> 可能包含表格或普通段落
      if (/<w:tbl[\s>]/.test(elXml)) {
        const texts = extractTableCellTexts(elXml);
        elements.push({ type: 'tbl', texts });
      } else {
        const text = extractParagraphText(elXml);
        if (text) {
          elements.push({ type: 'p', text, style: '', leftIndent: null });
        }
      }
    }
  }

  return elements;
}

/**
 * 从 XML 片段中提取所有 <w:t> 文本
 */
function extractParagraphText(xml) {
  const texts = [];
  const tRe = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = tRe.exec(xml)) !== null) {
    texts.push(m[1]);
  }
  return texts.join('').trim();
}

/**
 * 从段落 XML 中提取样式名
 */
function extractParagraphStyle(pXml) {
  const m = pXml.match(/<w:pStyle[^>]*w:val="([^"]*)"/);
  return m ? m[1] : '';
}

/**
 * 从段落 XML 中提取左缩进量 (twips)
 */
function extractParagraphLeftIndent(pXml) {
  const m = pXml.match(/<w:ind[^>]*w:left="(\d+)"/);
  return m ? parseInt(m[1]) : null;
}

/**
 * 递归提取表格单元格文本（<w:tc> → <w:p> → <w:t>）
 */
function extractTableCellTexts(tblXml) {
  const texts = [];
  const tcRe = /<w:tc[ >][\s\S]*?<\/w:tc>/g;
  let m;
  while ((m = tcRe.exec(tblXml)) !== null) {
    const cellText = extractParagraphText(m[0]);
    if (cellText) texts.push(cellText);
  }
  return texts;
}

/**
 * 根据前一个章节标题推断表格描述
 */
function inferTableDesc(prevTitle) {
  const t = prevTitle || '';
  if (/质量标准|监测/.test(t)) return '质量标准及监测频次';
  if (/批号/.test(t) && /检测结果/.test(t)) return '检验结果对照表';
  if (/偏差/.test(t)) return '偏差汇总表';
  if (/变更/.test(t)) return '变更汇总表';
  if (/统计|TOC/.test(t)) return '数据统计表';
  if (/汇总/.test(t)) return '汇总表';
  return '数据表';
}

/**
 * 根据前一个章节标题推断图片描述
 */
function inferImageDesc(prevTitle) {
  const t = prevTitle || '';
  if (/趋势图|趋势分析/.test(t)) return '趋势图';
  if (/分布图/.test(t)) return '分布图';
  if (/流程图/.test(t)) return '流程图';
  if (/工艺/.test(t)) return '工艺流程图';
  return '图表';
}

/**
 * 判断文本是否为数据值（不应归为标题）
 * "8.75 -9.25"、"7.9 -8.4"、"2026.01"、"≤1.4%"、"N/A"、"100%"、"0%" 等
 */
function isDataValue(text) {
  const t = text.trim();
  if (/^N\/A$/i.test(t)) return true;
  if (/^(?:[≤<>≥]?\s*\d+(?:\.\d+)?\s*%)$/.test(t)) return true;
  if (/^\d+\.\d+\s*[-–]\s*\d+\.\d+$/.test(t)) return true;
  if (/^\d{4}\.\d{2}$/.test(t)) return true;
  if (/^\d{4}\.\d{2}\.\d{2}[，\s-]/.test(t)) return true;
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(t)) return true;
  return false;
}

function getSectionNum(title) {
  // 限制子节编号为 1-2 位数字，且必须以非数字结尾（避免 "4.2.2026" 中的 "20" 被误匹配）
  const m = title.match(/^(\d+(?:\.\d{1,2})*)(?=[^\d]|$)/);
  return m ? m[1] : null;
}

function cleanTitle(title, secNum) {
  if (secNum) {
    // 精确去掉 secNum 前缀（含后续分隔符 . 、 、空格）
    const prefix = secNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return title.replace(new RegExp('^' + prefix + '[.、\\s]*'), '').trim();
  }
  // 降级方案：去掉常见编号前缀
  return title.replace(/^[\d.]+\s*[、]?\s*/, '').trim();
}

/**
 * 检测隐式标题（无显式编号但有标题特征）
 */
function looksLikeImplicitHeading(text, leftIndent, nextElements) {
  if (text.length > 25) return false;
  if (leftIndent === 360045) return false;
  const bodyKw = ['备注', 'USL', 'LSL', '结论', '警戒限度', '行动限度', '小结', '从趋势图', '根据', '基于', '结合', '由于'];
  if (bodyKw.some(kw => text.startsWith(kw))) return false;
  const next = nextElements.find(el => el.type === 'p');
  return next && next.leftIndent === 360045 && next.text.length > 20;
}

/**
 * 从 Normal 样式段落中提取章名称
 * 处理嵌入子节编号的情况：如 "3.质量管理系统运行情况3.1 体系..." → "质量管理系统运行情况"
 */
function extractChapterName(text) {
  let name = text.replace(/^[\d.]+\s*[、]?\s*/, '');
  // 若含嵌入子节编号（如 "xxx3.1"），截断到子节前
  const embedded = name.match(/^(.*?)\s*\d+\.\d+/);
  if (embedded) {
    name = embedded[1].trim();
  }
  return name;
}

/**
 * 从有序 bodyElements 数组中提取章节结构
 * bodyElements: [{ type:'p'|'tbl'|'img', text?, style?, leftIndent?, texts? }]
 */
function extractSections(bodyElements) {
  const sections = [];
  let currentSection = null;
  let parentChapter = null;
  let implicitCounter = 0;
  let insideAttachment = false;

  for (let i = 0; i < bodyElements.length; i++) {
    const el = bodyElements[i];

    // --- 表格处理 ---
    if (el.type === 'tbl') {
      let prevTitle = '';
      if (currentSection) {
        prevTitle = currentSection.clean_title || currentSection.title || '';
      }
      const desc = inferTableDesc(prevTitle);
      if (currentSection) {
        currentSection.media_placeholders = currentSection.media_placeholders || [];
        currentSection.media_placeholders.push({ type: 'table', text: desc });
      }
      continue;
    }

    // --- 图片处理 ---
    if (el.type === 'img') {
      let prevTitle = '';
      if (currentSection) {
        prevTitle = currentSection.clean_title || currentSection.title || '';
      }
      const desc = inferImageDesc(prevTitle);
      if (currentSection) {
        currentSection.media_placeholders = currentSection.media_placeholders || [];
        currentSection.media_placeholders.push({ type: 'image', text: desc });
      }
      continue;
    }

    // --- 段落处理 ---
    const text = el.text;
    const style = el.style;
    const leftIndent = el.leftIndent;

    // 跳过目录
    if (style.startsWith('toc')) continue;
    // 跳过短路径
    if (text.includes('//') && text.length < 20) continue;
    // 跳过文档开头公司名
    if (text.includes('有限公司') && sections.length === 0) continue;

    // 数据值 → 正文，不归为标题
    if (isDataValue(text)) {
      if (currentSection && !currentSection.is_attachment) {
        currentSection.content = currentSection.content || [];
        currentSection.content.push(text);
      }
      continue;
    }

    // 附件内部：仅当再次遇到标题样式段落时才跳出
    // CHAPTER_STYLE 段落始终放行（可能是新章节开始）
    if (insideAttachment && !HEADING_STYLES.has(style)) continue;
    if (insideAttachment && HEADING_STYLES.has(style) && !getSectionNum(text) && !CHAPTER_STYLES.has(style)) continue;

    // 标题样式段落
    if (HEADING_STYLES.has(style)) {
      // 跳过纯目录条目（"目录"行 或 末尾带页码的 TOC 行）
      if (isTocEntry(text)) continue;

      // 样式 9（TOC 条目）：清理末尾页码数字，作为真实标题使用
      let workingText = text;
      if (style === '9') {
        workingText = cleanTocTrailing(text);
      }

      const secNum = getSectionNum(workingText);

      // 无编号但属于子标题样式（19, 20）→ 作为隐式子标题
      // 注意：样式 2 也可能是章标题，优先让 CHAPTER_STYLE 逻辑处理
      if (!secNum && (style === '19' || style === '20')) {
        // 样式 20 长段落是正文而非标题（如"从趋势图可以看出……"）
        if (style === '20' && workingText.length > 25) {
          if (currentSection && !currentSection.is_attachment) {
            currentSection.content = currentSection.content || [];
            currentSection.content.push(workingText);
          }
          continue;
        }
        if (parentChapter) {
          implicitCounter++;
          const implNum = parentChapter.sec_num + '.' + implicitCounter;
          sections.push({
            type: 'sub', title: implNum + ' ' + workingText, sec_num: implNum,
            clean_title: workingText,
            content: [], media_placeholders: [],
            is_implicit: true
          });
          currentSection = sections[sections.length - 1];
        }
        continue;
      }

      // 无编号的标题样式段落
      if (!secNum) {
        // CHAPTER_STYLE 无编号 → 尝试匹配已有章节，否则创建隐式章节
        if (CHAPTER_STYLES.has(style)) {
          // 文本需像标题（短且非正文关键词），否则降级为正文
          const bodyStartKw = ['备注', '注：', '说明', '注:', '附注'];
          if (workingText.length > 40 || bodyStartKw.some(kw => workingText.startsWith(kw))) {
            if (currentSection && !currentSection.is_attachment) {
              currentSection.content = currentSection.content || [];
              currentSection.content.push(workingText);
            }
            continue;
          }
          // 样式 2 在已有章节时作为隐式子标题（纯化水等文档用）
          if (parentChapter && style === '2') {
            implicitCounter++;
            const implNum = parentChapter.sec_num + '.' + implicitCounter;
            sections.push({
              type: 'sub', title: implNum + ' ' + workingText, sec_num: implNum,
              clean_title: workingText,
              content: [], media_placeholders: [],
              is_implicit: true
            });
            currentSection = sections[sections.length - 1];
            continue;
          }
          const existing = sections.find(s => s.type === 'chapter' && s.clean_title === workingText);
          if (existing) {
            currentSection = existing;
            parentChapter = existing;
            implicitCounter = 0;
            insideAttachment = existing.is_attachment || false;
            continue;
          }
          const chNum = sections.filter(s => s.type === 'chapter').length + 1;
          const isAtt = ATTACHMENT_KEYWORDS.some(kw => workingText.includes(kw));
          sections.push({
            type: 'chapter', title: chNum + ' ' + workingText, sec_num: String(chNum),
            clean_title: workingText,
            content: [], media_placeholders: [],
            is_attachment: isAtt,
            is_implicit: true
          });
          currentSection = sections[sections.length - 1];
          parentChapter = currentSection;
          implicitCounter = 0;
          insideAttachment = isAtt;
          continue;
        }
        // 其他样式无编号 → 降级为正文
        if (currentSection && !currentSection.is_attachment) {
          currentSection.content = currentSection.content || [];
          currentSection.content.push(workingText);
        }
        continue;
      }

      // --- 以下：有编号的标题 ---
      const cleanT = workingText.replace(/\s*\d+$/, '').trim();
      const cleanName = cleanTitle(cleanT, secNum);
      const isAttachment = ATTACHMENT_KEYWORDS.some(kw => cleanT.includes(kw));

      // 仅 CHAPTER_STYLE + 编号不含小数点 → chapter
      if (CHAPTER_STYLES.has(style) && !secNum.includes('.')) {
        const existing = sections.find(s => s.type === 'chapter' && s.sec_num === secNum);
        if (existing) {
          currentSection = existing;
          parentChapter = existing;
          implicitCounter = 0;
          insideAttachment = existing.is_attachment || false;
          continue;
        }
        sections.push({
          type: 'chapter', title: cleanT, sec_num: secNum,
          clean_title: cleanName,
          content: [], media_placeholders: [],
          is_attachment: isAttachment
        });
        currentSection = sections[sections.length - 1];
        parentChapter = currentSection;
        implicitCounter = 0;
        insideAttachment = isAttachment;
        continue;
      }

      // 编号含小数点 → sub（含去重）
      if (secNum.includes('.')) {
        const existing = sections.find(s => s.type === 'sub' && s.sec_num === secNum);
        if (existing) {
          currentSection = existing;
          continue;
        }
        sections.push({
          type: 'sub', title: cleanT, sec_num: secNum,
          clean_title: cleanName,
          content: [], media_placeholders: [],
          is_attachment: isAttachment
        });
        currentSection = sections[sections.length - 1];
        if (isAttachment) insideAttachment = true;
        continue;
      }

      // Heading2 等非 Title/Heading1 样式 + 无小数点 → 跳过
      continue;
    }

    // Normal 样式：显式编号
    const secNum = getSectionNum(text);
    if (secNum && !isDataValue(text)) {
      // 中文列表项（N、格式）→ 降级为正文，不创建章节
      // 例："3、执行中的变更" 是 Ch2.5 下的列表项，非 Ch3
      if (/^\d+、/.test(text)) {
        if (currentSection && !currentSection.is_attachment) {
          currentSection.content = currentSection.content || [];
          currentSection.content.push(text);
        }
        continue;
      }

      // 编号含小数点 → sub
      if (secNum.includes('.')) {
        sections.push({
          type: 'sub', title: text, sec_num: secNum,
          clean_title: cleanTitle(text, secNum),
          content: [], media_placeholders: []
        });
        currentSection = sections[sections.length - 1];
        continue;
      }
      // 编号无小数点 + 看起来像章标题 → chapter（如 "3 CAPA管理运行情况评估"）
      const cleanName = extractChapterName(text);
      const bodyStartKw = ['备注', '注：', '说明', '注:', '附注'];
      if (cleanName.length > 0 && cleanName.length <= 40 && !bodyStartKw.some(kw => cleanName.startsWith(kw))) {
        const chIdx = sections.filter(s => s.type === 'chapter').length + 1;
        if (secNum === String(chIdx)) {
          const isAtt = ATTACHMENT_KEYWORDS.some(kw => text.includes(kw));
          sections.push({
            type: 'chapter', title: text, sec_num: secNum,
            clean_title: cleanName,
            content: [], media_placeholders: [],
            is_attachment: isAtt
          });
          currentSection = sections[sections.length - 1];
          parentChapter = currentSection;
          implicitCounter = 0;
          insideAttachment = isAtt;
          continue;
        }
      }
    }

    // Normal 样式：隐式标题检测
    if (looksLikeImplicitHeading(text, leftIndent, bodyElements.slice(i + 1, i + 10))) {
      if (parentChapter) {
        implicitCounter++;
        const implNum = parentChapter.sec_num + '.' + implicitCounter;
        sections.push({
          type: 'sub', title: implNum + ' ' + text, sec_num: implNum,
          clean_title: text,
          content: [], media_placeholders: [],
          is_implicit: true
        });
        currentSection = sections[sections.length - 1];
        continue;
      }
    }

    // 正文
    if (currentSection && !currentSection.is_attachment) {
      currentSection.content = currentSection.content || [];
      currentSection.content.push(text);
    }
  }

  return sections;
}

/**
 * 格式化输出：三部分 —— [TOC 目录] / [完整子标题结构] / [大纲 + 文字段落]
 */
function formatOutput(inputPath, sections) {
  const docTitle = path.basename(inputPath, '.docx');

  const lines = [];
  lines.push('='.repeat(60));
  lines.push(docTitle);
  lines.push('='.repeat(60));
  lines.push('');

  // [TOC 目录]
  lines.push('[TOC 目录]');
  lines.push('-'.repeat(40));
  const chapters = sections.filter(s => s.type === 'chapter');
  const subs = sections.filter(s => s.type === 'sub');

  for (const ch of chapters) {
    lines.push(ch.sec_num + ' ' + ch.clean_title);
  }
  lines.push('');

  // [完整子标题结构] — 按章节分组，子标题嵌套在所属一级标题下
  lines.push('[完整子标题结构]');
  lines.push('-'.repeat(40));
  for (const ch of chapters) {
    lines.push(ch.sec_num + ' ' + ch.clean_title);
    const chSubs = subs.filter(s => s.sec_num.startsWith(ch.sec_num + '.'));
    chSubs.sort((a, b) => a.sec_num.localeCompare(b.sec_num, undefined, { numeric: true }));
    for (const sub of chSubs) {
      const depth = sub.sec_num.split('.').length - 1;
      const prefix = '  '.repeat(depth);
      lines.push(prefix + sub.sec_num + ' ' + sub.clean_title);
    }
  }
  lines.push('');

  // [大纲 + 文字段落] — 按章节分组，子标题和正文嵌套在所属章节下
  lines.push('[大纲 + 文字段落]');
  lines.push('-'.repeat(40));
  for (const ch of chapters) {
    lines.push('--- Ch' + ch.sec_num + ' ---');
    lines.push(ch.sec_num + ' ' + ch.clean_title);

    // 输出该章的媒体占位符（表格/图片）
    if (ch.media_placeholders && ch.media_placeholders.length > 0) {
      for (const mp of ch.media_placeholders) {
        if (mp.type === 'image') {
          lines.push('[图片：' + mp.text + ']');
        } else if (mp.type === 'table') {
          lines.push('[表格：' + mp.text + ']');
        }
      }
    }

    if (ch.is_attachment) {
      if (!ch.media_placeholders || ch.media_placeholders.length === 0) {
        lines.push(INDENT + '[以下为附件数据表格，不含文字段落]');
      }
      lines.push('');
      continue;
    }

    // 输出该章的子标题及其内容
    const chSubs = subs.filter(s => s.sec_num.startsWith(ch.sec_num + '.'));
    chSubs.sort((a, b) => a.sec_num.localeCompare(b.sec_num, undefined, { numeric: true }));
    for (const sub of chSubs) {
      lines.push(sub.sec_num + ' ' + sub.clean_title);
      if (sub.media_placeholders) {
        for (const mp of sub.media_placeholders) {
          if (mp.type === 'image') {
            lines.push('[图片：' + mp.text + ']');
          } else if (mp.type === 'table') {
            lines.push('[表格：' + mp.text + ']');
          }
        }
      }
      if (sub.content) {
        for (const ctext of sub.content) {
          lines.push(INDENT + ctext);
        }
      }
    }

    // 输出该章自身的正文（不归属任何子标题的段落）
    if (ch.content) {
      for (const ctext of ch.content) {
        lines.push(INDENT + ctext);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

function extractOutline(inputPath, outputPath) {
  const tempDir = path.join(os.tmpdir(), 'qrs_extract_' + Date.now());

  try {
    // Step 1: 解压 docx（PowerShell Expand-Archive 不支持 .docx 扩展名，需先拷贝为 .zip）
    fs.mkdirSync(tempDir, { recursive: true });
    const tempZip = path.join(tempDir, 'temp.zip');
    fs.copyFileSync(inputPath, tempZip);
    execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempDir}' -Force"`, { stdio: 'pipe' });
    fs.unlinkSync(tempZip);

    const docXmlPath = path.join(tempDir, 'word', 'document.xml');
    if (!fs.existsSync(docXmlPath)) throw new Error('document.xml not found in docx');

    const xmlContent = fs.readFileSync(docXmlPath, 'utf-8');

    // Step 2: 双遍解析 body 元素（<w:p> + <w:tbl> + <w:sdt>）
    const bodyElements = parseBodyElements(xmlContent);

    // Step 3: 提取章节
    const sections = extractSections(bodyElements);

    // Step 4: 格式化输出
    const output = formatOutput(inputPath, sections);
    const outDir = path.dirname(path.resolve(outputPath));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, output, 'utf-8');

    // Step 5: 打印摘要
    const chapterCount = sections.filter(s => s.type === 'chapter').length;
    console.log(`总章节数: ${chapterCount}`);
    sections.forEach(s => {
      const labels = [];
      if (s.is_implicit) labels.push('[隐式]');
      if (s.is_attachment) labels.push('[附件]');
      console.log(`  ${s.type} ${s.sec_num.padEnd(8)} ${labels.join(' ')} ${s.clean_title}`);
    });

    return { success: true, chapterCount };

  } finally {
    // 清理临时目录
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { extractOutline };

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (n) => { const i = args.indexOf(n); return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined; };
  const input = getArg('--input');
  const output = getArg('--output');

  if (!input || !output) {
    console.error('用法: node extract-outline.js --input <docx> --output <txt>');
    process.exit(1);
  }

  if (!fs.existsSync(input)) {
    console.error('文件不存在: ' + input);
    process.exit(1);
  }

  const ext = path.extname(input).toLowerCase();
  if (ext !== '.docx') {
    console.error('仅支持 .docx 格式');
    process.exit(1);
  }

  try {
    const result = extractOutline(input, output);
    console.log('\n输出: ' + output);
    if (result.chapterCount) console.log('章节数: ' + result.chapterCount);
  } catch (e) {
    console.error('提取失败: ' + e.message);
    process.exit(1);
  }
}
