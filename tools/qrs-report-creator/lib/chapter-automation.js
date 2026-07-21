const fs = require('fs');
const path = require('path');
const { login } = require('../../../shared/browser-manager');

/**
 * 解析完整大纲.txt 文件
 * @param {string} outlinePath - 完整大纲.txt 的路径
 * @returns {{ toc: Array<{name: string, order: number}>, chapters: Array<{num: string, title: string, lines: string[]}> }}
 */
function parseOutline(outlinePath) {
  const content = fs.readFileSync(outlinePath, 'utf-8');
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''));

  // 定位各板块边界
  let tocStart = -1, tocEnd = -1;
  let outlineStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '[TOC 目录]') { tocStart = i + 2; continue; }
    if (tocStart > 0 && tocEnd < 0 && /^\[/.test(t)) { tocEnd = i - 1; continue; }
    if (/^\[大纲/.test(t)) { outlineStart = i + 2; }
  }

  // 解析 TOC：仅从 [TOC 目录] 板块提取，严格匹配 "N 标题名" 格式
  const toc = [];
  const tocChapterRegex = /^(\d{1,2})\s+(.+)/;
  if (tocStart > 0 && tocEnd > tocStart) {
    for (let i = tocStart; i <= tocEnd; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      const m = l.match(tocChapterRegex);
      if (m) {
        toc.push({ name: m[1] + ' ' + m[2], order: toc.length + 1 });
      }
    }
  }

  // 解析正文：过滤分隔符（--- ChN --- / ====== / ------ / [板块标题]）
  const isSeparator = (s) => /^---\s*Ch\d+\s*---/.test(s) || /^[=\-]{10,}/.test(s);
  const bodyLines = outlineStart > 0 ? lines.slice(outlineStart) : [];
  const chapterRegex = /^(\d{1,2})\s+(.+)/;
  const chapters = [];
  let currentChapter = null;

  for (const raw of bodyLines) {
    const l = raw.trim();
    if (!l || isSeparator(l)) continue;
    const m = l.match(chapterRegex);
    if (m) {
      if (currentChapter) chapters.push(currentChapter);
      currentChapter = { num: m[1], title: l, lines: [l] };
    } else if (currentChapter) {
      currentChapter.lines.push(l);
    }
  }
  if (currentChapter) chapters.push(currentChapter);

  if (chapters.length === 0) {
    toc.forEach(({ name, order }) => {
      chapters.push({ num: String(order), title: name, lines: [name] });
    });
  }

  return { toc, chapters };
}

/**
 * 批量创建章节
 * 
 * 正确流程：
 *   点击「创建」→ 弹框 → 填写名称+顺序 → 「保存并继续创建」（自动再次弹框）
 *   → 填写下一个名称+顺序 → 「保存并继续创建」→ ... → 最后一个「保存」
 * 
 * @param {import('playwright').Page} page
 * @param {Array<{name: string, order: number|string}>} chapters
 */
async function createChapters(page, chapters) {
  const count = chapters.length;

  for (let i = 0; i < count; i++) {
    const { name, order } = chapters[i];
    const isFirst = i === 0;
    const isLast = i === count - 1;

    // 仅第一个章节需要点击「创建」按钮弹框，后续由「保存并继续创建」自动弹出
    if (isFirst) {
      await page.getByRole('button', { name: '创建', exact: true }).click({ force: true });
      await page.waitForTimeout(800);
    }

    await page.getByRole('textbox', { name: '请输入此字段' }).fill(name);
    await page.waitForTimeout(300);

    await page.getByRole('spinbutton', { name: '请输入显示顺序' }).fill(String(order));
    await page.waitForTimeout(300);

    if (isLast) {
      await page.getByRole('button', { name: '保存', exact: true }).click({ force: true });
    } else {
      await page.getByRole('button', { name: '保存并继续创建' }).click({ force: true });
    }
    await page.waitForTimeout(1500);
  }
}

/**
 * 设计单个章节（在 ONLYOFFICE Canvas 编辑器中写入内容）
 * @param {import('playwright').Page} page
 * @param {number} nthIndex - 第几个「设计」按钮（从 0 开始）
 * @param {string[]} lines - 要在 Canvas 中逐行输入的文本
 */
async function designChapter(page, nthIndex, lines) {
  // 定位到目标页码（每页 10 条）
  const targetPage = Math.floor(nthIndex / 10) + 1;
  const localIndex = nthIndex % 10;

  // 先回第一页，再跳到目标页（确保跨页跳转可靠）
  if (targetPage > 1) {
    const page1 = page.locator('.ant-pagination-item-1');
    if (await page1.count() > 0) {
      await page1.click();
      await page.waitForTimeout(1000);
    }
    const pageBtn = page.locator(`.ant-pagination-item-${targetPage}`);
    if (await pageBtn.count() > 0) {
      await pageBtn.click();
      await page.waitForTimeout(1500);
    }
  } else {
    // 已在第 1 页或需要回第 1 页
    const page1 = page.locator('.ant-pagination-item-1');
    if (await page1.count() > 0) {
      await page1.click();
      await page.waitForTimeout(1000);
    }
  }

  // 滚动触发虚拟滚动/懒加载，确保当前页所有行已渲染
  const allRows = page.locator('.ant-table-row');
  const rowCnt = await allRows.count();
  for (let i = Math.max(0, rowCnt - 4); i < rowCnt; i++) {
    await allRows.nth(i).scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(500);

  const designBtns = page.getByRole('button', { name: '设计' });
  await designBtns.nth(localIndex).click();
  await page.waitForTimeout(10000);

  // 在所有 iframe 中定位最大的 Canvas
  let canvasBox = null;
  const frames = page.frames();
  const candidates = [];

  for (let fi = 0; fi < frames.length; fi++) {
    try {
      const box = await frames[fi].evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        if (!canvases.length) return null;
        let largest = null;
        let largestArea = 0;
        canvases.forEach(c => {
          const r = c.getBoundingClientRect();
          const area = r.width * r.height;
          if (area > largestArea) {
            largestArea = area;
            largest = { x: r.x, y: r.y, width: r.width, height: r.height };
          }
        });
        return largest;
      });
      if (box && box.width > 100 && box.height > 100) {
        candidates.push(box);
      }
    } catch (e) {
      // 跨域 iframe 可能无法访问，忽略
    }
  }

  // 取面积最大的 Canvas
  if (candidates.length > 0) {
    candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    canvasBox = candidates[0];
  }

  // Canvas 未找到时等待 2 秒重试一次
  if (!canvasBox) {
    console.log('Canvas 未就绪，等待 2 秒后重试...');
    await page.waitForTimeout(2000);
    for (let fi = 0; fi < frames.length; fi++) {
      try {
        const box = await frames[fi].evaluate(() => {
          const canvases = document.querySelectorAll('canvas');
          if (!canvases.length) return null;
          let largest = null;
          let largestArea = 0;
          canvases.forEach(c => {
            const r = c.getBoundingClientRect();
            const area = r.width * r.height;
            if (area > largestArea) {
              largestArea = area;
              largest = { x: r.x, y: r.y, width: r.width, height: r.height };
            }
          });
          return largest;
        });
        if (box && box.width > 100 && box.height > 100) {
          canvasBox = box;
          break;
        }
      } catch (e) {
        // 忽略
      }
    }
  }

  if (!canvasBox) {
    throw new Error('找不到 ONLYOFFICE Canvas 元素');
  }

  // 点击 Canvas 中心获取焦点
  await page.mouse.click(
    canvasBox.x + canvasBox.width / 2,
    canvasBox.y + canvasBox.height / 2
  );
  await page.waitForTimeout(400);

  // 逐行输入，延迟 100ms/字符（含中文时避免丢字）
  for (let i = 0; i < lines.length; i++) {
    await page.keyboard.type(lines[i], { delay: 60 });
    await page.waitForTimeout(200);
    if (i < lines.length - 1) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }
  }

  // 双击保存：点击 "save 保存" 按钮两次，每次间隔 5s
  for (let s = 0; s < 2; s++) {
    await page.getByRole('button', { name: 'save 保存' }).click();
    await page.waitForTimeout(5000);
  }

  // 「返 回」按钮中间有空格
  await page.getByRole('button', { name: '返 回' }).click();
  await page.waitForTimeout(2000);
}

/**
 * 登录并导航到指定报告页面
 * @param {import('playwright').Page} page
 * @param {string} baseUrl
 * @param {string} username
 * @param {string} password
 * @param {string} reportUrl - 报告详情页 URL
 * @returns {Promise<{success: boolean, url: string}>}
 */
async function loginAndNavigate(page, baseUrl, username, password, reportUrl) {
  const loginResult = await login(page, { baseUrl, username, password });

  if (!loginResult.success) {
    return loginResult;
  }

  await page.goto(reportUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  return { success: true, url: page.url() };
}

module.exports = {
  parseOutline,
  createChapters,
  designChapter,
  loginAndNavigate
};
