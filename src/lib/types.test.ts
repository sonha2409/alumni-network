import { describe, it, expect } from "vitest";
import type { ActionResult } from "./types";

describe("ActionResult type", () => {
  it("should represent a success result", () => {
    const result: ActionResult<string> = { success: true, data: "hello" };
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("hello");
    }
  });

  it("should represent an error result", () => {
    const result: ActionResult<string> = {
      success: false,
      error: "Something went wrong",
    };
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Something went wrong");
    }
  });

  it("should represent an error result with field errors", () => {
    const result: ActionResult = {
      success: false,
      error: "Validation failed",
      fieldErrors: { email: ["Invalid email format"] },
    };
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.email).toEqual(["Invalid email format"]);
    }
  });
});
