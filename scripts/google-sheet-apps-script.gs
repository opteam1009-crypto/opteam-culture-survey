/**
 * 옆커폰 사내 설문 → 구글 시트
 *
 * 붙이는 법
 *   1. 값을 채울 구글 시트를 엽니다.
 *   2. 확장 프로그램 → Apps Script → 이 파일 내용을 전부 붙여넣습니다.
 *   3. 아래 SECRET 을 아무도 모르는 문자열로 바꿉니다.
 *   4. 배포 → 새 배포 → 유형 「웹 앱」
 *        - 실행 사용자: 나
 *        - 액세스 권한: 모든 사용자          ← 이게 아니면 우리 서버가 못 부릅니다
 *   5. 나온 웹 앱 URL 과 SECRET 을 Vercel 환경변수에 넣습니다.
 *        SHEETS_WEBHOOK_URL    = https://script.google.com/macros/s/..../exec
 *        SHEETS_WEBHOOK_SECRET = 3번에서 정한 문자열
 *
 * 무엇을 하나
 *   시트의 첫 행(헤더)을 읽고, 이름이 맞는 칸에만 값을 넣습니다.
 *   - 헤더에 없는 항목은 버립니다.
 *   - 우리가 보내지 않는 칸(비고·담당자 같은 수기 입력)은 건드리지 않습니다.
 *   - 회차+이름이 같은 행이 이미 있으면 덮어쓰고, 없을 때만 새 행을 답니다.
 *     그래서 버튼을 여러 번 눌러도 행이 늘지 않습니다.
 *
 * 받는 항목명
 *   회차, 회차코드, 이름, 부서, 열람범위, 제출일시, 제출일자, 종합점수, 위험도,
 *   「업무 컨디션 점수」처럼 영역별 점수,
 *   면담상태, 면담일정, 면담희망1, 면담희망2, 면담주제
 *
 *   시트 헤더 이름이 이와 다르면 ALIASES 에 한 줄 적어주면 됩니다.
 */

/** Vercel 의 SHEETS_WEBHOOK_SECRET 과 똑같이 맞춰주세요. */
var SECRET = '여기에_아무도_모르는_문자열';

/** 값을 넣을 시트 탭 이름. 비워두면 첫 번째 탭을 씁니다. */
var SHEET_NAME = '';

/**
 * 시트에 적힌 헤더 이름 → 우리가 보내는 항목명.
 * 시트 헤더를 그대로 두고 여기서 이어붙이면 됩니다.
 */
var ALIASES = {
  '성명': '이름',
  '제출자': '이름',
  '응답자': '이름',
  '직원명': '이름',
  '소속': '부서',
  '소속부서': '부서',
  '팀': '부서',
  '부서명': '부서',
  '월': '회차',
  '설문회차': '회차',
  '설문월': '회차',
  '제출일': '제출일자',
  '설문제출일': '제출일자',
  '설문제출일자': '제출일자',
  '설문제출일시': '제출일시',
  '제출시각': '제출일시',
  '면담일시': '면담일정',
  '면담확정일': '면담일정',
  '면담확정일시': '면담일정',
  '1:1면담': '면담일정',
  '면담희망1순위': '면담희망1',
  '면담희망2순위': '면담희망2',
  '희망일시1': '면담희망1',
  '희망일시2': '면담희망2',
  '1순위': '면담희망1',
  '2순위': '면담희망2',
  '면담내용': '면담주제',
  '총점': '종합점수'
};

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (String(body.secret || '') !== String(SECRET)) {
      return json({
        ok: false,
        error: '시트 쪽 비밀값이 다릅니다. Apps Script 의 SECRET 과 Vercel 의 SHEETS_WEBHOOK_SECRET 을 같게 맞춰주세요.'
      });
    }
    var rows = body.rows || [];
    if (!rows.length) return json({ ok: true, updated: 0, appended: 0 });

    var sheet = targetSheet();
    if (!sheet) return json({ ok: false, error: '시트를 찾지 못했습니다. SHEET_NAME 을 확인해 주세요.' });

    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    if (lastCol === 0 || lastRow === 0) {
      return json({ ok: false, error: '시트 첫 행에 항목 이름(헤더)이 있어야 합니다.' });
    }

    // 헤더 → 우리 항목명. 같은 항목이 두 번 나오면 첫 칸만 씁니다.
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var fieldOfCol = [];
    var hasField = {};
    for (var c = 0; c < headers.length; c++) {
      var field = fieldName(headers[c]);
      fieldOfCol[c] = (field && !hasField[field]) ? field : '';
      if (field) hasField[field] = true;
    }

    // 같은 사람을 다시 찾을 열쇠. 회차코드가 있으면 그걸, 없으면 회차를 씁니다.
    var periodField = hasField['회차코드'] ? '회차코드' : (hasField['회차'] ? '회차' : '');
    if (!hasField['이름']) {
      return json({
        ok: false,
        error: '시트에 「이름」 칸이 없습니다. 헤더에 이름을 두거나 ALIASES 에 별칭을 적어주세요.'
      });
    }

    // 이미 있는 행을 찾을 때 쓴 칸은 덮어쓰지 않습니다. 찾아낸 시점에 이미
    // 같은 값이고, 날짜로 서식이 잡힌 회차 칸을 문자열로 바꿔놓을 수 있습니다.
    var keyFields = { '이름': true };
    if (periodField) keyFields[periodField] = true;

    var colOf = {};
    for (var i = 0; i < fieldOfCol.length; i++) {
      if (fieldOfCol[i]) colOf[fieldOfCol[i]] = i;
    }

    // 한 칸씩 쓰면 느리므로 통째로 읽어 고치고 한 번에 씁니다.
    var dataRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
    var indexOfKey = {};
    for (var r = 0; r < dataRows.length; r++) {
      var existing = keyOf(dataRows[r][colOf['이름']], periodField ? dataRows[r][colOf[periodField]] : '');
      if (existing && indexOfKey[existing] === undefined) indexOfKey[existing] = r;
    }

    var updated = 0;
    var added = 0;
    for (var n = 0; n < rows.length; n++) {
      var incoming = rows[n];
      var key = keyOf(incoming['이름'], periodField ? incoming[periodField] : '');
      var at = indexOfKey[key];

      if (at === undefined) {
        var fresh = [];
        for (var j = 0; j < lastCol; j++) fresh.push('');
        fill(fresh, fieldOfCol, incoming, true);
        dataRows.push(fresh);
        added++;
        // 같은 요청 안에 같은 사람이 두 번 와도 행이 두 개 생기지 않게 합니다.
        indexOfKey[key] = dataRows.length - 1;
      } else {
        fill(dataRows[at], fieldOfCol, incoming, false, keyFields);
        updated++;
      }
    }

    if (dataRows.length) {
      sheet.getRange(2, 1, dataRows.length, lastCol).setValues(dataRows);
    }
    return json({ ok: true, updated: updated, appended: added });
  } catch (err) {
    return json({ ok: false, error: '시트 처리 중 오류: ' + err });
  }
}

/** 연결 확인용. 브라우저에서 <웹앱주소>?key=SECRET 을 열면 읽어낸 헤더를 보여줍니다. */
function doGet(e) {
  if (!e || !e.parameter || String(e.parameter.key || '') !== String(SECRET)) {
    return json({ ok: false, error: '비밀값이 필요합니다. ?key=... 를 붙여주세요.' });
  }
  var sheet = targetSheet();
  if (!sheet) return json({ ok: false, error: '시트를 찾지 못했습니다.' });
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var mapped = [];
  for (var c = 0; c < headers.length; c++) {
    mapped.push({ 시트헤더: String(headers[c]), 채울항목: fieldName(headers[c]) || '(안 채움)' });
  }
  return json({ ok: true, sheet: sheet.getName(), headers: mapped });
}

/** 들어온 값을 헤더 자리에 놓습니다. */
function fill(target, fieldOfCol, incoming, isNew, skip) {
  for (var c = 0; c < fieldOfCol.length; c++) {
    var field = fieldOfCol[c];
    if (!field) continue; // 우리가 모르는 칸은 그대로 둡니다.
    if (skip && skip[field]) continue;
    if (!(field in incoming)) continue;
    var value = incoming[field];
    // 이미 적힌 값을 빈칸으로 덮지 않습니다. 면담이 아직 안 잡혔다고 해서
    // 손으로 적어둔 내용이 날아가면 안 됩니다.
    if (!isNew && (value === '' || value === null || value === undefined)) continue;
    target[c] = value;
  }
}

function targetSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  return SHEET_NAME ? book.getSheetByName(SHEET_NAME) : book.getSheets()[0];
}

/** 헤더 한 칸 → 우리 항목명. 공백을 무시하고 별칭을 적용합니다. */
function fieldName(header) {
  var raw = String(header == null ? '' : header).trim();
  if (!raw) return '';
  var tight = raw.replace(/\s+/g, '');
  if (ALIASES[tight]) return ALIASES[tight];
  if (ALIASES[raw]) return ALIASES[raw];
  return tight;
}

/**
 * 회차+이름을 하나의 열쇠로 만듭니다.
 * 회차는 '2026-09', '2026년 9월', 날짜 셀 어느 쪽으로 적혀 있어도 같게 봅니다.
 */
function keyOf(name, period) {
  var who = String(name == null ? '' : name).trim();
  if (!who) return '';
  return who + '||' + normalizePeriod(period);
}

function normalizePeriod(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  var text = String(value).trim();
  var found = text.match(/(\d{4})\D+(\d{1,2})/);
  if (!found) return text;
  var month = found[2].length === 1 ? '0' + found[2] : found[2];
  return found[1] + '-' + month;
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
