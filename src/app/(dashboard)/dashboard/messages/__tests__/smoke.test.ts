import fc from "fast-check";

// Smoke test: verifies fast-check is importable and vitest can run tests in this directory
test("fast-check smoke test", () => {
    fc.assert(
        fc.property(fc.integer(), (n) => {
            return typeof n === "number";
        })
    );
});
