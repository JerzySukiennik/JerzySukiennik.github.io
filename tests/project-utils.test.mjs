import assert from "node:assert/strict";
import {
  safeProjectImageUrl,
  safeProjectUrl,
  toMillis,
} from "../js/project-utils.js";

assert.equal(toMillis(undefined, "2026"), Date.UTC(2026, 0, 1));
assert.equal(toMillis(undefined, "invalid"), 0);
assert.equal(toMillis("2025-06-12T00:00:00Z", "2026"), Date.parse("2025-06-12T00:00:00Z"));
assert.equal(toMillis({ seconds: 123 }, "2026"), 123000);

assert.equal(safeProjectUrl("https://example.com/play"), "https://example.com/play");
assert.equal(safeProjectUrl("http://localhost:8000/test"), "http://localhost:8000/test");
assert.equal(safeProjectUrl("javascript:alert(1)"), "");
assert.equal(safeProjectUrl("https://user:pass@example.com/"), "");
assert.equal(safeProjectUrl("not a URL"), "");

const validImage = "https://jerzysukiennik.github.io/project-images/gzowo-ai.jpg";
assert.equal(safeProjectImageUrl(validImage), validImage);
assert.equal(safeProjectImageUrl("http://jerzysukiennik.github.io/project-images/gzowo-ai.jpg"), "");
assert.equal(safeProjectImageUrl("https://example.com/project-images/gzowo-ai.jpg"), "");
assert.equal(safeProjectImageUrl("https://jerzysukiennik.github.io/other/gzowo-ai.jpg"), "");
assert.equal(safeProjectImageUrl("https://jerzysukiennik.github.io/project-images/subdir/file.jpg"), "");
assert.equal(safeProjectImageUrl("https://jerzysukiennik.github.io/project-images/file.jpg?x=1"), "");
assert.equal(safeProjectImageUrl("https://jerzysukiennik.github.io/project-images/%2e%2e%2fsecret"), "");

console.log("project-utils: 16 focused assertions passed");
