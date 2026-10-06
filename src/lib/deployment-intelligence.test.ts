import { describe, expect, it } from "vitest";
import {
  DEPLOYMENT_CATEGORIES,
  compareStandardType,
  findDataTypeStandards,
} from "./deployment-intelligence";

describe("deployment intelligence taxonomy and standards", () => {
  it("keeps DEP taxonomy as its own A-G namespace", () => {
    expect(DEPLOYMENT_CATEGORIES.map((x) => "DEP-" + x.code)).toEqual([
      "DEP-A","DEP-B","DEP-C","DEP-D","DEP-E","DEP-F","DEP-G",
    ]);
  });

  it("maps TM_KEY_DAY deterministically to INT", () => {
    const rule = findDataTypeStandards("TM_KEY_DAY")[0];
    expect(rule?.blendata).toBe("INT");
    expect(rule?.vertica).toBe("INT");
    expect(compareStandardType("INT", rule!.blendata)).toBe("match");
  });

  it("recognizes FLAG Y/N character convention", () => {
    const rule = findDataTypeStandards("ACTIVE_FLAG")[0];
    expect(rule?.blendata).toBe("STRING");
    expect(rule?.vertica).toBe("VARCHAR(1)");
  });

  it("uses DECIMAL(20,8) for percentage/ratio", () => {
    expect(findDataTypeStandards("conversion_percentage")[0]?.blendata).toBe("DECIMAL(20,8)");
    expect(findDataTypeStandards("risk_ratio")[0]?.vertica).toBe("DECIMAL(20,8)");
  });

  it("routes unknown columns to human review instead of guessing", () => {
    expect(findDataTypeStandards("mystery_payload")).toEqual([]);
  });
});
