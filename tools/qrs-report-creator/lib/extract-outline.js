/**
 * 纯 Node.js .docx 大纲提取器
 * 
 * 替代 extract-outline.py，无需 Python 依赖。
 * 通过 PowerShell 解压 docx → 解析 word/document.xml → 提取章节结构
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHAPTER_STYLES = new Set(['Title', 'Heading1', 'Heading2', '1', '2', '3']);
const ATTACHMENT_KEYWORDS = ['附件', '附表'];
const INDENT = '\u3000\u3000';

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
    
    // Step 2: 解析段落
    const paragraphs = parseParagraphs(xmlContent);
    
    // Step 3: 提取章节
    const sections = extractSections(paragraphs);
    
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

function parseParagraphs(xml) {
  const paragraphs = [];
  // 匹配所有 w:p 段落
  const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
  let match;
  while ((match = pRegex.exec(xml)) !== null) {
    const pXml = match[0];
    
    // 提取样式名
    let style = '';
    const styleMatch = pXml.match(/<w:pStyle[^>]*w:val="([^"]*)"/);
    if (styleMatch) style = styleMatch[1];
    
    // 提取段落文本
    const texts = [];
    const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let tMatch;
    while ((tMatch = tRegex.exec(pXml)) !== null) {
      texts.push(tMatch[1]);
    }
    const text = texts.join('').trim();
    if (!text) continue;
    
    // 提取缩进
    let leftIndent = null;
    const indentMatch = pXml.match(/<w:ind[^>]*w:left="(\d+)"/);
    if (indentMatch) leftIndent = parseInt(indentMatch[1]);
    
    paragraphs.push({ text, style, leftIndent });
  }
  return paragraphs;
}

function getSectionNum(title) {
  const m = title.match(/^(\d+(?:\.\d+)*)/);
  return m ? m[1] : null;
}

function cleanTitle(title) {
  return title.replace(/^[\d.]+\s*/, '');
}

function looksLikeImplicitHeading(text, leftIndent, nextParagraphs) {
  if (text.length > 25) return false;
  if (leftIndent === 360045) return false;
  const bodyKw = ['备注', 'USL', 'LSL', '结论', '警戒限度', '行动限度', '小结', '从趋势图', '根据', '基于', '结合', '由于'];
  if (bodyKw.some(kw => text.startsWith(kw))) return false;
  // 后一段是正文
  const next = nextParagraphs[0];
  return next && next.leftIndent === 360045 && next.text.length > 20;
}

function extractSections(paragraphs) {
  const sections = [];
  let currentSection = null;
  let parentChapter = null;
  let implicitCounter = 0;
  let insideAttachment = false;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.text;
    const style = p.style;
    const leftIndent = p.leftIndent;
    
    // 跳过目录
    if (style.startsWith('toc')) continue;
    // 跳过短路径
    if (text.includes('//') && text.length < 20) continue;
    // 跳过文档开头公司名
    if (text.includes('有限公司') && sections.length === 0) continue;
    
    // 图片标题
    if ((text.includes('分布图') || text.includes('取样点分布')) && text.length < 30) {
      if (currentSection) {
        currentSection.media_placeholders = currentSection.media_placeholders || [];
        currentSection.media_placeholders.push({ type: 'image', text });
      }
      continue;
    }
    
    if (insideAttachment && !(style === 'Title' && getSectionNum(text))) continue;
    
    // Title / Heading 样式
    if ((CHAPTER_STYLES.has(style) || style === 'Title')) {
      const secNum = getSectionNum(text);
      if (!secNum) continue;
      
      const isAttachment = ATTACHMENT_KEYWORDS.some(kw => text.includes(kw));
      
      if (secNum.includes('.')) {
        sections.push({
          type: 'sub', title: text, sec_num: secNum,
          clean_title: cleanTitle(text),
          content: [], media_placeholders: [],
          is_attachment: isAttachment
        });
        currentSection = sections[sections.length - 1];
        if (isAttachment) insideAttachment = true;
        continue;
      }
      
      sections.push({
        type: 'chapter', title: text, sec_num: secNum,
        clean_title: cleanTitle(text),
        content: [], media_placeholders: [],
        is_attachment: isAttachment
      });
      currentSection = sections[sections.length - 1];
      parentChapter = currentSection;
      implicitCounter = 0;
      insideAttachment = isAttachment;
      continue;
    }
    
    // 显式编号的 Normal 段落
    const secNum = getSectionNum(text);
    if (secNum && secNum.includes('.')) {
      sections.push({
        type: 'sub', title: text, sec_num: secNum,
        clean_title: cleanTitle(text),
        content: [], media_placeholders: []
      });
      currentSection = sections[sections.length - 1];
      continue;
    }
    
    // 隐式标题检测
    if (looksLikeImplicitHeading(text, leftIndent, paragraphs.slice(i + 1, i + 5))) {
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
  for (const sec of sections) {
    if (sec.type === 'chapter') {
      lines.push(sec.sec_num + ' ' + sec.clean_title);
    }
  }
  lines.push('');
  
  // [完整子标题结构]
  lines.push('[完整子标题结构]');
  lines.push('-'.repeat(40));
  for (const sec of sections) {
    const depth = sec.sec_num.split('.').length - 1;
    const prefix = '  '.repeat(depth);
    lines.push(prefix + sec.sec_num + ' ' + sec.clean_title);
  }
  lines.push('');
  
  // [大纲 + 文字段落]
  lines.push('[大纲 + 文字段落]');
  lines.push('-'.repeat(40));
  for (const sec of sections) {
    if (sec.type === 'chapter') {
      lines.push('--- Ch' + sec.sec_num + ' ---');
    }
    
    if (sec.is_attachment) {
      lines.push(sec.sec_num + ' ' + sec.clean_title);
      if (sec.media_placeholders && sec.media_placeholders.length > 0) {
        for (const mp of sec.media_placeholders) {
          lines.push('[图片：' + mp.text + ']');
        }
      }
      if (!sec.media_placeholders || sec.media_placeholders.length === 0) {
        lines.push(INDENT + '[以下为附件数据表格，不含文字段落]');
      }
      lines.push('');
      continue;
    }
    
    lines.push(sec.sec_num + ' ' + sec.clean_title);
    
    if (sec.media_placeholders) {
      for (const mp of sec.media_placeholders) {
        lines.push('[图片：' + mp.text + ']');
      }
    }
    
    if (sec.content) {
      for (const ctext of sec.content) {
        lines.push(INDENT + ctext);
      }
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
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
