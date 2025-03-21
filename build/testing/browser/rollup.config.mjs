import { readFileSync } from 'fs'
import path, { join } from 'path'
import * as url from 'url'

import rollupConfig from '../../rollup.config.mjs'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const rootDir = join(__dirname, '../../..')
const pkgJson = JSON.parse(readFileSync(join(rootDir, 'package.json')))

const bundlesConfig = rollupConfig[1]

export default [
  {
    ...bundlesConfig,
    output: [
      {
        ...bundlesConfig.output[1],
        file: path.join(rootDir, pkgJson.directories.temp, 'esm.min.js'),
        sourcemap: true
      }
    ]
  }
]
