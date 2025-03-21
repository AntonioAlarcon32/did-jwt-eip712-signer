import { Signer, SigningKey, type TypedDataDomain, Wallet } from 'ethers'
import { jsonToSolidityTypes } from '@juanelas/solidity-types-from-json'
import { decodeJWT, AbstractSigner } from 'did-jwt'

const supportedAlgorithms = ['EIP712']

export class Eip712Signer extends AbstractSigner {
  private readonly signer: Signer

  static supportedAlgorithms?: string[] = supportedAlgorithms
  constructor (privateKey: SigningKey, domain?: TypedDataDomain)
  constructor (privateKeyHex: string, domain?: TypedDataDomain)
  constructor (ethersSigner: Signer, domain?: TypedDataDomain)

  constructor (privateKeyOrSigner: SigningKey | string | Signer) {
    super()

    if (privateKeyOrSigner instanceof SigningKey) {
      this.signer = new Wallet(privateKeyOrSigner)
    } else if (typeof privateKeyOrSigner === 'string') {
      this.signer = new Wallet(privateKeyOrSigner)
    } else {
      this.signer = privateKeyOrSigner
    }
  }

  async sign (data: string | Uint8Array, algorithm: string): Promise<string> {
    if (algorithm !== 'EIP712') {
      throw new Error(`Unsupported algorithm: ${algorithm}`)
    }

    if (data instanceof Uint8Array) {
      data = new TextDecoder().decode(data)
    }
    let dataObj: Record<string, any>
    let domain: TypedDataDomain
    try {
      dataObj = JSON.parse(data)
      // Check for the domain
      if (dataObj.domain === undefined) {
        throw new Error('Domain should be included in the data')
      }
      domain = dataObj.domain as TypedDataDomain
    } catch (e) {
      const fakeDataStr = data + '.fakesignature'
      // Check if the data is a JWT in format b64header.b64payload
      const parts = fakeDataStr.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format')
      }
      const { header, payload } = decodeJWT(fakeDataStr)
      dataObj = { header, payload }
      // Check for the domain
      if (header.alg !== 'EIP712') {
        throw new Error('Invalid JWT algorithm')
      }
      if (dataObj.payload.domain === undefined) {
        throw new Error('Domain should be included in the payload')
      }
      domain = dataObj.payload.domain as TypedDataDomain
    }
    const types = jsonToSolidityTypes(dataObj, { mainTypeName: 'JWT' })
    const solidityTypes = types.types

    return await this.signer.signTypedData(domain, solidityTypes, dataObj)
  }
}
