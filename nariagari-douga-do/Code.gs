/**
 * 成り上がり動画道 — Google Apps Script Web アプリ
 * - doGet: ゲーム本体を GitHub から読み込んで表示する（index を貼る必要はない。更新も自動）
 * - issueCode / saveGame / loadGame: 5桁のセーブコードでクラウド保存
 *   セーブデータはスクリプトが自動で作るスプレッドシート「成り上がり動画道 セーブデータ」に入る
 * 最初に一度だけ、エディタで setup を実行して権限を許可しておく。
 * セーブコードを忘れたときは、エディタで listSaves を実行すると、保存されている全コードが称号つきで表示される。
 */
const GAME_URL = 'https://raw.githubusercontent.com/Tortam0831/study-earth/ccr-832f93f4-2sx0qd/nariagari-douga-do/index.html';

function doGet() {
  let html = null;
  try {
    const res = UrlFetchApp.fetch(GAME_URL + '?t=' + Math.floor(Date.now() / 300000), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) html = res.getContentText('UTF-8');
  } catch (e) {
    html = null;
  }
  let out;
  if (html) out = HtmlService.createHtmlOutput(html);
  else {
    try { out = HtmlService.createHtmlOutputFromFile('index'); }
    catch (e) { out = HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:20px">ゲームを読み込めませんでした。少し待ってから開き直してください。</p>'); }
  }
  return out
    .setTitle('成り上がり動画道')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 最初に一度だけエディタから実行する（スプレッドシートの作成と権限の許可） */
function setup() {
  const sh = getSheet_();
  Logger.log('セーブ用シート: ' + sh.getParent().getUrl());
  const res = UrlFetchApp.fetch(GAME_URL, { muteHttpExceptions: true });
  Logger.log('ゲーム本体の読み込み: ' + (res.getResponseCode() === 200 ? 'OK（' + res.getContentText().length + '文字）' : 'NG ' + res.getResponseCode()));
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
