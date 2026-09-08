import { createHash } from "node:crypto";
import { Pool } from "pg";
import { QUESTIONS, SECTION_BY_CODE } from "./questions";

// 호스팅 환경마다 연결 문자열을 주입하는 이름이 다릅니다(Vercel+Neon, Supabase 등).
// 어느 것이 오든 동작하도록 순서대로 찾습니다.
const URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
];

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      "데이터베이스 연결 문자열이 없습니다. Vercel 프로젝트에 Neon 을 연결하거나 DATABASE_URL 환경변수를 설정하세요.",
    );
    this.name = "MissingDatabaseUrlError";
  }
}

// .env.example 에 적어둔 예시 연결 문자열. Vercel 이 import 시 자동으로 넣어버리므로
// 실제 값으로 취급하면 정체를 알 수 없는 연결 오류만 남습니다.
function isPlaceholderUrl(value: string): boolean {
  return value.includes("user:password@") || value.includes("ep-xxx");
}

function databaseUrl(): string | undefined {
  return URL_KEYS.map((k) => process.env[k]?.trim()).find(
    (v): v is string => typeof v === "string" && v.length > 0 && !isPlaceholderUrl(v),
  );
}

export function hasDatabaseUrl(): boolean {
  return databaseUrl() !== undefined;
}

function isLocal(url: string): boolean {
  return /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) || url.startsWith("postgresql:///");
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const url = databaseUrl();
  if (!url) throw new MissingDatabaseUrlError();
  pool = new Pool({
    connectionString: url,
    // 서버리스 환경에서 커넥션이 쌓이지 않도록 인스턴스당 소수만 유지합니다.
    max: Number(process.env.PGPOOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: isLocal(url) ? false : { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== "1" },
  });
  pool.on("error", (err) => console.error("[db] idle client error", err));
  return pool;
}

export type SqlFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Record<string, any>[]>;

/**
 * 태그드 템플릿으로 SQL 을 실행합니다. 보간된 값은 전부 바인딩 파라미터($1, $2…)로
 * 넘어가므로 문자열 결합으로 인한 인젝션이 생기지 않습니다.
 * 환경변수는 모듈 로드 시점이 아니라 호출 시점에 읽어 빌드가 통과하도록 합니다.
 */
/** 진단용 왕복 횟수 카운터. DB_TRACE=1 일 때만 셉니다. */
export const dbStats = { queries: 0, ms: 0 };

export function sql(): SqlFn {
  return async (strings, ...values) => {
    let text = "";
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) text += `$${i + 1}`;
    }
    const started = Date.now();
    const result = await getPool().query(text, values as any[]);
    dbStats.queries += 1;
    dbStats.ms += Date.now() - started;
    return result.rows;
  };
}

const DEFAULT_DEPARTMENTS = [
  "기획운영팀",
  "회계팀",
  "운영관리팀",
  "개발팀",
  "퍼포먼스팀",
  "영상컨텐츠팀",
  "매장컨텐츠팀",
  "컨텐츠팀",
  "부동산팀",
  "마케팅부",
];

// 실제 조직도를 받기 전에 임시로 넣었던 목록. 아직 응답이 한 건도 없고 부서 목록이
// 이 임시값 그대로라면 실제 목록으로 갈아끼웁니다. 이미 운영이 시작된 뒤에는
// (응답이 있거나 직접 편집한 흔적이 있으면) 아무것도 건드리지 않습니다.
const PLACEHOLDER_DEPARTMENTS = [
  "경영지원",
  "인사·총무",
  "영업",
  "마케팅",
  "개발",
  "디자인",
  "기타",
];

let schemaReady: Promise<void> | null = null;

/**
 * 스키마를 멱등하게 보장합니다. 첫 요청에서 한 번만 실행되고 이후에는
 * 같은 Promise 를 재사용하므로 요청마다 DDL 이 도는 일은 없습니다.
 * 별도의 마이그레이션 실행 절차 없이 배포만으로 동작하게 하기 위한 구조입니다.
 */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = runMigrations().catch((err) => {
      // 실패하면 다음 요청에서 다시 시도할 수 있도록 캐시를 비웁니다.
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function runMigrations(): Promise<void> {
  const q = sql();

  // DDL 을 한 번에 보냅니다. 문장을 나눠 보내면 문장 수만큼 왕복이 생기는데,
  // 서버리스에서는 인스턴스가 새로 뜰 때마다 그 비용을 전부 다시 냅니다.
  await rawQuery(`
    create table if not exists app_meta (
      key        text primary key,
      value      text not null,
      updated_at timestamptz not null default now()
    );

    create table if not exists departments (
      id          serial primary key,
      name        text not null unique,
      sort_order  int not null default 100,
      active      boolean not null default true,
      created_at  timestamptz not null default now()
    );

    create table if not exists survey_questions (
      code          text primary key,
      section_code  text not null,
      section_label text not null,
      prompt        text not null,
      qtype         text not null,
      sort_order    int not null default 0,
      active        boolean not null default true
    );

    create table if not exists survey_responses (
      id              uuid primary key default gen_random_uuid(),
      period          text not null,
      respondent_name text not null,
      department_id   int references departments(id) on delete set null,
      department_name text not null,
      visibility      text not null check (visibility in ('both','ceo_only','hr_only')),
      tenure          text,
      risk_level      int not null default 0,
      is_demo         boolean not null default false,
      overall_score   numeric(5,2),
      section_scores  jsonb not null default '{}'::jsonb,
      submitted_at    timestamptz not null default now(),
      user_agent      text
    );

    create table if not exists survey_answers (
      id            bigserial primary key,
      response_id   uuid not null references survey_responses(id) on delete cascade,
      question_code text not null,
      value_num     int,
      value_text    text
    );

    create table if not exists login_attempts (
      client_key   text primary key,
      attempts     int not null default 0,
      window_start timestamptz not null default now(),
      blocked_until timestamptz
    );

    create table if not exists notification_log (
      id          bigserial primary key,
      response_id uuid references survey_responses(id) on delete cascade,
      recipients  text not null,
      subject     text not null,
      body        text not null,
      status      text not null default 'pending',
      error       text,
      created_at  timestamptz not null default now(),
      sent_at     timestamptz
    );

    alter table survey_responses add column if not exists tenure text;
    alter table survey_responses add column if not exists risk_level int not null default 0;
    alter table survey_responses add column if not exists is_demo boolean not null default false;
    alter table survey_questions add column if not exists options jsonb;
    alter table survey_questions add column if not exists scored boolean not null default true;
    alter table survey_questions drop constraint if exists survey_questions_qtype_check;

    create index if not exists survey_responses_period_idx on survey_responses (period);
    create index if not exists survey_responses_dept_idx on survey_responses (department_id);
    create index if not exists survey_responses_submitted_idx on survey_responses (submitted_at desc);
    create index if not exists survey_responses_risk_idx on survey_responses (risk_level desc);
    create index if not exists survey_responses_demo_idx on survey_responses (is_demo);
    create index if not exists survey_answers_response_idx on survey_answers (response_id);
    create index if not exists survey_answers_question_idx on survey_answers (question_code);
  `);

  // 부서 시드 여부와 문항 동기화 필요 여부를 한 번에 확인합니다.
  const state = (await q`
    select (select count(*)::int from departments)                              as dept_count,
           (select count(*)::int from survey_responses)                         as response_count,
           (select string_agg(name, '|' order by name) from departments)        as dept_names,
           (select value from app_meta where key = 'questions_hash')            as questions_hash
  `) as {
    dept_count: number;
    response_count: number;
    dept_names: string | null;
    questions_hash: string | null;
  }[];
  const current = state[0];

  await seedDepartments(current);
  await syncQuestions(current.questions_hash);
}

async function seedDepartments(state: {
  dept_count: number;
  response_count: number;
  dept_names: string | null;
}) {
  const q = sql();

  if (state.dept_count > 0) {
    const names = (state.dept_names ?? "").split("|").filter(Boolean);
    const untouched =
      state.response_count === 0 && names.every((n) => PLACEHOLDER_DEPARTMENTS.includes(n));
    if (!untouched) return;
    await q`delete from departments`;
  }

  const values: unknown[] = [];
  const rows = DEFAULT_DEPARTMENTS.map((name, i) => {
    values.push(name, (i + 1) * 10);
    return `($${i * 2 + 1},$${i * 2 + 2})`;
  });
  await rawQuery(
    `insert into departments (name, sort_order) values ${rows.join(",")}
     on conflict (name) do nothing`,
    values,
  );
}

/**
 * 코드에 정의된 문항을 DB 로 반영합니다. 문항이 그대로면 아무것도 하지 않습니다.
 * 예전에는 배포마다, 그리고 서버리스 인스턴스가 새로 뜰 때마다 문항 수만큼
 * INSERT 를 반복해 콜드 스타트가 느려졌습니다.
 */
async function syncQuestions(storedHash: string | null) {
  const payload = JSON.stringify(
    QUESTIONS.map((question, i) => [
      question.code,
      question.sectionCode,
      SECTION_BY_CODE.get(question.sectionCode)?.label ?? question.sectionCode,
      question.prompt,
      question.type,
      question.options ?? null,
      question.scored,
      i,
    ]),
  );
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 32);
  if (storedHash === hash) return;

  const values: unknown[] = [];
  const rows = QUESTIONS.map((question, i) => {
    const base = i * 8;
    values.push(
      question.code,
      question.sectionCode,
      SECTION_BY_CODE.get(question.sectionCode)?.label ?? question.sectionCode,
      question.prompt,
      question.type,
      question.options ? JSON.stringify(question.options) : null,
      question.scored,
      i,
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6}::jsonb,$${base + 7},$${base + 8},true)`;
  });

  await rawQuery(
    `insert into survey_questions
       (code, section_code, section_label, prompt, qtype, options, scored, sort_order, active)
     values ${rows.join(",")}
     on conflict (code) do update set
       section_code  = excluded.section_code,
       section_label = excluded.section_label,
       prompt        = excluded.prompt,
       qtype         = excluded.qtype,
       options       = excluded.options,
       scored        = excluded.scored,
       sort_order    = excluded.sort_order,
       active        = true`,
    values,
  );

  // 코드에서 사라진 문항은 지우지 않고 비활성 처리해 과거 응답을 보존합니다.
  await rawQuery(`update survey_questions set active = false where code <> all($1)`, [
    QUESTIONS.map((question) => question.code),
  ]);

  await rawQuery(
    `insert into app_meta (key, value, updated_at) values ('questions_hash', $1, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [hash],
  );
}

/**
 * 태그드 템플릿으로 표현하기 어려운 질의(행 수가 가변인 대량 INSERT 등)를 위한 통로.
 * 값은 반드시 params 로 넘겨야 하며 text 에 사용자 입력을 이어붙이면 안 됩니다.
 */
export async function rawQuery(
  text: string,
  params: unknown[] = [],
): Promise<Record<string, any>[]> {
  const started = Date.now();
  const result = await getPool().query(text, params as any[]);
  dbStats.queries += 1;
  dbStats.ms += Date.now() - started;
  return result.rows;
}
