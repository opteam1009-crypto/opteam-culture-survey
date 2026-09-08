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
export function sql(): SqlFn {
  return async (strings, ...values) => {
    let text = "";
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) text += `$${i + 1}`;
    }
    const result = await getPool().query(text, values as any[]);
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

  await q`
    create table if not exists departments (
      id          serial primary key,
      name        text not null unique,
      sort_order  int not null default 100,
      active      boolean not null default true,
      created_at  timestamptz not null default now()
    )`;

  await q`
    create table if not exists survey_questions (
      code          text primary key,
      section_code  text not null,
      section_label text not null,
      prompt        text not null,
      qtype         text not null,
      sort_order    int not null default 0,
      active        boolean not null default true
    )`;

  await q`
    create table if not exists survey_responses (
      id              uuid primary key default gen_random_uuid(),
      period          text not null,
      respondent_name text not null,
      department_id   int references departments(id) on delete set null,
      department_name text not null,
      visibility      text not null check (visibility in ('both','ceo_only','hr_only')),
      -- 근속기간은 설문에서 뺐다. 되살릴 때를 위해 컬럼만 남겨두며 항상 null 이다.
      tenure          text,
      risk_level      int not null default 0,
      overall_score   numeric(5,2),
      section_scores  jsonb not null default '{}'::jsonb,
      submitted_at    timestamptz not null default now(),
      user_agent      text
    )`;

  await q`
    create table if not exists survey_answers (
      id            bigserial primary key,
      response_id   uuid not null references survey_responses(id) on delete cascade,
      question_code text not null,
      value_num     int,
      value_text    text
    )`;

  await q`
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
    )`;

  // 기존 배포에 이미 테이블이 있는 경우를 위한 증분 반영.
  await q`alter table survey_responses add column if not exists tenure text`;
  await q`alter table survey_responses add column if not exists risk_level int not null default 0`;
  await q`alter table survey_questions add column if not exists options jsonb`;
  await q`alter table survey_questions add column if not exists scored boolean not null default true`;
  await q`alter table survey_questions drop constraint if exists survey_questions_qtype_check`;

  await q`create index if not exists survey_responses_period_idx on survey_responses (period)`;
  await q`create index if not exists survey_responses_risk_idx on survey_responses (risk_level desc)`;
  await q`create index if not exists survey_responses_dept_idx on survey_responses (department_id)`;
  await q`create index if not exists survey_responses_submitted_idx on survey_responses (submitted_at desc)`;
  await q`create index if not exists survey_answers_response_idx on survey_answers (response_id)`;
  await q`create index if not exists survey_answers_question_idx on survey_answers (question_code)`;

  await seedDepartments(q);
  await syncQuestions(q);
}

async function seedDepartments(q: SqlFn) {
  const existing = (await q`select name from departments`) as { name: string }[];

  if (existing.length > 0) {
    const responses = (await q`select count(*)::int as n from survey_responses`) as {
      n: number;
    }[];
    const untouched =
      responses[0]?.n === 0 &&
      existing.every((row) => PLACEHOLDER_DEPARTMENTS.includes(row.name));
    if (!untouched) return;
    await q`delete from departments`;
  }

  for (let i = 0; i < DEFAULT_DEPARTMENTS.length; i++) {
    await q`insert into departments (name, sort_order)
            values (${DEFAULT_DEPARTMENTS[i]}, ${(i + 1) * 10})
            on conflict (name) do nothing`;
  }
}

/**
 * 코드에 정의된 문항을 DB 로 반영합니다. 문구 수정은 그대로 덮어쓰고,
 * 코드에서 사라진 문항은 지우지 않고 비활성 처리해 과거 응답을 보존합니다.
 */
async function syncQuestions(q: SqlFn) {
  const codes: string[] = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const question = QUESTIONS[i];
    const sectionLabel = SECTION_BY_CODE.get(question.sectionCode)?.label ?? question.sectionCode;
    codes.push(question.code);
    await q`
      insert into survey_questions
        (code, section_code, section_label, prompt, qtype, options, scored, sort_order, active)
      values
        (${question.code}, ${question.sectionCode}, ${sectionLabel}, ${question.prompt},
         ${question.type}, ${question.options ? JSON.stringify(question.options) : null}::jsonb,
         ${question.scored}, ${i}, true)
      on conflict (code) do update set
        section_code  = excluded.section_code,
        section_label = excluded.section_label,
        prompt        = excluded.prompt,
        qtype         = excluded.qtype,
        options       = excluded.options,
        scored        = excluded.scored,
        sort_order    = excluded.sort_order,
        active        = true`;
  }
  await q`update survey_questions set active = false where code <> all(${codes})`;
}
