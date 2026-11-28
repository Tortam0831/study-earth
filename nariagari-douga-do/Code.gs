/**
 * 成り上がり動画道 — Google Apps Script Web アプリ
 * - doGet: 読み込み画面を返し、ゲーム本体はブラウザが GitHub から読み込む（index を貼る必要はない。更新も自動）
 * - issueCode / saveGame / loadGame: 5桁のセーブコードでクラウド保存
 *   セーブデータはスクリプトが自動で作るスプレッドシート「成り上がり動画道 セーブデータ」に入る
 * 最初に一度だけ、エディタで setup を実行して権限を許可しておく。
 * セーブコードを忘れたときは、エディタで listSaves を実行すると、保存されている全コードが称号つきで表示される。
 */
const GAME_URL = 'https://raw.githubusercontent.com/Tortam0831/study-earth/ccr-832f93f4-2sx0qd/nariagari-douga-do/index.html';
const GAME_URL_CDN = 'https://cdn.jsdelivr.net/gh/Tortam0831/study-earth@ccr-832f93f4-2sx0qd/nariagari-douga-do/index.html';

/** ブラウザから直接読めないときの予備：GAS がゲーム本体を取ってきて渡す */
function getGameHtml() {
  for (const url of [GAME_URL + '?t=' + Date.now(), GAME_URL_CDN]) {
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) return res.getContentText('UTF-8');
    } catch (e) {}
  }
  throw new Error('GitHub からゲームを取ってこれませんでした');
}

function doGet() {
  // GAS は大きな HTML を約100KBで切ってしまうので、小さな読み込み画面だけを返す。
  // ゲーム本体は ① GitHub ② jsDelivr ③ getGameHtml（GAS 経由）の順に読み込む
  return HtmlService.createHtmlOutput(LOADER_HTML_)
    .setTitle('成り上がり動画道')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

const LOADER_HTML_ = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f3ede1;color:#1d1a16;font-family:sans-serif">
<div id="ld" style="padding:60px 20px;text-align:center;font-weight:700;font-size:18px;line-height:1.7">成り上がり動画道 を準備中…<br><small id="ldStep" style="font-size:13px;color:#7a7164">1/3</small></div>
<script>
(function(){
  var BRANCH = 'ccr-832f93f4-2sx0qd';
  var RAW = 'https://raw.githubusercontent.com/Tortam0831/study-earth/' + BRANCH + '/nariagari-douga-do/index.html';
  var CDN = 'https://cdn.jsdelivr.net/gh/Tortam0831/study-earth@' + BRANCH + '/nariagari-douga-do/index.html';
  var errors = [];
  function step(t){ var e = document.getElementById('ldStep'); if (e) e.textContent = t; }
  function withTimeout(p, ms){
    return new Promise(function(res, rej){
      var t = setTimeout(function(){ rej(new Error('時間切れ')); }, ms);
      p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); });
    });
  }
  function viaFetch(url){
    if (!window.fetch) return Promise.reject(new Error('このブラウザは fetch が使えない'));
    return withTimeout(fetch(url, { cache: 'no-store' }).then(function(r){
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }), 12000);
  }
  function viaGAS(){
    return withTimeout(new Promise(function(res, rej){
      if (!(window.google && google.script && google.script.run)) return rej(new Error('GAS の接続がない'));
      google.script.run
        .withSuccessHandler(res)
        .withFailureHandler(function(e){ rej(new Error((e && e.message) || String(e))); })
        .getGameHtml();
    }), 30000);
  }
  var tries = [
    { name: 'GitHub', run: function(){ return viaFetch(RAW + '?t=' + Date.now()); } },
    { name: 'jsDelivr', run: function(){ return viaFetch(CDN); } },
    { name: 'GAS経由', run: viaGAS },
  ];
  function mount(html){
    var doc = new DOMParser().parseFromString(html, 'text/html');
    document.title = doc.title || '成り上がり動画道';
    Array.prototype.forEach.call(doc.head.children, function(n){
      if (n.tagName === 'SCRIPT') return;
      document.head.appendChild(document.importNode(n, true));
    });
    document.body.innerHTML = '';
    document.body.removeAttribute('style');
    Array.prototype.forEach.call(doc.body.attributes, function(a){ document.body.setAttribute(a.name, a.value); });
    Array.prototype.forEach.call(doc.body.childNodes, function(n){
      if (n.nodeType === 1 && n.tagName === 'SCRIPT'){
        var s = document.createElement('script');
        s.text = n.textContent;
        document.body.appendChild(s);
      } else {
        document.body.appendChild(document.importNode(n, true));
      }
    });
  }
  function fail(){
    document.body.innerHTML = '<div style="padding:40px 20px;text-align:center;font-family:sans-serif;line-height:1.7">' +
      '<b style="font-size:18px">ゲームを読み込めませんでした</b><br>' +
      '<div style="font-size:13px;color:#7a7164;margin:10px 0;text-align:left;display:inline-block">' + errors.join('<br>') + '</div><br>' +
      '<button onclick="location.reload()" style="font-size:18px;padding:10px 24px">もう一度</button></div>';
  }
  function next(i){
    if (i >= tries.length) return fail();
    step((i + 1) + '/3　' + tries[i].name + ' から読み込み中');
    tries[i].run().then(function(html){
      if (!html || html.indexOf('window.__nddReady') < 0) throw new Error('データが不完全（' + (html ? html.length : 0) + '文字）');
      mount(html);
      if (!window.__nddReady) throw new Error('起動できなかった');
    }).catch(function(e){
      errors.push(tries[i].name + '：' + (e && e.message ? e.message : e));
      if (!window.__nddReady) next(i + 1);
    });
  }
  next(0);
})();
</script></body></html>`;

/** 最初に一度だけエディタから実行する（スプレッドシートの作成と権限の許可） */
function setup() {
  const sh = getSheet_();
  Logger.log('セーブ用シート: ' + sh.getParent().getUrl());
  const html = getGameHtml();
  Logger.log('ゲーム本体の確認: OK（' + html.length + '文字）');
  Logger.log('準備OK');
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SAVE_SHEET_ID');
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('成り上がり動画道 セーブデータ');
    props.setProperty('SAVE_SHEET_ID', ss.getId());
  }
  let sh = ss.getSheetByName('saves');
  if (!sh) {
    sh = ss.insertSheet('saves');
    sh.getRange('A:A').setNumberFormat('@');
    sh.appendRow(['code', 'data', 'updated']);
  }
  return sh;
}

function findRow_(sh, code) {
  const hit = sh.getRange('A:A').createTextFinder(String(code)).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function checkCode_(code) {
  code = String(code || '');
  if (!/^\d{5}$/.test(code)) throw new Error('コードは5桁の数字です');
  return code;
}

/** まだ使われていない5桁のコードを発行する（1人1回） */
function issueCode() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_();
    for (let i = 0; i < 60; i++) {
      const code = String(Math.floor(10000 + Math.random() * 90000));
      if (!findRow_(sh, code)) {
        sh.appendRow([code, '', new Date()]);
        return code;
      }
    }
    throw new Error('コードを発行できませんでした。もう一度ためしてください');
  } finally {
    lock.releaseLock();
  }
}

/** 発行済みのコードにセーブデータを上書きする（コードは変わらない） */
function saveGame(code, data) {
  code = checkCode_(code);
  if (typeof data !== 'string' || data.length > 45000) throw new Error('セーブデータの形が正しくありません');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = getSheet_();
    const row = findRow_(sh, code);
    if (!row) throw new Error('そのコードは見つかりません');
    sh.getRange(row, 2, 1, 2).setValues([[data, new Date()]]);
    return true;
  } finally {
    lock.releaseLock();
  }
}

/** コードのセーブデータを返す（まだ保存されていなければ空文字） */
function loadGame(code) {
  code = checkCode_(code);
  const sh = getSheet_();
  const row = findRow_(sh, code);
  if (!row) throw new Error('そのコードは見つかりません');
  return String(sh.getRange(row, 2).getValue() || '');
}

const RANK_NAMES_ = ['クソガキ','親のスマホ泥棒','無断転載','パクリ常習犯','底辺YouTuber','再生数1桁の職人','収益化の亡者','サムネ詐欺師',
  '中堅クリエイター','切り抜かれ芸人','銀盾YouTuber','炎上請負人','トップYouTuber','金盾ホルダー','案件の帝王','国民的YouTuber',
  'ダイヤ盾の住人','テレビより有名','社会現象','アジアの覇者','世界一のYouTuber','地球代表','人類の推し','全人類登録',
  '宇宙人にも人気','銀河配信王','動画の神'];

/** セーブコードを忘れたとき用：エディタで実行すると、全コードを進み具合の大きい順に表示する */
function listSaves() {
  const sh = getSheet_();
  const rows = sh.getDataRange().getValues().slice(1);
  const list = rows.map(r => {
    let d = null;
    try { d = r[1] ? JSON.parse(r[1]) : null; } catch (e) { d = null; }
    const st = (d && d.st) || {};
    return {
      code: String(r[0]),
      updated: r[2] ? Utilities.formatDate(new Date(r[2]), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') : '',
      rank: d ? (RANK_NAMES_[d.rank] || '?') : '（データなし）',
      best: Math.max(st.maxSubs || 0, (d && d.subs) || 0),
      retires: st.retires || 0,
      hours: d ? Math.round((d.playTime || 0) / 360) / 10 : 0,
    };
  }).sort((a, b) => b.best - a.best);
  const lines = list.map(x => `${x.code}　${x.rank}　最高登録者 ${Math.floor(x.best).toLocaleString()}人　引退${x.retires}回　プレイ${x.hours}時間　最終保存 ${x.updated}`);
  Logger.log('セーブコード一覧（進み具合の大きい順）\n' + lines.join('\n'));
  return lines;
}
