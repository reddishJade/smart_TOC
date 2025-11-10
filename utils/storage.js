// 存储管理工具

const StorageManager = {
  // 获取设置
  async getSettings() {
    try {
      const settings = await chrome.storage.sync.get({
        autoDetect: true,
        highlightCurrent: true,
        autoDarkMode: true,
        maxHeadingLevel: 6,
        panelPosition: 'floating', // 'floating', 'left', 'right'
        panelWidth: 280,
        expandedLevels: 6
      });
      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        autoDetect: true,
        highlightCurrent: true,
        autoDarkMode: true,
        maxHeadingLevel: 6,
        panelPosition: 'floating',
        panelWidth: 280,
        expandedLevels: 6
      };
    }
  },

  // 保存设置
  async saveSettings(settings) {
    try {
      await chrome.storage.sync.set(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  // 获取本地数据
  async getLocal(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      console.error('Failed to get local data:', error);
      return defaultValue;
    }
  },

  // 保存本地数据
  async setLocal(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Failed to set local data:', error);
    }
  },

  // 检查当前URL是否被禁用
  async isDisabledForHost(hostname) {
    const disabledHosts = await this.getLocal('disabledHosts', {});
    return disabledHosts[hostname] === true;
  },

  // 禁用/启用当前站点
  async toggleDisabledForHost(hostname) {
    const disabledHosts = await this.getLocal('disabledHosts', {});
    disabledHosts[hostname] = !disabledHosts[hostname];
    await this.setLocal('disabledHosts', disabledHosts);
    return !disabledHosts[hostname];
  }
};

// 全局变量，暴露StorageManager
window.StorageManager = StorageManager;
