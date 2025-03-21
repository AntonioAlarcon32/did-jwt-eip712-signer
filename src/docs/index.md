[![License: {{PKG_LICENSE}}](https://img.shields.io/badge/License-{{PKG_LICENSE}}-yellow.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
{{BADGES}}

# Skeleton for developing modules for browser and Node.js in Typescript

> This entire section with all its subsections (Installation, Tooling, Scripts) should be removed from your `src/docs/index.md` after installing. The rest of sections may be useful for your package readme, and you may just modify them in `src/docs/index.md` to meet your needs.

This is a skeleton for developing JS modules in Typescript that work both in Node.js and native JavaScript. The idea is that you should just focus on developing your typescript code in the `src/ts` folder, and the necessary JS files and bundles will be created so that it can be used with no effort in every environment.

You can use string variable `IS_BROWSER` to create specific code for native JS or Node. For example:

```typescript
if (IS_BROWSER === 'true') {
  // browser specific code here
} else {
  // node.js specific code here
}
```

Besides the actual code, you should create unit testing (mocha+chai) files either in the `test` or the `src/ts` directory, although in the latter case only files ending with `.spec.ts` or `.test.ts` will be considered as test files.

When creating the tests, you MUST NOT import either `mocha` or `chai`, since they have been automatically added to the global scope. You MUST IMPORT your module with the shortcut `#pkg`. In short:

- `mocha` global variable points to mocha;
- `chai` points to chai;
- `#pkg` points to your package (all your JavaScript exports). Use it instead any relative import when importing your module in your tests (it must be first built with `npm run build:js`). For instance:

    ```typescript
    import * as myModule from '#pkg'
    ...
    ```

You can also use a `.env` file with environment variables that can be accessed in `process.env` in your tests' source files running both in node and browser javascript.

> If you want your module typings to be compatible with `node16` and `nodenext` module resolution (which require extensions for relative imports), please consider adding the `.js` to any relative import you are using. For instance:
>
> ```typescript
> import { myFn } from './utils.js'
> ```
>
> or:
>
> ```typescript
> import { myFn } from './utils/index.js'
> ```
>
> instead of
>
> ```typescript
> import { myFn } from './utils'
> ```
>

## Installation

Clone this repo to your desired project directory (`my-project` in the following example) and reset the git.

```console
git clone https://github.com/juanelas/node-browser-skel.git my-project
cd my-project
rm -rf .git
git init
git add -A
```

Edit `package.json` keys: `name`, `description`, `keywords`, `author`, `repository` (or delete line if you do not have one), and `license` (if you change license type, please update `LICENSE` file with your chosen one).

In `package.json`->`nodeBrowserSkel` you can configure things like the default branch for the workflows, the badges to appear in the readme and whether to sync with <https://coveralls.io/> as part of the github workflow after a new version push.

Initialize the project with:

```console
npm i
npm update
npm run build
```

The `README.md` file is automatically generated from the `src/docs/index.md` file. EDIT `src/docs/index.md` and rewrite it to your heart's content. Recall removing the section "Skeleton for developing modules for browser and Node.js in Typescript" with all its subsections (Installation, Tooling, Scripts).

## Tooling

- Build: [Rollup](https://rollupjs.org) is used for generating in the `dist` directory UMD, IIFE, ESM and CJS modules with the corresponding Typescript declaration files and sourcemaps.
- Coverage: [c8](https://github.com/bcoe/c8#c8---native-v8-code-coverage) is used to track how well your unit-tests exercise your codebase.
- Doc: [TsCode](https://tsdoc.org/) is used for automatically generating the [API docs](../../docs/API.md). Consider documenting your code with TsCode for it to be useful.
- Lint: [ts-stamdard](https://github.com/standard/ts-standard) is the chosen linter, although you can easily change it by any other linter (update the `lint` script in the `package.json`). If developing with [Visual Studio Code](https://code.visualstudio.com/), consider installing the [Standard-JS extension](https://marketplace.visualstudio.com/items?itemName=standard.vscode-standard) and select `ts-standard` as the `Standard:engine` in the extension settings.
- Test: [Mocha](https://mochajs.org/) with [Chai](https://www.chaijs.com/) running both in Node.js and browser (using [puppeteer](https://pptr.dev/)). Test files should be created assuming that Mocha methods and Chai are declared global, so there is no need to import them (see the provided test examples). There is also no need to create separate test files for browser and Node.js, since every file will be tested against both.

## Scripts

- `npm run build`. First runs the linter (same as `npm run lint`), then builds the JS files (`npm run build:js`), and finally builds the `README.md` and the API doc `./docs/API.md` (`npm run docs`). See the specific scripts for more details.
- `npm run build:js`. Creates your distributable module files (UMD, IIFE, ESM and CJS), along with the sourcemap and typescript declaration files in the `dist` directory.
- `npm run clean`. Cleans all the artefacts created by the rest of the script (most likely not needed).
- `npm run coverage`. Runs all the unit tests (`src/**/*.spec.ts`, `src/**/*.test.ts` and `test/**/*.ts`) in Node.js and track how well they exercise your codebase. Besides the on-screen summary, a complete report in HTML will be generated in the `coverage` directory.
- `npm run docs`. Generates the `README.md` and the API doc `./docs/API.md` (consider documenting your exported classes/functions using [TSDoc](https://tsdoc.org/) for a meaningful API doc). Some labels in the `src/README.md` file will be automatically replaced in the generated `README.md`:

  - &#123;&#123;PKG_NAME&#125;&#125; is automatically replaced with property `name` in `package.json` file.
  - &#123;&#123;PKG_NAME_NO_SCOPE&#125;&#125; is automatically replaced with property `name` in `package.json` file without the scope. E.g. `@juanelas/my-pkg` would become `my-pkg`.
  - &#123;&#123;PKG_DESCRIPTION&#125;&#125; is automatically replaced with property `description` in `package.json` file.
  - &#123;&#123;PKG_CAMELCASE&#125;&#125; will be replaced by a camel case transformation of the package name.
  - &#123;&#123;IIFE_BUNDLE&#125;&#125; will point to the IIFE bundle file if using github or gitlab as repository.
  - &#123;&#123;ESM_BUNDLE&#125;&#125; will point to the ESM bundle file if using github or gitlab as repository.
  - &#123;&#123;UMD_BUNDLE&#125;&#125; will point to the UMD bundle file if using github or gitlab as repository.
  - It has also some automatically added badges (see the top of this file), that you can remove if desired.

- `npm run lint`. Uses the `ts-standard` linter to fix all the project files. If uncomfortable, change the linter for the one of your liking.
- `npm run mocha-ts -- <glob>`. Runs Node.js mocha for the selected tests (use glob pattern) using the **ESM version**. If `glob` is empty, it will test all the tests. Add `--watch` before the glob to start mocha in watch mode.
- `npm run mocha-ts:cjs -- <glob>`. Runs Node.js mocha for the selected tests (use glob pattern) using the **CJS version**. If `glob` is empty, it will test all the tests. Add `--watch` before the glob to start mocha in watch mode.
- `npm run mocha-ts:browser`. Runs all mocha tests n a browser (using puppeteer) for the selected tests (use glob pattern).
- `npm run mocha-ts:browser-headless`. Silently runs all mocha tests in a browser but without opening a browser window (results will be shown in the node's console). This is useful for just running tests (no debugging).
- `npm test`. Runs all the unit tests (`src/**/*.spec.ts`, `src/**/*.test.ts` and `test/**/*.ts`) for the ESM and CJS modules in Node.js, and the ESM module bundle in a browser (using puppeteer).
- `npm run test:browser`. Runs all the unit tests (`src/**/*.spec.ts`, `src/**/*.test.ts` and `test/**/*.ts`) in a browser (using puppeteer). Until the browser window is closed, you can debug the tests.
- `npm run test:browser-headless`. Runs all the unit tests (`src/**/*.spec.ts`, `src/**/*.test.ts` and `test/**/*.ts`) in a browser (using puppeteer) but without opening a windows (results will be shown in the node's console). This is useful for just running tests (no debugging).
- `npm run test:node`. Runs all the unit tests (`src/**/*.spec.ts`, `src/**/*.test.ts` and `test/**/*.ts`) for the ESM and CJS modules in Node.js.
- `npm run watch -- <spec>`. Likely to be the default script during development. Tests are automatically reexecuted whenever a test or source file changes. You can optionally pass in `<spec>` one or more files, directories, or globs to test (default: `"{src/ts/**/*.spec.ts,src/ts/**/*.test.ts,test/**/*.ts}"`)

# {{PKG_NAME}}

{{PKG_DESCRIPTION}}

- [Install and use](#install-and-use)
- [Usage example](#usage-example)
- [API reference documentation](#api-reference-documentation)

## Install and use

`{{PKG_NAME}}` can be imported to your project with `npm`:

```console
npm install {{PKG_NAME}}
```

Then either require (Node.js CJS):

```javascript
const {{PKG_CAMELCASE}} = require('{{PKG_NAME}}')
```

or import (JavaScript ES module):

```javascript
import * as {{PKG_CAMELCASE}} from '{{PKG_NAME}}'
```

> The appropriate version for browser or node should be automatically chosen when importing. However, if your bundler does not import the appropriate module version (node esm, node cjs or browser esm), you can force it to use a specific one by just importing one of the followings:
>
> - `{{PKG_NAME}}/dist/cjs/index.node`: for Node.js CJS module
> - `{{PKG_NAME}}/dist/esm/index.node`: for Node.js ESM module
> - `{{PKG_NAME}}/dist/esm/index.browser`: for browser ESM module
>
> If you are coding TypeScript, types will not be automatically detected when using the specific versions. You can easily get the types in by creating and importing to your TS project a new types declaration file `{{PKG_NAME_NO_SCOPE}}.d.ts` with the following line:
>
> ```typescript
> declare module '{{PKG_NAME}}/dist/esm/index.browser' // use the specific module file you are importing
> ```

{{BROWSER_BUNDLES_INSTALLATION}}

## Usage example

```typescript
YOUR TYPESCRIPT EXAMPLE CODE HERE
```

## API reference documentation

[Check the API](../../docs/API.md)
