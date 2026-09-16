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
 * 시트 모양을 두 가지 지원하고, 어느 쪽인지는 헤더를 보고 스스로 정합니다.
 *
 *   가로형 — 사람이 행, 회차가 열. 흔한 명부 형태입니다.
 *       이름   | … | 26.09 정기설문 | 26.09 정기면담
 *       김철수 | … |      72       |  9/24 14:00
 *                        ↑ 점수        ↑ 면담 일정
 *     회차로 읽히는 헤더(26.09 / 2026-09 / 2026년 9월 …)를 찾아 그 열에 씁니다.
 *     한 회차에 열이 여럿이면 제목으로 갈라봅니다. 「면담」이 들어간 칸은 면담
 *     일정 자리로, 그 밖(「설문」 포함)은 점수 자리로 봅니다. 설문 점수가 면담
 *     칸에 들어가면 안 되니까요.
 *
 *   세로형 — 한 줄이 한 사람의 한 회차.
 *       회차 | 이름 | 부서 | 종합점수 | 면담일정 …
 *     헤더에 「회차」 칸이 있으면 이 형태로 봅니다.
 *
 * 공통 원칙
 *   - 헤더 이름이 맞는 칸에만 씁니다. 우리가 모르는 칸(비고·담당자 같은 수기
 *     입력)은 건드리지 않습니다.
 *   - 같은 사람을 다시 보내면 덮어쓰고, 없을 때만 새 행을 답니다.
 *     그래서 여러 번 보내도 행이 늘지 않습니다.
 *   - 이미 적힌 값을 빈칸으로 지우지 않습니다.
 *
 * 헤더 이름이 아래와 다르면 ALIASES 에 한 줄 적어주면 됩니다.
 *   회차, 회차코드, 이름, 부서, 열람범위, 제출일시, 제출일자, 종합점수, 위험도,
 *   「업무 컨디션 점수」처럼 영역별 점수, 면담상태, 면담일정, 면담희망1, 면담희망2, 면담주제
 */

/** Vercel 의 SHEETS_WEBHOOK_SECRET 과 똑같이 맞춰주세요. */
var SECRET = '여기에_아무도_모르는_문자열';

/** 값을 넣을 시트 탭 이름. 비워두면 첫 번째 탭을 씁니다. */
var SHEET_NAME = '';

/** 항목 이름이 적힌 행 번호. 위에 제목 줄이 있으면 2, 3 … 으로 바꿔주세요. */
var HEADER_ROW = 1;

/** 가로형의 「설문」 칸에 넣을 값. 영역별 점수를 넣고 싶으면 '리더십 및 소통 점수' 처럼. */
var WIDE_VALUE_FIELD = '종합점수';

/** 가로형의 「면담」 칸에 넣을 값. */
var WIDE_INTERVIEW_FIELD = '면담일정';

/** 열 제목이 이 말을 포함하면 면담 칸으로 봅니다. */
var INTERVIEW_WORDS = ['면담', '미팅', '1:1'];

/** 명부에 없는 사람이 설문을 냈을 때 행을 새로 달지. 끄면 건너뛰고 알려만 줍니다. */
var ADD_MISSING_PEOPLE = true;

/**
 * 시트에 적힌 헤더 이름 → 우리가 보내는 항목명.
 * 시트 헤더는 그대로 두고 여기서 이어붙이면 됩니다.
 */
var ALIASES = {
  '성명': '이름',
  '제출자': '이름',
  '응답자': '이름',
  '직원명': '이름',
  '사원명': '이름',
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

    var layout = readLayout();
    if (layout.error) return json({ ok: false, error: layout.error });

    return json(layout.wide ? writeWide(layout, rows) : writeLong(layout, rows));
  } catch (err) {
    return json({ ok: false, error: '시트 처리 중 오류: ' + err });
  }
}

/** 연결 확인용. 브라우저에서 <웹앱주소>?key=SECRET 을 열면 읽어낸 헤더를 보여줍니다. */
function doGet(e) {
  if (!e || !e.parameter || String(e.parameter.key || '') !== String(SECRET)) {
    return json({ ok: false, error: '비밀값이 필요합니다. ?key=... 를 붙여주세요.' });
  }
  var layout = readLayout();
  if (layout.error) return json({ ok: false, error: layout.error });

  var columns = [];
  for (var c = 0; c < layout.headers.length; c++) {
    var period = layout.periodOfCol[c];
    var seen = '(안 채움)';
    if (period) {
      seen = period + (layout.kindOfCol[c] === 'interview' ? ' 면담 일정' : ' 설문 점수');
    } else if (layout.fieldOfCol[c] && isKnownField(layout.fieldOfCol[c])) {
      seen = layout.fieldOfCol[c];
    }
    columns.push({
      열: columnLetter(c + 1),
      시트헤더: String(layout.headers[c]).replace(/\n/g, ' '),
      인식: seen
    });
  }
  return json({
    ok: true,
    시트: layout.sheet.getName(),
    모양: layout.wide ? '가로형 (사람=행, 회차=열)' : '세로형 (한 줄 = 한 사람의 한 회차)',
    이름칸: columnLetter(layout.colOf['이름'] + 1),
    칸: columns
  });
}

// ── 시트 읽기 ─────────────────────────────────────────────────────────

function readLayout() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SHEET_NAME ? book.getSheetByName(SHEET_NAME) : book.getSheets()[0];
  if (!sheet) return { error: '시트를 찾지 못했습니다. SHEET_NAME 을 확인해 주세요.' };

  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();
  if (lastCol === 0 || lastRow < HEADER_ROW) {
    return { error: HEADER_ROW + '행에 항목 이름(헤더)이 있어야 합니다.' };
  }

  var headers = sheet.getRange(HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var fieldOfCol = [];
  var periodOfCol = [];
  var kindOfCol = [];
  var colOf = {};
  for (var c = 0; c < headers.length; c++) {
    var field = fieldName(headers[c]);
    // 같은 항목이 두 번 나오면 첫 칸만 씁니다.
    fieldOfCol[c] = (field && colOf[field] === undefined) ? field : '';
    if (fieldOfCol[c]) colOf[field] = c;
    // 회차로 읽히는 헤더(26.09 정기설문 등)는 그 회차의 칸으로 봅니다.
    periodOfCol[c] = colOf['회차'] === c ? '' : periodFromHeader(headers[c]);
    kindOfCol[c] = periodOfCol[c] ? columnKind(headers[c]) : '';
  }

  if (colOf['이름'] === undefined) {
    return {
      error: '시트에 「이름」 칸이 없습니다. 헤더에 이름을 두거나 ALIASES 에 별칭을 적어주세요.'
    };
  }

  // 「회차」 칸이 있으면 한 줄이 한 회차인 세로형, 없으면 회차가 열로 깔린 가로형.
  var wide = colOf['회차'] === undefined && colOf['회차코드'] === undefined;
  if (wide && !hasAnyPeriodColumn(periodOfCol)) {
    return {
      error: '회차를 알아볼 칸이 없습니다. 「회차」 칸을 두거나, 「26.09」 처럼 회차가 드러나는 열 제목을 두어야 합니다.'
    };
  }

  return {
    sheet: sheet,
    headers: headers,
    fieldOfCol: fieldOfCol,
    periodOfCol: periodOfCol,
    kindOfCol: kindOfCol,
    colOf: colOf,
    lastCol: lastCol,
    lastRow: lastRow,
    wide: wide
  };
}

/** 헤더 아래의 값들. 한 칸씩 쓰면 느리므로 통째로 읽어 고치고 한 번에 씁니다. */
function readBody(layout) {
  var first = HEADER_ROW + 1;
  if (layout.lastRow < first) return [];
  return layout.sheet.getRange(first, 1, layout.lastRow - HEADER_ROW, layout.lastCol).getValues();
}

function writeBody(layout, body) {
  if (!body.length) return;
  layout.sheet.getRange(HEADER_ROW + 1, 1, body.length, layout.lastCol).setValues(body);
}

// ── 가로형: 사람 행 × 회차 열 ─────────────────────────────────────────

function writeWide(layout, rows) {
  var body = readBody(layout);
  var nameCol = layout.colOf['이름'];

  var rowOfName = {};
  for (var r = 0; r < body.length; r++) {
    var who = String(body[r][nameCol] == null ? '' : body[r][nameCol]).trim();
    if (who && rowOfName[who] === undefined) rowOfName[who] = r;
  }

  // 같은 회차에 열이 여럿이면 제목으로 갈라 담습니다.
  // 같은 종류가 또 있으면 왼쪽 칸을 씁니다(먼저 만든 칸이 원본일 테니).
  var scoreCol = {};
  var interviewCol = {};
  for (var c = 0; c < layout.periodOfCol.length; c++) {
    var p = layout.periodOfCol[c];
    if (!p) continue;
    if (layout.kindOfCol[c] === 'interview') {
      if (interviewCol[p] === undefined) interviewCol[p] = c;
    } else if (scoreCol[p] === undefined) {
      scoreCol[p] = c;
    }
  }

  var updated = 0;
  var added = 0;
  var missingPeriods = {};
  var missingPeople = {};

  for (var n = 0; n < rows.length; n++) {
    var incoming = rows[n];
    var name = String(incoming['이름'] == null ? '' : incoming['이름']).trim();
    if (!name) continue;

    var period = normalizePeriod(incoming['회차코드'] || incoming['회차']);
    var score = incoming[WIDE_VALUE_FIELD];
    var schedule = incoming[WIDE_INTERVIEW_FIELD];
    var hasScore = score !== '' && score !== null && score !== undefined;
    var hasSchedule = schedule !== '' && schedule !== null && schedule !== undefined;

    // 넣을 값이 있는데 넣을 칸이 없으면 아무 데나 쓰지 않고 알려줍니다.
    if (hasScore && scoreCol[period] === undefined) {
      missingPeriods[period] = true;
      continue;
    }
    if (!hasScore && !hasSchedule) continue;

    var at = rowOfName[name];
    if (at === undefined) {
      if (!ADD_MISSING_PEOPLE) {
        missingPeople[name] = true;
        continue;
      }
      var fresh = [];
      for (var j = 0; j < layout.lastCol; j++) fresh.push('');
      fresh[nameCol] = name;
      // 부서 칸이 있으면 같이 채워 둡니다. 누가 새로 생겼는지 알아보기 쉽게.
      if (layout.colOf['부서'] !== undefined && incoming['부서']) {
        fresh[layout.colOf['부서']] = incoming['부서'];
      }
      body.push(fresh);
      at = body.length - 1;
      rowOfName[name] = at;
      added++;
    } else {
      updated++;
    }

    if (hasScore) body[at][scoreCol[period]] = coerce(score);
    if (hasSchedule && interviewCol[period] !== undefined) {
      body[at][interviewCol[period]] = schedule;
    }
  }

  writeBody(layout, body);

  var result = { ok: true, updated: updated, appended: added };
  var periods = Object.keys(missingPeriods);
  if (periods.length) {
    result.error =
      periods.join(', ') + ' 회차의 설문 칸이 시트에 없습니다. 「' +
      shortLabel(periods[0]) + ' 정기설문」 같은 제목으로 열을 하나 만들어 주세요.';
    result.ok = false;
  }
  var people = Object.keys(missingPeople);
  if (people.length) result.명부에없는사람 = people;
  return result;
}

// ── 세로형: 한 줄 = 한 사람의 한 회차 ────────────────────────────────

function writeLong(layout, rows) {
  var body = readBody(layout);
  var nameCol = layout.colOf['이름'];
  var periodField = layout.colOf['회차코드'] !== undefined ? '회차코드' : '회차';
  var periodCol = layout.colOf[periodField];

  // 이미 있는 행을 찾을 때 쓴 칸은 덮어쓰지 않습니다. 찾아낸 시점에 이미 같은
  // 값이고, 날짜로 서식이 잡힌 회차 칸을 문자열로 바꿔놓을 수 있습니다.
  var keyFields = { '이름': true };
  keyFields[periodField] = true;

  var indexOfKey = {};
  for (var r = 0; r < body.length; r++) {
    var existing = keyOf(body[r][nameCol], body[r][periodCol]);
    if (existing && indexOfKey[existing] === undefined) indexOfKey[existing] = r;
  }

  var updated = 0;
  var added = 0;
  for (var n = 0; n < rows.length; n++) {
    var incoming = rows[n];
    var key = keyOf(incoming['이름'], incoming[periodField]);
    if (!key) continue;
    var at = indexOfKey[key];

    if (at === undefined) {
      var fresh = [];
      for (var j = 0; j < layout.lastCol; j++) fresh.push('');
      fill(fresh, layout.fieldOfCol, incoming, true, null);
      body.push(fresh);
      added++;
      // 같은 요청 안에 같은 사람이 두 번 와도 행이 두 개 생기지 않게 합니다.
      indexOfKey[key] = body.length - 1;
    } else {
      fill(body[at], layout.fieldOfCol, incoming, false, keyFields);
      updated++;
    }
  }

  writeBody(layout, body);
  return { ok: true, updated: updated, appended: added };
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
    target[c] = coerce(value);
  }
}

// ── 잡다한 것들 ───────────────────────────────────────────────────────

/** 헤더 한 칸 → 우리 항목명. 줄바꿈·공백을 무시하고 별칭을 적용합니다. */
function fieldName(header) {
  var raw = String(header == null ? '' : header).trim();
  if (!raw) return '';
  var tight = raw.replace(/\s+/g, '');
  if (ALIASES[tight]) return ALIASES[tight];
  if (ALIASES[raw]) return ALIASES[raw];
  return tight;
}

/** 우리가 값을 보내는 항목인지. 안내 문구에만 씁니다. */
function isKnownField(field) {
  var known = ['회차', '회차코드', '이름', '부서', '열람범위', '제출일시', '제출일자',
               '종합점수', '위험도', '면담상태', '면담일정', '면담희망1', '면담희망2', '면담주제'];
  if (known.indexOf(field) >= 0) return true;
  return /점수$/.test(field);
}

/** 회차 열이 「면담」 칸인지 「설문(점수)」 칸인지. 제목에 단서가 없으면 점수로 봅니다. */
function columnKind(header) {
  var text = String(header == null ? '' : header);
  for (var i = 0; i < INTERVIEW_WORDS.length; i++) {
    if (text.indexOf(INTERVIEW_WORDS[i]) >= 0) return 'interview';
  }
  return 'score';
}

function hasAnyPeriodColumn(periodOfCol) {
  for (var i = 0; i < periodOfCol.length; i++) if (periodOfCol[i]) return true;
  return false;
}

/**
 * 열 제목에서 회차를 읽어냅니다. '26.09 정기면담' → '2026-09'.
 * 두 자리 연도는 2000년대로 봅니다.
 */
function periodFromHeader(header) {
  if (Object.prototype.toString.call(header) === '[object Date]') {
    return Utilities.formatDate(header, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  var text = String(header == null ? '' : header).trim();
  if (!text) return '';
  var found = text.match(/(\d{2,4})\s*[.\-\/년]\s*(\d{1,2})/);
  if (!found) return '';
  var month = Number(found[2]);
  if (month < 1 || month > 12) return '';
  return expandYear(found[1]) + '-' + pad2(month);
}

/** '2026-09' → '26.09' (없는 회차 칸을 안내할 때 씁니다) */
function shortLabel(period) {
  var parts = String(period).split('-');
  return parts.length === 2 ? parts[0].slice(2) + '.' + parts[1] : period;
}

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
  var found = text.match(/(\d{2,4})\s*[.\-\/년]\s*(\d{1,2})/);
  if (!found) return text;
  return expandYear(found[1]) + '-' + pad2(Number(found[2]));
}

function expandYear(raw) {
  var year = Number(raw);
  return String(year < 100 ? 2000 + year : year);
}

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

/** 숫자로만 된 문자열은 숫자로 넣습니다. 시트에서 평균·정렬이 되도록. */
function coerce(value) {
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  return value;
}

/** 1 → 'A', 18 → 'R' */
function columnLetter(index) {
  var letters = '';
  var n = index;
  while (n > 0) {
    var rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
