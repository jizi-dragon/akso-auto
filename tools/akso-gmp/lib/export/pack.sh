#!/bin/bash
# ============================================================
# AksoGMP Skill 一键打包脚本
# 用法：bash pack.sh
# 产物：Desktop/akso-gmp-bundle-YYYYMMDD-HHMMSS.tar.gz
# ============================================================
set -e

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUNDLE_NAME="akso-gmp-bundle-${TIMESTAMP}"
DESKTOP="${HOME}/Desktop"
[ -d "$DESKTOP" ] || DESKTOP="${HOME}/桌面"
[ -d "$DESKTOP" ] || DESKTOP="/tmp"

SKILLS_DIR="${HOME}/.workbuddy/skills"
MCP_CONFIG="${HOME}/.workbuddy/mcp.json"
LEARNINGS_DIR="d:/akso/akso_claw/.learnings"

TMPDIR=$(mktemp -d)
echo "📦 打包 AksoGMP 配置 Agent 完整能力包..."

# 1. 复制核心 Skill
echo "  ├─ 核心 Skill: akso-gmp"
mkdir -p "$TMPDIR/bundle/skills"
cp -r "$SKILLS_DIR/akso-gmp" "$TMPDIR/bundle/skills/" 2>/dev/null

# 2. 复制浏览器自动化 Skill
echo "  ├─ 执行层: playwright-browser-automation"
if [ -d "$SKILLS_DIR/playwright-browser-automation" ]; then
    cp -r "$SKILLS_DIR/playwright-browser-automation" "$TMPDIR/bundle/skills/" 2>/dev/null
fi

# 3. 复制自我改进 Skill
echo "  ├─ 学习层: self-improving-agent"
if [ -d "$SKILLS_DIR/self-improving-agent" ]; then
    cp -r "$SKILLS_DIR/self-improving-agent" "$TMPDIR/bundle/skills/" 2>/dev/null
fi

# 4. 复制 MCP 配置
echo "  ├─ MCP 配置: mcp.json"
mkdir -p "$TMPDIR/bundle/config"
if [ -f "$MCP_CONFIG" ]; then
    cp "$MCP_CONFIG" "$TMPDIR/bundle/config/"
else
    echo '{"mcpServers":{"playwright":{"command":"npx","args":["@playwright/mcp@latest"]}}}' > "$TMPDIR/bundle/config/mcp.json"
fi

# 5. 复制已学学习记录
echo "  ├─ 学习记录: .learnings/"
if [ -d "$LEARNINGS_DIR" ] 2>/dev/null; then
    cp -r "$LEARNINGS_DIR" "$TMPDIR/bundle/" 2>/dev/null
fi

# 6. 生成迁移说明
echo "  └─ 生成迁移说明 DEPLOY.md"
cat > "$TMPDIR/bundle/DEPLOY.md" << 'DEPLOYEOF'
# AksoGMP 配置 Agent 迁移包

## 包含内容

| 组件 | 路径 | 职责 |
|------|------|------|
| akso-gmp | skills/akso-gmp/ | GMP 低代码配置大脑（对象建模、生命周期、工作流） |
| playwright-browser-automation | skills/playwright-browser-automation/ | Playwright 直接 API 浏览器自动化 |
| self-improving-agent | skills/self-improving-agent/ | 持续学习和错误捕获 |
| mcp.json | config/mcp.json | Playwright MCP 服务器配置 |
| .learnings | .learnings/ | 已积累的配置经验 |

## 部署步骤

### Step 1: 解压到 Skills 目录
```bash
tar -xzf akso-gmp-bundle-*.tar.gz -C ~/
cp -r bundle/skills/* ~/.workbuddy/skills/
```

### Step 2: 合并 MCP 配置
```bash
# 将 config/mcp.json 的内容合并到 ~/.workbuddy/mcp.json
```

### Step 3: 复制学习记录
```bash
cp -r bundle/.learnings/ <你的项目根目录>/
```

### Step 4: 安装浏览器工具
```bash
npm install -g playwright @playwright/mcp
npx playwright install chromium
```

### Step 5: 激活 MCP Server
在 WorkBuddy UI 的「连接器」中找到 Playwright，点击 Trust 激活。

### Step 6: 验证
在新对话中说："我教你 GMP 配置" → AI 加载 akso-gmp Skill → 进入学习模式。

## 版本信息
- Skill 版本：3.0.0
- 打包日期：$(date +%Y-%m-%d)
- Playbooks 数量：$(ls bundle/skills/akso-gmp/playbooks/*.md 2>/dev/null | wc -l)

DEPLOYEOF

# 7. 打包
OUTPUT="$DESKTOP/${BUNDLE_NAME}.tar.gz"
cd "$TMPDIR"
tar -czf "$OUTPUT" bundle/
rm -rf "$TMPDIR"

echo ""
echo "✅ 打包完成！"
echo "📁 产物位置: $OUTPUT"
echo "📦 包大小: $(ls -lh "$OUTPUT" | awk '{print $5}')"
echo ""
echo "迁移到新平台："
echo "  1. 将 $OUTPUT 复制到目标电脑"
echo "  2. 解压并查看 bundle/DEPLOY.md 的部署步骤"
echo "  3. 5 分钟内完成迁移"
