/* ============================================================
   悬停增强 JS v3 (2026-09-15)
   功能: 1. 给 .img-card 注入播放图标 overlay
         2. 悬停/点击时随机播放钢琴音阶 (do-re-mi-fa-sol-la-si-do)
   ============================================================ */
(function () {
  'use strict';

  // ── 注入播放图标 ──
  function injectPlayIcons() {
    document.querySelectorAll('.img-card').forEach(function (card) {
      if (card.querySelector('.play-overlay')) return;
      var img = card.querySelector('.ic-img[onclick]');
      if (!img) return;
      card.style.position = 'relative';
      var overlay = document.createElement('div');
      overlay.className = 'play-overlay';
      overlay.innerHTML =
        '<div class="play-icon">' +
        '<svg viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"/></svg>' +
        '</div>';
      card.insertBefore(overlay, card.firstChild);
    });
  }

  // ── 钢琴音阶 (C4 大调) ──
  var NOTES = [
    { name: 'do',  freq: 261.63 },
    { name: 're',  freq: 293.66 },
    { name: 'mi',  freq: 329.63 },
    { name: 'fa',  freq: 349.23 },
    { name: 'sol', freq: 392.00 },
    { name: 'la',  freq: 440.00 },
    { name: 'si',  freq: 493.88 },
    { name: 'do↑', freq: 523.25 }
  ];

  var audioCtx = null;
  var audioUnlocked = false;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  // 浏览器自动播放策略：第一次用户交互时解锁 AudioContext
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      var ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().then(function () { audioUnlocked = true; });
      } else {
        audioUnlocked = true;
      }
    } catch (e) {}
  }

  // 监听任何首次交互来解锁
  ['click', 'touchstart', 'keydown', 'mousemove'].forEach(function (evt) {
    document.addEventListener(evt, unlockAudio, { once: false, passive: true });
  });

  /**
   * 模拟钢琴音色：基频 + 泛音列 + 指数衰减包络
   * @param {number} freq 频率
   * @param {number} volume 音量 0-1
   * @param {number} duration 持续时间（秒）
   */
  function playPianoNote(freq, volume, duration) {
    try {
      var ctx = getAudioCtx();
      // 确保 AudioContext 已解锁
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      var now = ctx.currentTime;
      volume = volume || 0.15;
      duration = duration || 0.5;

      // 钢琴泛音列：基频 + 2倍频 + 3倍频 + 4倍频
      var partials = [
        { ratio: 1,   gain: 1.0 },
        { ratio: 2,   gain: 0.3 },
        { ratio: 3,   gain: 0.12 },
        { ratio: 4,   gain: 0.05 }
      ];

      var master = ctx.createGain();
      master.gain.setValueAtTime(volume, now);
      // 快速起音 + 指数衰减（模拟琴槌敲击）
      master.gain.exponentialRampToValueAtTime(0.001, now + duration);
      master.connect(ctx.destination);

      partials.forEach(function (p) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * p.ratio, now);
        g.gain.setValueAtTime(p.gain, now);
        // 高频泛音衰减更快
        g.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 / p.ratio));
        osc.connect(g);
        g.connect(master);
        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) { /* 静默 */ }
  }

  function playRandomNote(volume, duration) {
    var note = NOTES[Math.floor(Math.random() * NOTES.length)];
    playPianoNote(note.freq, volume, duration);
  }

  // ── 绑定事件 ──
  function bindEvents() {
    // 点击：稍响 + 稍长
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.img-card');
      if (card && card.querySelector('.ic-img[onclick]')) {
        playRandomNote(0.18, 0.6);
        return;
      }
      var fc = e.target.closest('.feature-card');
      if (fc) playRandomNote(0.18, 0.6);
    });

    // 悬停：轻 + 短（节流 120ms）
    var lastHover = 0;
    document.addEventListener('mouseenter', function (e) {
      var now = Date.now();
      if (now - lastHover < 120) return;
      var card = e.target.closest ? e.target.closest('.img-card, .feature-card') : null;
      if (card) {
        lastHover = now;
        playRandomNote(0.08, 0.35);
      }
    }, true);
  }

  // ── 初始化 ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectPlayIcons();
      bindEvents();
    });
  } else {
    injectPlayIcons();
    bindEvents();
  }
})();
