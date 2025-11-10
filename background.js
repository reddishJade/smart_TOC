// Smart TOC Service Worker (Manifest V3)
// 处理扩展的全局事件和后台任务

// 扩展安装和更新
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Smart TOC installed/updated:', details.reason);

  // 初始化默认设置
  initializeDefaultSettings();

  // 根据安装原因执行不同操作
  if (details.reason === 'install') {
    // 首次安装
    showWelcomePage();
  } else if (details.reason === 'update') {
    // 更新扩展
    handleUpdate(details.previousVersion);
  }
});

// 初始化默认设置
async function initializeDefaultSettings() {
  const defaultSettings = {
    autoDetect: true,
    highlightCurrent: true,
    autoDarkMode: true,
    maxHeadingLevel: 6,
    panelPosition: 'floating',
    panelWidth: 280,
    expandedLevels: 6,
    firstRun: true
  };

  try {
    const result = await chrome.storage.sync.get(['firstRun']);
    if (!result.firstRun) {
      return;
    }

    await chrome.storage.sync.set(defaultSettings);
    console.log('Default settings initialized');
  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
}

// 显示欢迎页面
async function showWelcomePage() {
  try {
    // 打开设置页面作为欢迎页
    await chrome.tabs.create({
      url: chrome.runtime.getURL('options.html?welcome=true')
    });
  } catch (error) {
    console.error('Failed to open welcome page:', error);
  }
}

// 处理更新
async function handleUpdate(previousVersion) {
  console.log(`Updated from version ${previousVersion}`);

  // 检查是否需要迁移数据
  try {
    const currentVersion = chrome.runtime.getManifest().version;

    // 记录更新日志
    console.log(`Smart TOC updated from ${previousVersion} to ${currentVersion}`);

  } catch (error) {
    console.error('Failed to handle update:', error);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);

  if (command === 'toggle-toc') {
    try {
      // 获取当前活动标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        console.error('No active tab found');
        return;
      }

      // 向content script发送切换命令
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleToc' });

    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }
});

// 监听来自content script的请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    sendResponse({
      url: sender.tab?.url,
      title: sender.tab?.title
    });
  } else if (request.action === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('Settings changed in sync storage:', changes);

    // 可以在这里处理设置同步的逻辑
    if (changes.firstRun && !changes.firstRun.newValue) {
      // 首次运行完成
      console.log('First run completed');
    }
  }
});

// 监听扩展图标点击（在没有popup时）
chrome.action.onClicked.addListener(async (tab) => {
  // 如果有popup.html，这通常不会被触发
  // 但如果没有popup，我们可以在这里处理
  console.log('Extension icon clicked without popup');
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 当页面完全加载时，可以做一些清理或初始化工作
  if (changeInfo.status === 'complete') {
    // 检查是否是有效的网页
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      // 可以在这里注入一些初始化代码
      // 注意：在Manifest V3中，通常通过content_scripts处理
    }
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener((activeInfo) => {
  // 当用户切换标签页时，可以清理前一个标签页的状态
  console.log('Tab activated:', activeInfo.tabId);
});

// 处理来自DevTools的消息
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    // 处理来自其他扩展或应用的消息
    if (sender.id) {
      console.log('External message received:', request, 'from', sender.id);
    }
  }
);

// 清理过期数据（定期维护任务）
async function cleanupExpiredData() {
  try {
    // 清理本地存储中的过期数据
    const result = await chrome.storage.local.get(null);
    const now = Date.now();

    // 清理超过7天的临时数据
    for (const [key, value] of Object.entries(result)) {
      if (value && value.expiresAt && value.expiresAt < now) {
        await chrome.storage.local.remove(key);
        console.log('Cleaned up expired data:', key);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
  }
}

// 设置定期清理（每天执行一次）
setInterval(cleanupExpiredData, 24 * 60 * 60 * 1000);

// 处理错误
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// 处理Promise拒绝
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('Smart TOC Service Worker loaded');
