// 智能目录生成算法

class TocGenerator {
  constructor() {
    this.headings = [];
    this.maxHeadingLevel = 6;
    this.autoDetect = true;
  }

  // 生成目录结构
  async generate(maxHeadingLevel = 6, autoDetect = true) {
    this.maxHeadingLevel = maxHeadingLevel;
    this.autoDetect = autoDetect;

    try {
      // 获取主内容区域
      const mainContent = this.getMainContent();
      if (!mainContent) {
        console.warn('No main content found');
        return [];
      }

      // 提取标题
      this.extractHeadings(mainContent);

      // 构建树状结构
      const tocTree = this.buildTocTree();

      return tocTree;
    } catch (error) {
      console.error('Failed to generate TOC:', error);
      return [];
    }
  }

  // 智能检测主内容区域
  getMainContent() {
    // 常见的内容区域选择器优先级
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.post-body',
      '.article-body'
    ];

    // 尝试从最具体的开始
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && this.hasSubstantialContent(element)) {
        return element;
      }
    }

    // 如果没有找到特定的内容区域，使用body
    return document.body;
  }

  // 检查元素是否包含足够的内容
  hasSubstantialContent(element) {
    const text = element.textContent || '';
    const wordCount = text.trim().split(/\s+/).length;
    return wordCount > 200; // 至少200个单词
  }

  // 提取所有标题
  extractHeadings(rootElement) {
    this.headings = [];

    // 获取用户设置的最大级别
    for (let level = 1; level <= this.maxHeadingLevel; level++) {
      const headings = rootElement.querySelectorAll(`h${level}`);

      headings.forEach((heading, index) => {
        // 过滤掉导航栏、页脚等区域的标题
        if (this.isInIgnoredSection(heading)) {
          return;
        }

        // 过滤掉过短或无意义的标题
        const text = heading.textContent.trim();
        if (text.length < 2) {
          return;
        }

        // 获取标题在页面中的位置
        const rect = heading.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return; // 隐藏元素
        }

        this.headings.push({
          level,
          text,
          element: heading,
          index: this.headings.length,
          top: rect.top + window.scrollY
        });
      });
    }

    // 按位置排序
    this.headings.sort((a, b) => a.top - b.top);
  }

  // 检查标题是否在忽略的区域（导航、页脚等）
  isInIgnoredSection(element) {
    const ignoredSelectors = [
      'nav',
      'header',
      'footer',
      'aside',
      '.sidebar',
      '.navigation',
      '.nav-menu',
      '.breadcrumb',
      'nav[role="navigation"]'
    ];

    let parent = element.parentElement;
    while (parent) {
      for (const selector of ignoredSelectors) {
        if (parent.matches(selector)) {
          return true;
        }
      }
      parent = parent.parentElement;
    }

    return false;
  }

  // 构建层级树状结构
  buildTocTree() {
    if (this.headings.length === 0) {
      return [];
    }

    const tree = [];
    const stack = [];

    this.headings.forEach((heading, index) => {
      const node = {
        level: heading.level,
        text: heading.text,
        element: heading.element,
        index: heading.index,
        top: heading.top,
        children: []
      };

      // 找到正确的父级
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // 顶级标题
        tree.push(node);
      } else {
        // 作为子级添加到父级
        stack[stack.length - 1].children.push(node);
      }

      stack.push(node);
    });

    return tree;
  }

  // 获取当前可见的标题
  getCurrentVisibleHeading(tree, scrollTop) {
    let current = null;

    const checkNode = (node) => {
      if (node.top <= scrollTop + 100) { // 100px的缓冲
        current = node;
        node.children.forEach(checkNode);
      }
    };

    tree.forEach(checkNode);
    return current;
  }

  // 平滑滚动到指定标题
  scrollToHeading(heading) {
    if (!heading || !heading.element) {
      return;
    }

    const element = heading.element;
    const elementTop = heading.top;

    window.scrollTo({
      top: elementTop - 20, // 20px的偏移量
      behavior: 'smooth'
    });
  }

  // 生成纯文本的目录结构
  generatePlainText(tree, indent = 0) {
    let result = '';
    const prefix = '  '.repeat(indent);

    tree.forEach(node => {
      result += `${prefix}${node.level}. ${node.text}\n`;
      if (node.children && node.children.length > 0) {
        result += this.generatePlainText(node.children, indent + 1);
      }
    });

    return result;
  }
}

// 全局变量，暴露TocGenerator
window.TocGenerator = TocGenerator;
