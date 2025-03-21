'use strict'

const fs = require('fs')
const TypeDoc = require('typedoc')
const path = require('path')
const json5 = require('json5')
const pkgJson = require('../package.json')
const rimraf = require('rimraf')

const rootDir = path.join(__dirname, '..')

const templateFilePath = path.join(rootDir, pkgJson.directories.src, 'docs/index.md')
let template = fs.readFileSync(templateFilePath, { encoding: 'utf-8' })

async function main () {
  // Generate API doc with typedoc
  await typedoc()

  // Translate relaitive links to project's root
  replaceRelativeLinks()

  // Let us replace variables and badges
  variableReplacements()

  const readmeFile = path.join(rootDir, 'README.md')
  fs.writeFileSync(readmeFile, template)
}

main()
/* ------------------------------------------------------------------------- |
|                               UTILITY FUNCTIONS                            |
| ------------------------------------------------------------------------- */

function camelise (str) {
  return str.replace(/-([a-z])/g,
    function (m, w) {
      return w.toUpperCase()
    })
}

async function typedoc () {
  // prepare tsconfig
  const tsConfigPath = path.join(rootDir, 'tsconfig.json')
  const tempTsConfigPath = path.join(rootDir, '.tsconfig.json')

  const tsConfig = json5.parse(fs.readFileSync(tsConfigPath, 'utf8'))
  tsConfig.include = ['src/ts/**/*', 'build/typings/**/*.d.ts']
  tsConfig.exclude = ['src/**/*.spec.ts', 'src/**/*.test.ts']
  fs.writeFileSync(tempTsConfigPath, JSON.stringify(tsConfig, undefined, 2))

  const app = await TypeDoc.Application.bootstrapWithPlugins({
    // typedoc options here
    tsconfig: tempTsConfigPath,
    entryPoints: ['src/ts/index.ts'],
    entryFileName: 'API',
    disableSources: true,
    plugin: ['typedoc-plugin-markdown'],
    includeVersion: true,
    readme: 'none',
    hideBreadcrumbs: true,
    hidePageHeader: true,
    excludePrivate: true,
    outputFileStrategy: 'modules',
    indexFormat: 'table',
    parametersFormat: 'table',
    interfacePropertiesFormat: 'table',
    classPropertiesFormat: 'table',
    enumMembersFormat: 'table',
    typeDeclarationFormat: 'table',
    propertyMembersFormat: 'table',
    router: 'module'
  })
  // If you want TypeDoc to load tsconfig.json / typedoc.json files
  app.options.addReader(new TypeDoc.TSConfigReader())
  // app.options.addReader(new TypeDoc.TypeDocReader())

  const project = await app.convert()

  if (project) { // Project may not have converted correctly
    const output = path.join(rootDir, './docs')
    // Render docs
    await app.generateDocs(project, output)
  }

  rimraf.sync(tempTsConfigPath)
}

function getRepositoryData () {
  let ret
  if (typeof pkgJson.repository === 'string') {
    const repodata = pkgJson.repository.split(/[:/]/)
    const repoProvider = repodata[0]
    if (repoProvider === 'github' || repoProvider === 'gitlab' || repoProvider === 'bitbucket') {
      ret = {
        repoProvider,
        repoUsername: repodata[1],
        repoName: repodata.slice(2).join('/')
      }
    }
  } else if (typeof pkgJson.repository === 'object' && pkgJson.repository.type === 'git' && pkgJson.repository.url !== 'undefined') {
    const regex = /(?:.+?\+)?http[s]?:\/\/(?<repoProvider>[\w._-]+)\.\w\w+\/(?<repoUsername>[\w._-]+)\/(?<repoName>[\w._\-/]+?)\.git/
    const match = pkgJson.repository.url.match(regex)
    ret = {
      repoProvider: match[1],
      repoUsername: match[2],
      repoName: match[3],
      repoDirectory: pkgJson.repository.directory
    }
  }
  if (typeof ret === 'object') {
    if (typeof pkgJson.nodeBrowserSkel === 'object' && typeof pkgJson.nodeBrowserSkel.git === 'object' && typeof pkgJson.nodeBrowserSkel.git.branch === 'string') {
      ret.branch = pkgJson.nodeBrowserSkel.git.branch
    } else {
      ret.branch = (ret.repoProvider === 'github') ? 'main' : 'master'
    }
  }
  return ret
}

function variableReplacements () {
  const { repoProvider, repoUsername, repoName } = getRepositoryData() || {}

  const regex = /^(?:(?<scope>@.*?)\/)?(?<name>.*)/ // We are going to take only the package name part if there is a scope, e.g. @my-org/package-name
  const { name } = pkgJson.name.match(regex).groups
  const camelCaseName = camelise(name)

  let useWorkflowBadge = false
  let useCoverallsBadge = false
  if (pkgJson.nodeBrowserSkel !== undefined && pkgJson.nodeBrowserSkel.badges !== undefined) {
    if (pkgJson.nodeBrowserSkel.badges.workflow === true) {
      useWorkflowBadge = true
    }
    if (pkgJson.nodeBrowserSkel.badges.coveralls === true) {
      useCoverallsBadge = true
    }
  }

  let workflowBadge, coverallsBadge
  let browserBundlesInstallation = 'You can also build the project with `npm run build` and get the ESM, IIFE and/or UMD module files fomr `' + pkgJson.directories.bundles + '`.'

  if (repoProvider) {
    switch (repoProvider) {
      case 'github':
        browserBundlesInstallation = `You can also download browser ESM, IIFE and UMD bundles directly from the [releases' page](https://github.com/${repoUsername}/${repoName}/releases) and manually add them to your project.`
        workflowBadge = useWorkflowBadge ? `[![Build and test](https://github.com/${repoUsername}/${repoName}/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/${repoUsername}/${repoName}/actions/workflows/build-and-test.yml)` : undefined
        coverallsBadge = useCoverallsBadge ? `[![Coverage Status](https://coveralls.io/repos/github/${repoUsername}/${repoName}/badge.svg?branch=refs/tags/v0.1.5)](https://coveralls.io/github/${repoUsername}/${repoName}?branch=refs/tags/v${pkgJson.version})` : undefined
        break

      default:
        break
    }
  }

  template = template
    .replace(/\{\{PKG_NAME\}\}/g, pkgJson.name)
    .replace(/\{\{PKG_NAME_NO_SCOPE\}\}/g, name)
    .replace(/\{\{PKG_LICENSE\}\}/g, pkgJson.license.replace('-', '_'))
    .replace(/\{\{PKG_DESCRIPTION\}\}/g, pkgJson.description)
    .replace(/\{\{PKG_CAMELCASE\}\}/g, camelCaseName)
    .replace(/\{\{BROWSER_BUNDLES_INSTALLATION\}\}/g, browserBundlesInstallation)

  if (repoProvider && repoProvider === 'github') {
    template = template.replace(/\{\{BADGES\}\}\n/gs, (workflowBadge ? `${workflowBadge}\n` : '') + (coverallsBadge ? `${coverallsBadge}\n` : ''))
  } else {
    template = template.replace(/\{\{BADGES\}\}\n/gs, '')
  }
}

function replaceRelativeLinks () {
  const replacements = []
  const relativePathRegex = /(\[[\w\s\d]+\]\()(?!(?:http:\/\/)|(?:https:\/\/))([\w\d;,/?:@&=+$-_.!~*'()\\#]+)\)/g
  const matches = template.matchAll(relativePathRegex)
  if (matches) {
    for (const match of matches) {
      const index = (match.index ?? 0) + match[1].length
      const filepath = match[2]
      if (!path.isAbsolute(filepath)) {
        const absoluteFilePath = path.join(path.dirname(templateFilePath), filepath)
        if (!fs.existsSync(absoluteFilePath)) {
          console.warn(`File ${absoluteFilePath} is linked in your index.md but it does not exist. Ignoring`)
        } else {
          const replacement = path.relative(rootDir, absoluteFilePath)
          replacements.push({ index, length: filepath.length, replacement })
        }
      }
    }
    const sortedReplacements = replacements.sort((a, b) => a.index - b.index)
    let ret = ''
    let index = 0
    for (const replacement of sortedReplacements) {
      ret += template.slice(index, replacement.index)
      ret += replacement.replacement
      index = replacement.index + replacement.length
    }
    ret += template.slice(index)
    template = ret
  }
}
