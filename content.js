// Smart TOC Content Script
// 在页面中注入目录生成和管理功能

(function() {
  'use strict';

  // 全局状态
  let tocPanel = null;
  let tocTree = null;
  let isActive = false;
  let settings = {};
  let observer = null;
  let currentVisibleHeading = null;

  // 性能优化：缓存DOM查询结果
  const domCache = new Map();

  // 初始化
  initialize();

  async function initialize() {
    // 加载设置
    settings = await StorageManager.getSettings();

    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener(handleMessage);

    // 检查是否应该禁用当前站点
    const hostname = window.location.hostname;
    const disabled = await StorageManager.isDisabledForHost(hostname);

    if (disabled) {
      console.log('Smart TOC is disabled for this site');
      return;
    }

    console.log('Smart TOC initialized');
  }

  // 处理来自popup或其他脚本的消息
  async function handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'toggleToc':
        await toggleToc();
        sendResponse({ success: true });
        break;

      case 'getStatus':
        sendResponse({ isActive });
        break;

      case 'generateToc':
        await generateAndShowToc();
        sendResponse({ success: true });
        break;

      default:
        break;
    }
  }

  // 切换目录显示
  async function toggleToc() {
    if (isActive) {
      hideToc();
    } else {
      await generateAndShowToc();
    }
  }

  // 生成并显示目录
  async function generateAndShowToc() {
    try {
      // 显示加载状态
      showLoadingState();

      // 重新加载设置
      settings = await StorageManager.getSettings();

      // 生成目录
      const generator = new TocGenerator();
      tocTree = await generator.generate(
        settings.maxHeadingLevel,
        settings.autoDetect
      );

      if (tocTree.length === 0) {
        showNoHeadingsMessage();
        return;
      }

      // 创建并显示面板
      createTocPanel();
      isActive = true;

      // 开始监听滚动
      startScrollListener();

    } catch (error) {
      console.error('Failed to generate TOC:', error);
      showErrorMessage();
    }
  }

  // 显示加载状态
  function showLoadingState() {
    if (tocPanel) {
      tocPanel.remove();
      tocPanel = null;
    }

    tocPanel = createPanelShell('正在生成目录...');
    document.body.appendChild(tocPanel);
  }

  // 显示没有找到标题的消息
  function showNoHeadingsMessage() {
    if (tocPanel) {
      tocPanel.remove();
    }

    tocPanel = createPanelShell('未找到有效标题');
    document.body.appendChild(tocPanel);

    // 3秒后自动关闭
    setTimeout(() => {
      if (tocPanel && !isActive) {
        tocPanel.remove();
        tocPanel = null;
      }
    }, 3000);
  }

  // 显示错误消息
  function showErrorMessage() {
    if (tocPanel) {
      tocPanel.remove();
    }

    tocPanel = createPanelShell('生成目录时出错');
    tocPanel.querySelector('.toc-content').innerHTML = '<div class="error-message">请刷新页面后重试</div>';
    document.body.appendChild(tocPanel);
  }

  // 创建面板外壳
  function createPanelShell(message = '') {
    const panel = document.createElement('div');
    panel.id = 'smart-toc-panel';
    panel.className = 'smart-toc-panel';

    panel.innerHTML = `
      <div class="smart-toc-header">
        <h3>目录</h3>
        <div class="smart-toc-controls">
          <button class="btn-collapse" title="折叠/展开">▾</button>
          <button class="btn-copy" title="复制目录">📋</button>
          <button class="btn-settings" title="设置">⚙️</button>
          <button class="btn-close" title="关闭">×</button>
        </div>
      </div>
      <div class="smart-toc-content">
        ${message ? `<div class="loading-message">${message}</div>` : ''}
      </div>
      <div class="smart-toc-resize-handle"></div>
    `;

    return panel;
  }

  // 创建完整的TOC面板
  function createTocPanel() {
    if (tocPanel) {
      tocPanel.remove();
    }

    tocPanel = createPanelShell();
    const content = tocPanel.querySelector('.smart-toc-content');

    // 生成目录HTML
    const tocHtml = renderTocTree(tocTree);
    content.innerHTML = tocHtml;

    // 绑定事件
    bindPanelEvents();

    // 添加到页面
    document.body.appendChild(tocPanel);

    // 应用保存的位置
    applySavedPosition();

    // 初始化可见标题高亮
    updateCurrentHeading();
  }

  // 渲染目录树
  function renderTocTree(tree, level = 0) {
    let html = '<ul class="toc-list">';

    tree.forEach(node => {
      const isActiveNode = currentVisibleHeading && currentVisibleHeading.index === node.index;
      html += `<li class="toc-item level-${node.level} ${isActiveNode ? 'active' : ''}">`;
      html += `<a href="#" class="toc-link" data-index="${node.index}">${escapeHtml(node.text)}</a>`;

      if (node.children && node.children.length > 0) {
        const shouldCollapse = node.level > settings.expandedLevels;
        html += `<div class="toc-children ${shouldCollapse ? 'collapsed' : ''}">`;
        html += renderTocTree(node.children, node.level);
        html += `</div>`;
      }

      html += '</li>';
    });

    html += '</ul>';
    return html;
  }

  // 转义HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 绑定面板事件
  function bindPanelEvents() {
    // 点击标题跳转
    tocPanel.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(e.target.dataset.index, 10);
        scrollToIndex(index);
      });

      // Alt键悬停预览
      link.addEventListener('mouseenter', (e) => {
        if (e.altKey) {
          const index = parseInt(e.target.dataset.index, 10);
          previewHeading(index);
        }
      });
    });

    // 折叠/展开
    const btnCollapse = tocPanel.querySelector('.btn-collapse');
    btnCollapse.addEventListener('click', toggleCollapse);

    // 复制目录
    const btnCopy = tocPanel.querySelector('.btn-copy');
    btnCopy.addEventListener('click', copyToc);

    // 关闭面板
    const btnClose = tocPanel.querySelector('.btn-close');
    btnClose.addEventListener('click', hideToc);

    // 设置按钮
    const btnSettings = tocPanel.querySelector('.btn-settings');
    btnSettings.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptionsPage' });
    });

    // 启用拖拽
    enableDragging();

    // 启用调整大小
    enableResizing();

    // 启用键盘导航
    enableKeyboardNavigation();
  }

  // 滚动到指定索引的标题
  function scrollToIndex(index) {
    const generator = new TocGenerator();
    const node = findNodeByIndex(tocTree, index);
    if (node) {
      generator.scrollToHeading(node);
    }
  }

  // 根据索引查找节点
  function findNodeByIndex(tree, index) {
    for (const node of tree) {
      if (node.index === index) {
        return node;
      }
      if (node.children) {
        const found = findNodeByIndex(node.children, index);
        if (found) return found;
      }
    }
    return null;
  }

  // 切换折叠状态
  function toggleCollapse() {
    const items = tocPanel.querySelectorAll('.toc-children');
    const isCollapsed = items.length > 0 && items[0].classList.contains('collapsed');

    items.forEach(item => {
      if (isCollapsed) {
        item.classList.remove('collapsed');
      } else {
        item.classList.add('collapsed');
      }
    });
  }

  // 复制目录
  async function copyToc() {
    if (!tocTree) return;

    const generator = new TocGenerator();
    const text = generator.generatePlainText(tocTree);

    try {
      await navigator.clipboard.writeText(text);

      // 显示复制成功提示
      const btnCopy = tocPanel.querySelector('.btn-copy');
      const originalTitle = btnCopy.title;
      btnCopy.title = '已复制!';
      setTimeout(() => {
        btnCopy.title = originalTitle;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('复制失败，请手动选择复制');
    }
  }

  // 启用拖拽功能
  function enableDragging() {
    const header = tocPanel.querySelector('.smart-toc-header');
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      // 检查是否点击的是按钮
      if (e.target.tagName === 'BUTTON') return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = tocPanel.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      tocPanel.classList.add('dragging');

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      tocPanel.style.left = `${initialX + deltaX}px`;
      tocPanel.style.top = `${initialY + deltaY}px`;
      tocPanel.style.right = 'auto';
      tocPanel.style.bottom = 'auto';
    }

    function onMouseUp() {
      if (isDragging) {
        isDragging = false;
        tocPanel.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // 保存位置
        savePanelPosition();
      }
    }
  }

  // 启用调整大小功能
  function enableResizing() {
    const resizeHandle = tocPanel.querySelector('.smart-toc-resize-handle');
    let isResizing = false;
    let startX, startY, initialWidth, initialHeight;

    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = tocPanel.getBoundingClientRect();
      initialWidth = rect.width;
      initialHeight = rect.height;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      if (!isResizing) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newWidth = Math.max(200, Math.min(600, initialWidth + deltaX));
      const newHeight = Math.max(300, Math.min(800, initialHeight + deltaY));

      tocPanel.style.width = `${newWidth}px`;
      tocPanel.style.maxHeight = `${newHeight}px`;
    }

    function onMouseUp() {
      if (isResizing) {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // 保存尺寸
        const rect = tocPanel.getBoundingClientRect();
        settings.panelWidth = rect.width;
        StorageManager.saveSettings(settings);
      }
    }
  }

  // 应用保存的位置
  function applySavedPosition() {
    const position = settings.panelPosition || 'floating';

    if (position === 'left') {
      tocPanel.style.left = '20px';
      tocPanel.style.top = '100px';
      tocPanel.style.right = 'auto';
    } else if (position === 'right') {
      tocPanel.style.right = '20px';
      tocPanel.style.top = '100px';
      tocPanel.style.left = 'auto';
    } else {
      // floating
      tocPanel.style.left = '50%';
      tocPanel.style.top = '100px';
      tocPanel.style.transform = 'translateX(-50%)';
      tocPanel.style.right = 'auto';
    }

    if (settings.panelWidth) {
      tocPanel.style.width = `${settings.panelWidth}px`;
    }
  }

  // 保存面板位置
  async function savePanelPosition() {
    const rect = tocPanel.getBoundingClientRect();
    const newSettings = {
      panelPosition: 'floating',
      panelWidth: rect.width,
      panelLeft: rect.left,
      panelTop: rect.top
    };

    await StorageManager.saveSettings({ ...settings, ...newSettings });
  }

  // 开始滚动监听
  function startScrollListener() {
    if (observer) {
      observer.disconnect();
    }

    if (settings.highlightCurrent) {
      // 使用 IntersectionObserver 监听标题
      const headingElements = tocTree.map(node => node.element);

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const heading = headingElements.find(el => el === entry.target);
              if (heading) {
                const index = tocTree.findIndex(node => node.element === heading);
                if (index !== -1) {
                  requestAnimationFrame(() => {
                    updateCurrentHeading(tocTree[index]);
                  });
                }
              }
            }
          });
        },
        {
          rootMargin: '-100px 0px -80% 0px',
          threshold: 0
        }
      );

      headingElements.forEach(el => {
        observer.observe(el);
      });
    }

    // 使用 requestAnimationFrame 节流的滚动事件
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // 滚动事件处理（优化版）
  function onScroll() {
    if (!settings.highlightCurrent) return;

    if (observer) {
      // IntersectionObserver 正在处理，不需要额外处理
      return;
    }

    // 备用方案：使用滚动位置
    requestAnimationFrame(() => {
      updateCurrentHeading();
    });
  }

  // 更新当前可见标题（优化版）
  function updateCurrentHeading(heading = null) {
    if (!settings.highlightCurrent || !tocPanel) return;

    // 如果没有指定heading，计算当前可见的
    if (!heading) {
      const generator = new TocGenerator();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      heading = generator.getCurrentVisibleHeading(tocTree, scrollTop);
    }

    if (!heading) return;

    // 避免重复更新同一个标题
    if (currentVisibleHeading && currentVisibleHeading.index === heading.index) {
      return;
    }

    // 移除之前的active状态
    if (currentVisibleHeading) {
      const prevElement = tocPanel.querySelector(`[data-index="${currentVisibleHeading.index}"]`);
      if (prevElement) {
        const prevItem = prevElement.parentElement;
        prevItem.classList.remove('active');
      }
    }

    // 添加新的active状态
    const currentElement = tocPanel.querySelector(`[data-index="${heading.index}"]`);
    if (currentElement) {
      const currentItem = currentElement.parentElement;
      currentItem.classList.add('active');

      // 更新当前标题
      currentVisibleHeading = heading;

      // 自动滚动到视图中（如果需要）
      ensureElementInView(currentElement);
    }
  }

  // 确保元素在可视区域内
  function ensureElementInView(element) {
    const panelRect = tocPanel.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const contentElement = tocPanel.querySelector('.smart-toc-content');

    if (elementRect.top < panelRect.top + 60) {
      // 元素在面板上方
      contentElement.scrollTop -= (panelRect.top + 60 - elementRect.top);
    } else if (elementRect.bottom > panelRect.bottom - 20) {
      // 元素在面板下方
      contentElement.scrollTop += (elementRect.bottom - panelRect.bottom + 20);
    }
  }

  // 隐藏目录
  function hideToc() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    window.removeEventListener('scroll', onScroll);

    if (tocPanel) {
      tocPanel.remove();
      tocPanel = null;
    }

    isActive = false;
    currentVisibleHeading = null;
  }

  // Alt键悬停预览
  function previewHeading(index) {
    const node = findNodeByIndex(tocTree, index);
    if (node) {
      const generator = new TocGenerator();

      // 保存当前滚动位置
      const currentScroll = window.scrollY;

      // 临时滚动到预览位置
      generator.scrollToHeading(node);

      // 3秒后恢复到原位置
      setTimeout(() => {
        window.scrollTo({
          top: currentScroll,
          behavior: 'auto'
        });
      }, 3000);
    }
  }

  // 启用键盘导航
  function enableKeyboardNavigation() {
    // 使面板可聚焦
    tocPanel.setAttribute('tabindex', '0');
    tocPanel.addEventListener('keydown', handleKeyboardNavigation);
  }

  // 处理键盘导航
  function handleKeyboardNavigation(e) {
    const links = Array.from(tocPanel.querySelectorAll('.toc-link'));
    const currentIndex = links.indexOf(document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < links.length - 1) {
          links[currentIndex + 1].focus();
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          links[currentIndex - 1].focus();
        }
        break;

      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          e.preventDefault();
          const index = parseInt(links[currentIndex].dataset.index, 10);
          scrollToIndex(index);
        }
        break;

      case 'Escape':
        e.preventDefault();
        hideToc();
        break;

      case 'Home':
        e.preventDefault();
        if (links.length > 0) {
          links[0].focus();
        }
        break;

      case 'End':
        e.preventDefault();
        if (links.length > 0) {
          links[links.length - 1].focus();
        }
        break;

      default:
        // 数字键快速跳转
        if (e.key >= '1' && e.key <= '9') {
          const level = parseInt(e.key, 10);
          const levelLinks = links.filter(link => {
            const item = link.parentElement;
            return item.classList.contains(`level-${level}`);
          });
          if (levelLinks.length > 0) {
            e.preventDefault();
            levelLinks[0].focus();
          }
        }
        break;
    }
  }

  // 清理资源
  function cleanup() {
    hideToc();

    // 清理消息监听器
    chrome.runtime.onMessage.removeListener(handleMessage);

    // 清理键盘导航
    if (tocPanel) {
      tocPanel.removeEventListener('keydown', handleKeyboardNavigation);
    }

    console.log('Smart TOC cleaned up');
  }

  // 页面卸载时清理
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);

})();
