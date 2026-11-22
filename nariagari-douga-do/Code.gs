/**
 * 成り上がり動画道 — Google Apps Script Web アプリ
 * - doGet: ゲーム画面（HTML ファイル「index」）を返す
 * - issueCode / saveGame / loadGame: 5桁のセーブコードでクラウド保存
 *   セーブデータはスクリプトが自動で作るスプレッドシート「成り上がり動画道 セーブデータ」に入る
 * 最初に一度だけ、エディタで setup を実行して権限を許可しておく。
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('成り上がり動画道')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 最初に一度だけエディタから実行する（スプレッドシートの作成と権限の許可） */
function setup() {
  const sh = getSheet_();
  Logger.log('セーブ用シート: ' + sh.getParent().getUrl());
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
