import { SCORED_QUESTIONS, SCORED_SECTION_CODES, SECTIONS, questionsOfSection } from "./questions";

/** 1~5 리커트 평균을 0~100 점으로 환산합니다. 3점(보통) = 50점. */
export function toHundred(mean: number): number {
  return Math.round(((mean - 1) / 4) * 1000) / 10;
}

export function meanOf(values: number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export interface ScoreResult {
  overall: number | null;
  sections: Record<string, number>;
}

/** 응답(문항코드 → 1~5)으로부터 전체 점수와 섹션별 점수를 계산합니다. */
export function computeScores(answers: Record<string, number>): ScoreResult {
  const sections: Record<string, number> = {};

  for (const section of SECTIONS) {
    if (!SCORED_SECTION_CODES.includes(section.code)) continue;
    const codes = questionsOfSection(section.code)
      .filter((q) => q.scored)
      .map((q) => q.code);
    if (codes.length === 0) continue;
    const mean = meanOf(
      codes.map((c) => answers[c]).filter((v): v is number => typeof v === "number"),
    );
    if (mean !== null) sections[section.code] = toHundred(mean);
  }

  const allMean = meanOf(
    SCORED_QUESTIONS.map((q) => answers[q.code]).filter((v): v is number => typeof v === "number"),
  );

  return { overall: allMean === null ? null : toHundred(allMean), sections };
}

/**
 * 점수 구간(0~100). 색만으로 의미를 전달하지 않도록 어디서 쓰든 label 을 함께 표시합니다.
 * 색상은 dataviz 상태 팔레트(good / serious / critical)와 중립 톤을 사용합니다.
 */
export interface Tone {
  label: string;
  dot: string;
  bg: string;
  ink: string;
}

export const TONE_NONE: Tone = { label: "응답 없음", dot: "#c3c2b7", bg: "#f0efec", ink: "#52514e" };

export function scoreTone(score: number | null | undefined): Tone {
  if (score === null || score === undefined || !Number.isFinite(score)) return TONE_NONE;
  if (score >= 70) return { label: "양호", dot: "#0ca30c", bg: "#e7f6e7", ink: "#056b05" };
  if (score >= 55) return { label: "보통", dot: "#898781", bg: "#f0efec", ink: "#52514e" };
  if (score >= 40) return { label: "주의", dot: "#ec835a", bg: "#fdeee7", ink: "#93441f" };
  return { label: "위험", dot: "#d03b3b", bg: "#fbeaea", ink: "#9c2b2b" };
}

/** 순차(sequential) 파랑 램프. 옅을수록 낮은 점수입니다. */
export function sequentialFill(score: number | null | undefined): { fill: string; ink: string } {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return { fill: "#f0efec", ink: "#898781" };
  }
  if (score >= 85) return { fill: "#184f95", ink: "#ffffff" };
  if (score >= 75) return { fill: "#256abf", ink: "#ffffff" };
  if (score >= 65) return { fill: "#3987e5", ink: "#ffffff" };
  if (score >= 55) return { fill: "#86b6ef", ink: "#0b0b0b" };
  if (score >= 45) return { fill: "#b7d3f6", ink: "#0b0b0b" };
  return { fill: "#cde2fb", ink: "#0b0b0b" };
}

/** 차트 마크와 크롬에 쓰는 고정 색. */
export const VIZ = {
  series: "#2a78d6",
  track: "#f0efec",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
  surface: "#ffffff",
} as const;

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || !Number.isFinite(score)) return "—";
  return score.toFixed(1);
}

export function formatDelta(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return "";
  const sign = delta > 0 ? "▲" : delta < 0 ? "▼" : "－";
  return `${sign} ${Math.abs(delta).toFixed(1)}`;
}
