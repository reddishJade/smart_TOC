// Smart TOC Options Page Script

document.addEventListener('DOMContentLoaded', () => {
  initializeOptions();
});

async function initializeOptions() {
  // 检查是否是首次安装
  checkWelcomeMode();

  // 加载设置
  await loadSettings();

  // 绑定事件监听器
  bindEventListeners();

  // 初始化UI
  initializeUI();
}

function checkWelcomeMode() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('welcome') === 'true') {
    const welcomeSection = document.getElementById('welcomeSection');
    if (welcomeSection) {
      welcomeSection.style.display = 'block';
    }
  }
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get({
      autoDetect: true,
      highlightCurrent: true,
      autoDarkMode: true,
      maxHeadingLevel: 6,
      expandedLevels: 3,
      panelPosition: 'floating',
      panelWidth: 280
    });

    // 更新UI
    document.getElementById('autoDetect').checked = settings.autoDetect;
    document.getElementById('highlightCurrent').checked = settings.highlightCurrent;
    document.getElementById('autoDarkMode').checked = settings.autoDarkMode;
    document.getElementById('maxHeadingLevel').value = settings.maxHeadingLevel;
    document.getElementById('expandedLevels').value = settings.expandedLevels;
    document.getElementById('panelPosition').value = settings.panelPosition;
    document.getElementById('panelWidth').value = settings.panelWidth;
    document.getElementById('widthValue').textContent = settings.panelWidth;

  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('加载设置失败', 'error');
  }
}

function bindEventListeners() {
  // 切换开关
  document.getElementById('autoDetect').addEventListener('change', saveSettings);
  document.getElementById('highlightCurrent').addEventListener('change', saveSettings);
  document.getElementById('autoDarkMode').addEventListener('change', saveSettings);

  // 下拉选择
  document.getElementById('maxHeadingLevel').addEventListener('change', saveSettings);
  document.getElementById('expandedLevels').addEventListener('change', saveSettings);
  document.getElementById('panelPosition').addEventListener('change', saveSettings);

  // 滑块
  const panelWidthInput = document.getElementById('panelWidth');
  panelWidthInput.addEventListener('input', (e) => {
    document.getElementById('widthValue').textContent = e.target.value;
  });
  panelWidthInput.addEventListener('change', saveSettings);

  // 站点管理
  document.getElementById('toggleCurrentSite').addEventListener('click', toggleCurrentSite);

  // 导出/导入/重置
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', importSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);

  // 隐藏文件输入
  document.getElementById('importFileInput').addEventListener('change', handleImportFile);

  // 帮助和反馈链接
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-repo/smart-toc/blob/main/README.md'
    });
  });

  document.getElementById('feedbackLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/your-repo/smart-toc/issues'
    });
  });
}

function initializeUI() {
  // 根据系统主题初始化深色模式
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
}

async function saveSettings() {
  const settings = {
    autoDetect: document.getElementById('autoDetect').checked,
    highlightCurrent: document.getElementById('highlightCurrent').checked,
    autoDarkMode: document.getElementById('autoDarkMode').checked,
    maxHeadingLevel: parseInt(document.getElementById('maxHeadingLevel').value, 10),
    expandedLevels: parseInt(document.getElementById('expandedLevels').value, 10),
    panelPosition: document.getElementById('panelPosition').value,
    panelWidth: parseInt(document.getElementById('panelWidth').value, 10)
  };

  try {
    await chrome.storage.sync.set(settings);
    showStatus('设置已保存', 'success');

    // 如果首次运行，完成初始化
    const result = await chrome.storage.sync.get(['firstRun']);
    if (result.firstRun) {
      await chrome.storage.sync.set({ firstRun: false });
      const welcomeSection = document.getElementById('welcomeSection');
      if (welcomeSection) {
        setTimeout(() => {
          welcomeSection.style.display = 'none';
        }, 2000);
      }
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('保存设置失败', 'error');
  }
}

async function toggleCurrentSite() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const hostname = new URL(tab.url).hostname;

    const storageManager = await getStorageManager();
    const isDisabled = await storageManager.isDisabledForHost(hostname);

    if (isDisabled) {
      await storageManager.toggleDisabledForHost(hostname);
      document.getElementById('toggleCurrentSite').textContent = `在此站点禁用 Smart TOC`;
      showStatus(`已在 ${hostname} 启用 Smart TOC`, 'success');
    } else {
      await storageManager.toggleDisabledForHost(hostname);
      document.getElementById('toggleCurrentSite').textContent = `在此站点启用 Smart TOC`;
      showStatus(`已在 ${hostname} 禁用 Smart TOC`, 'success');
    }
  } catch (error) {
    console.error('Failed to toggle current site:', error);
    showStatus('操作失败', 'error');
  }
}

async function exportSettings() {
  try {
    const settings = await chrome.storage.sync.get(null);
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `smart-toc-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    showStatus('设置已导出', 'success');
  } catch (error) {
    console.error('Failed to export settings:', error);
    showStatus('导出设置失败', 'error');
  }
}

function importSettings() {
  document.getElementById('importFileInput').click();
}

async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    // 验证设置格式
    if (typeof settings !== 'object') {
      throw new Error('Invalid settings format');
    }

    // 保存设置
    await chrome.storage.sync.set(settings);

    // 重新加载页面显示新设置
    await loadSettings();
    showStatus('设置已导入', 'success');
  } catch (error) {
    console.error('Failed to import settings:', error);
    showStatus('导入设置失败：文件格式错误', 'error');
  }

  // 清除文件输入
  event.target.value = '';
}

async function resetSettings() {
  if (!confirm('确定要重置所有设置吗？此操作不可撤销。')) {
    return;
  }

  try {
    const defaultSettings = {
      autoDetect: true,
      highlightCurrent: true,
      autoDarkMode: true,
      maxHeadingLevel: 6,
      expandedLevels: 3,
      panelPosition: 'floating',
      panelWidth: 280,
      firstRun: false
    };

    await chrome.storage.sync.set(defaultSettings);
    await loadSettings();
    showStatus('设置已重置', 'success');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showStatus('重置设置失败', 'error');
  }
}

function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('statusMessage');
  const statusText = document.getElementById('statusText');

  statusText.textContent = message;
  statusElement.className = `status-message ${type}`;
  statusElement.style.display = 'block';

  setTimeout(() => {
    statusElement.style.display = 'none';
  }, 3000);
}

async function getStorageManager() {
  // 在选项页面中，我们无法直接访问 content script 中的 StorageManager
  // 所以需要重新实现
  return {
    async isDisabledForHost(hostname) {
      const result = await chrome.storage.local.get('disabledHosts');
      return result.disabledHosts && result.disabledHosts[hostname];
    },

    async toggleDisabledForHost(hostname) {
      const result = await chrome.storage.local.get('disabledHosts');
      const disabledHosts = result.disabledHosts || {};
      disabledHosts[hostname] = !disabledHosts[hostname];
      await chrome.storage.local.set({ disabledHosts });
      return !disabledHosts[hostname];
    }
  };
}
