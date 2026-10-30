const fs = require('node:fs')
const path = require('node:path')
const yaml = require('js-yaml')

const openapiPath = path.resolve(__dirname, '../../../docs/openapi.yaml')
const openapiYaml = fs.readFileSync(openapiPath, 'utf8')
const openapiDocument = yaml.load(openapiYaml)

if (!openapiDocument || typeof openapiDocument !== 'object') {
  throw new Error('The OpenAPI document must contain a YAML object.')
}

module.exports = {
  openapiDocument,
  openapiPath,
  openapiYaml,
}
