var musubioApiHost = 'https://musubio-player-api.appspot.com';

document.addEventListener('polymer-ready', function() {
  var navIcon = document.getElementById('nav-icon');
  var drawerPanel = document.getElementById('drawer-panel');
  navIcon.addEventListener('click', function() {
    drawerPanel.togglePanel();
  });
});