export interface MenuTranslations {
  appName: string
  about: string
  checkForUpdates: string
  services: string
  hideApp: string
  hideOthers: string
  unhide: string
  quit: string
  edit: string
  undo: string
  redo: string
  cut: string
  copy: string
  paste: string
  pasteAndMatchStyle: string
  delete: string
  selectAll: string
  view: string
  reload: string
  forceReload: string
  resetZoom: string
  zoomIn: string
  zoomOut: string
  toggleFullscreen: string
  window: string
  minimize: string
  zoom: string
  front: string
  help: string
  learnMore: string
  developerMode: string
}

export const menuTranslations: Record<string, MenuTranslations> = {
  'zh-CN': {
    appName: 'EsCube',
    about: '关于 EsCube',
    checkForUpdates: '检查更新',
    services: '服务',
    hideApp: '隐藏 EsCube',
    hideOthers: '隐藏其他',
    unhide: '显示全部',
    quit: '退出',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    pasteAndMatchStyle: '粘贴并匹配样式',
    delete: '删除',
    selectAll: '全选',
    view: '查看',
    reload: '重新加载',
    forceReload: '强制重新加载',
    resetZoom: '重置缩放',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    front: '置于顶层',
    help: '帮助',
    learnMore: '了解更多',
    developerMode: '开发者模式',
  },
  'en-US': {
    appName: 'EsCube',
    about: 'About EsCube',
    checkForUpdates: 'Check for Updates',
    services: 'Services',
    hideApp: 'Hide EsCube',
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    pasteAndMatchStyle: 'Paste and Match Style',
    delete: 'Delete',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Fullscreen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring to Front',
    help: 'Help',
    learnMore: 'Learn More',
    developerMode: 'Developer Mode',
  },
}

export const getMenuTranslations = (locale: string): MenuTranslations => {
  return menuTranslations[locale] || menuTranslations['en-US']
}
