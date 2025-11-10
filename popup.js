// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
  initializePopup();
});

async function initializePopup() {
  // 获取当前标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 绑定事件监听器
  bindEventListeners();

  // 加载保存的设置
  await loadSettings();

  // 检查当前页面的Toc状态
  checkTocStatus(tab.id);
}

function bindEventListeners() {
  // 切换Toc
  document.getElementById('toggleToc').addEventListener('click', toggleToc);

  // 打开设置页面
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 帮助按钮
  document.getElementById('helpButton').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://github.com/your-repo/smart-toc/blob/main/README.md'
    });
  });

  // 设置项变更
  document.getElementById('autoDetect').addEventListener('change', saveSettings);
  document.getElementById('highlightCurrent').addEventListener('change', saveSettings);
  document.getElementById('autoDarkMode').addEventListener('change', saveSettings);
  document.getElementById('maxHeadingLevel').addEventListener('change', saveSettings);
}

async function toggleToc() {
  const button = document.getElementById('toggleToc');
  button.disabled = true;
  button.classList.add('loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 向content script发送消息切换Toc
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleToc' });

    // 关闭弹窗
    window.close();
  } catch (error) {
    console.error('Toggle Toc failed:', error);
    alert('切换失败，请刷新页面后重试');
  } finally {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      autoDetect: true,
      highlightCurrent: true,
      autoDarkMode: true,
      maxHeadingLevel: 6
    });

    // 更新UI
    document.getElementById('autoDetect').checked = settings.autoDetect;
    document.getElementById('highlightCurrent').checked = settings.highlightCurrent;
    document.getElementById('autoDarkMode').checked = settings.autoDarkMode;
    document.getElementById('maxHeadingLevel').value = settings.maxHeadingLevel;
  } catch (error) {
    console.error('Load settings failed:', error);
  }
}

async function saveSettings() {
  const settings = {
    autoDetect: document.getElementById('autoDetect').checked,
    highlightCurrent: document.getElementById('highlightCurrent').checked,
    autoDarkMode: document.getElementById('autoDarkMode').checked,
    maxHeadingLevel: parseInt(document.getElementById('maxHeadingLevel').value, 10)
  };

  try {
    await chrome.storage.sync.set(settings);
  } catch (error) {
    console.error('Save settings failed:', error);
  }
}

async function checkTocStatus(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
    if (response && response.isActive) {
      const button = document.getElementById('toggleToc');
      button.querySelector('.text').textContent = 'Hide Table of Contents';
    }
  } catch (error) {
    // Content script可能未加载，忽略错误
  }
}
