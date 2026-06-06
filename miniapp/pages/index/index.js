Page({
  onLoad() {
    console.log('📱 照片墙已加载');
  },
  onMessage(e) {
    // H5 页面通过 postMessage 传消息时触发
    console.log('H5消息:', e.detail);
  }
});
