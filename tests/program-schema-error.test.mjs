import test from "node:test";
import assert from "node:assert/strict";
import { isMissingProgramSchemaError } from "../program-schema-error.js";

test("only confirmed schema failures are classified as missing migration objects", () => {
  for (const error of [null, [], { message: "Failed to fetch" }, { code: "PGRST301", message: "JWT expired" }]) {
    assert.equal(isMissingProgramSchemaError(error), false);
  }
  for (const error of [
    { code: "42P01", message: "relation does not exist" },
    { code: "42703", message: "column does not exist" },
    { code: "PGRST202", message: "function missing from schema cache" },
  ]) {
    assert.equal(isMissingProgramSchemaError(error), true);
  }
});
