const urlParams = new URLSearchParams(window.location.search);
const domain = urlParams.get('d');
const domainLabel = document.getElementById('domain_label');
const levelLabel = document.getElementById('level_label');
const exitButton = document.getElementById('exitIntercept');
const titleLabel = document.getElementById('blocked_title');
const subtitleLabel = document.getElementById('blocked_subtitle');

if (domain && domainLabel) {
  domainLabel.innerText = domain;
}

if (domain && titleLabel) {
  titleLabel.innerText = `${domain} is blocked`;
}

if (domain && subtitleLabel) {
  subtitleLabel.innerText =
    'This page was redirected before it could load so your focus rule stays active.';
}

if (exitButton) {
  exitButton.addEventListener('click', () => {
    window.history.back();
  });
}

chrome.storage?.local.get(['fg_sync_mode'], (res) => {
  if (!levelLabel) {
    return;
  }
  levelLabel.innerText = res.fg_sync_mode === 'profile' ? 'STRONG' : 'STANDARD';
});
