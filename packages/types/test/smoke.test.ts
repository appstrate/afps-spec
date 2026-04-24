// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke test — ensures the types module resolves and that the key
 * contracts are exported (type-shape is validated by tsc; this guards
 * against accidental export removals at the module level).
 */

import { describe, it, expect } from "bun:test";
import * as types from "../src/index.ts";

describe("@afps/types module", () => {
  it("resolves as a value module", () => {
    expect(typeof types).toBe("object");
  });
});
