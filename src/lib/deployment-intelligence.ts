export const DEPLOYMENT_TAXONOMY_VERSION = "dep-v1-2026-10-07";

export const DEPLOYMENT_CATEGORIES = [
  { code: "A", name: "Script / Code Error", description: "SQL, syntax, script naming or executable code defects." },
  { code: "B", name: "Schema / Data Type", description: "Schema, source/target structure or data-type mismatch." },
  { code: "C", name: "Framework Config / Metadata", description: "Framework configuration, metadata, dependency or workflow configuration." },
  { code: "D", name: "Git / Version Control", description: "Wrong version, missing merge, manual file handoff or deployed source not matching Git." },
  { code: "E", name: "Documentation / MOP", description: "MOP/checklist/document content missing or inconsistent with actual deployment." },
  { code: "F", name: "Data Validation", description: "Row counts, post-deploy validation, data completeness or reconciliation issues." },
  { code: "G", name: "Environment / Access", description: "Environment readiness, S3/network/schema permissions or deployment access." },
] as const;

export type DeploymentCategoryCode = (typeof DEPLOYMENT_CATEGORIES)[number]["code"];

export const DEPLOYMENT_OUTCOMES = [
  { value: "SUCCESS", label: "Success" },
  { value: "PARTIAL_SUCCESS", label: "Partial Success" },
  { value: "FAILED", label: "Failed" },
  { value: "ROLLBACK", label: "Rollback" },
  { value: "POSTPONED", label: "Postponed" },
] as const;

export const SERVICE_REQUEST_TYPES = [
  { value: "PATCH_DATA", label: "Patch Data" },
  { value: "UPDATE_CONFIG", label: "Update Config" },
  { value: "REPROCESS", label: "Reprocess / Rerun" },
  { value: "OTHER", label: "Other" },
] as const;

export type StandardRule = {
  id: string;
  columnPattern: RegExp;
  label: string;
  characteristic: string;
  blendata: string;
  vertica: string;
  oracle: string;
  notes?: string;
};

export const DATA_TYPE_STANDARD_RULES: StandardRule[] = [
  { id: "numeric-id", columnPattern: /(^|_)(ID|KEY)($|_)/i, label: "ID / KEY (numeric)", characteristic: "Numeric identifier / integer key", blendata: "INT / BIGINT", vertica: "INT / BIGINT", oracle: "NUMBER(10,0) / NUMBER(19,0)", notes: "Use BIGINT when the identifier can reach 10+ digits. Legacy character IDs are an exception." },
  { id: "subscriber-id", columnPattern: /^(SUBCRPN_ID|SUBR_ID)$/i, label: "SUBCRPN_ID / SUBR_ID", characteristic: "Subscriber identifier", blendata: "BIGINT", vertica: "BIGINT", oracle: "NUMBER(19,0)" },
  { id: "quantity", columnPattern: /QUANTITY/i, label: "QUANTITY", characteristic: "Count / quantity", blendata: "INT / BIGINT", vertica: "INT / BIGINT", oracle: "NUMBER(10,0) / NUMBER(19,0)", notes: "Use BIGINT when values can reach 10+ digits." },
  { id: "indicator", columnPattern: /INDICATOR/i, label: "INDICATOR", characteristic: "1 / 0", blendata: "INT", vertica: "INT", oracle: "NUMBER(1,0)" },
  { id: "tm-day", columnPattern: /^TM_KEY_DAY$/i, label: "TM_KEY_DAY", characteristic: "YYYYMMDD", blendata: "INT", vertica: "INT", oracle: "NUMBER(8,0)" },
  { id: "tm-mth", columnPattern: /^TM_KEY_MTH$/i, label: "TM_KEY_MTH", characteristic: "YYYYMM", blendata: "INT", vertica: "INT", oracle: "NUMBER(6,0)" },
  { id: "tm-yr", columnPattern: /^TM_KEY_YR$/i, label: "TM_KEY_YR", characteristic: "YYYY", blendata: "INT", vertica: "INT", oracle: "NUMBER(4,0)" },
  { id: "tm-hh", columnPattern: /^TM_KEY_HH$/i, label: "TM_KEY_HH", characteristic: "YYYYMMDDHH24", blendata: "INT", vertica: "INT", oracle: "NUMBER(10,0)" },
  { id: "tm-wk", columnPattern: /^TM_KEY_WK$/i, label: "TM_KEY_WK", characteristic: "YYYYMMWW", blendata: "INT", vertica: "INT", oracle: "NUMBER(8,0)" },
  { id: "true-week", columnPattern: /^TRUE_WEEK$/i, label: "TRUE_WEEK", characteristic: "YYYY0WW e.g. 2026001", blendata: "INT", vertica: "INT", oracle: "NUMBER(7,0)" },
  { id: "ratio", columnPattern: /RATIO/i, label: "RATIO", characteristic: "Ratio value", blendata: "DECIMAL(20,8)", vertica: "DECIMAL(20,8)", oracle: "NUMBER(20,8)" },
  { id: "percentage", columnPattern: /PERCENT(AGE)?/i, label: "PERCENTAGE", characteristic: "Percentage value", blendata: "DECIMAL(20,8)", vertica: "DECIMAL(20,8)", oracle: "NUMBER(20,8)" },
  { id: "amount", columnPattern: /AMOUNT/i, label: "AMOUNT", characteristic: "Fact / aggregate money value", blendata: "DECIMAL(20,4)", vertica: "DECIMAL(20,4)", oracle: "NUMBER(20,4)", notes: "For tier/source-specific amount fields, precision/scale may follow the source contract." },
  { id: "volume", columnPattern: /DATA_VOLUME|VOLUME/i, label: "DATA_VOLUME", characteristic: "KB / MB / GB or continuous volume", blendata: "DOUBLE", vertica: "DOUBLE PRECISION", oracle: "NUMBER (up to 38 digits)" },
  { id: "average", columnPattern: /AVERAGE|AVG/i, label: "AVERAGE", characteristic: "Average, excluding money", blendata: "DOUBLE", vertica: "DOUBLE PRECISION", oracle: "NUMBER (up to 38 digits)" },
  { id: "flag", columnPattern: /(^|_)FLAG($|_)/i, label: "FLAG", characteristic: "Y / N", blendata: "STRING", vertica: "VARCHAR(1)", oracle: "VARCHAR2(1)" },
  { id: "date", columnPattern: /(^|_)DATE($|_)/i, label: "DATE", characteristic: "Date without time", blendata: "DATE", vertica: "DATE", oracle: "DATE" },
  { id: "timestamp", columnPattern: /DATE_TIME|TIMESTAMP|DATETIME/i, label: "DATE + TIME", characteristic: "Date and time", blendata: "TIMESTAMP", vertica: "TIMESTAMP", oracle: "TIMESTAMP" },
  { id: "latlong", columnPattern: /(LATITUDE|LONGITUDE|LONGTITUDE)/i, label: "LATITUDE / LONGITUDE", characteristic: "Coordinate", blendata: "DECIMAL(10,7)", vertica: "DECIMAL(10,7)", oracle: "NUMBER(10,7)" },
  { id: "text", columnPattern: /(NAME|DESCRIPTION|ADDRESS|CODE|TYPE)/i, label: "Text / code field", characteristic: "Character content", blendata: "STRING", vertica: "VARCHAR(N)", oracle: "VARCHAR2(N)", notes: "N should follow the source length; Thai/emoji fields remain character types." },
];

export function findDataTypeStandards(columnName: string) {
  const value = columnName.trim();
  if (!value) return [];
  return DATA_TYPE_STANDARD_RULES.filter((rule) => rule.columnPattern.test(value));
}

function normalizeType(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace("DOUBLEPRECISION", "DOUBLEPRECISION");
}

export function compareStandardType(actual: string, expected: string) {
  const a = normalizeType(actual);
  const options = expected.split("/").map((x) => normalizeType(x));
  if (!a) return "unknown" as const;
  if (options.some((e) => a === e || (e.includes("(N)") && a.startsWith(e.split("(")[0]!)))) return "match" as const;
  if (expected.includes("INT / BIGINT") && (a === "INT" || a === "INTEGER" || a === "BIGINT")) return "match" as const;
  return "review" as const;
}
