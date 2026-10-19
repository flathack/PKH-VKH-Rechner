import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const lintRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
const commonjsRequire = createRequire(require.resolve("vite-plugin-commonjs"));
const dynamicRequire = createRequire(commonjsRequire.resolve("vite-plugin-dynamic-import"));

test("Beide Tooling-Pfade laden den Tinyglobby-Adapter statt fast-glob/braces", async () => {
  for (const consumer of [lintRequire, dynamicRequire]) {
    assert.equal(consumer.resolve("fast-glob"), require.resolve("fast-glob"));
  }
  const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
  for (const [path, pkg] of Object.entries(lock.packages)) {
    assert.doesNotMatch(path, /node_modules\/(braces|micromatch)$/);
    if (path.endsWith("node_modules/fast-glob")) {
      assert.equal(pkg.link, true);
      assert.equal(pkg.resolved, "tools/fast-glob-adapter");
    }
  }
});

test("Linter-Verzeichnisse und dynamische Imports behalten ihre Suchergebnisse", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "pkh-glob-"));
  try {
    await mkdir(join(cwd, "apps/site"), { recursive: true });
    await mkdir(join(cwd, "views/nested"), { recursive: true });
    for (const path of ["views/a.js", "views/b.ts", "views/.hidden.js", "views/no.txt", "views/nested/c.js"]) {
      await writeFile(join(cwd, path), "export default 1;");
    }
    const { sync, globSync } = require("fast-glob");
    assert.deepEqual(sync(["views/**/*.{js,ts}", "!**/nested/**"], { cwd }).sort(), ["views/a.js", "views/b.ts"]);
    assert.deepEqual(sync("views", { cwd }), []); // no implicit directory expansion
    assert.deepEqual(globSync("apps/*", { cwd, onlyDirectories: true }), ["apps/site"]);
    assert.throws(() => sync("*", { cwd, objectMode: true }), /Unsupported/);

    const { getRootDirs } = lintRequire("./utils/get-root-dirs.js");
    assert.deepEqual(getRootDirs({ cwd, settings: { next: { rootDir: `${cwd}/apps/*` } } }), [join(cwd, "apps/site")]);

    // Execute the actual consumer, including its generated brace-extension glob.
    const { globFiles } = dynamicRequire("vite-plugin-dynamic-import");
    const { parse } = dynamicRequire("acorn");
    const expression = '`./views/${name}`';
    const importeeNode = parse(`import(${expression})`, { ecmaVersion: "latest" }).body[0].expression.source;
    const result = await globFiles({ importeeNode, importExpression: expression,
      importer: join(cwd, "entry.js"), resolve: { tryResolve: async () => undefined },
      extensions: [".js", ".ts"], loose: false });
    assert.deepEqual(result.files.sort(), ["./views/a.js", "./views/b.ts"]);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
