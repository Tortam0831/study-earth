/**
 * 成り上がり動画道 — Google Apps Script Web アプリのエントリポイント
 * プロジェクトに HTML ファイル「index」(= index.html) を追加し、このファイルと一緒にデプロイする。
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('成り上がり動画道')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
