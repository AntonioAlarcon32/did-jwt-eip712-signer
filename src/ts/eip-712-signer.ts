import { Signer, SigningKey, type TypedDataDomain, Wallet } from 'ethers'
import { jsonToSolidityTypes } from '@juanelas/solidity-types-from-json'
import { AbstractSigner } from 'did-jwt'

const supportedAlgorithms = ['EIP712']
const textDecoder = new TextDecoder()

// base64url → JSON without Buffer, so the signer runs in browsers too
// (atob is global in browsers and in Node ≥ 16)
const decodeJwtSegment = (segment: string): Record<string, any> => {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return JSON.parse(textDecoder.decode(bytes))
}

export class Eip712Signer extends AbstractSigner {
  private readonly signer: Signer

  static supportedAlgorithms?: string[] = supportedAlgorithms

  constructor (privateKey: SigningKey)
  constructor (privateKeyHex: string)
  constructor (ethersSigner: Signer)
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

    const input = typeof data === 'string' ? data : textDecoder.decode(data)
    const parts = input.split('.')
    if (parts.length !== 2) {
      throw new Error('Invalid JWT signing input: expected two base64url segments')
    }

    let header: Record<string, any>
    let payload: Record<string, any>
    try {
      header = decodeJwtSegment(parts[0])
      payload = decodeJwtSegment(parts[1])
    } catch {
      throw new Error('Invalid JWT signing input: header or payload is not valid base64url-encoded JSON')
    }

    if (header.alg !== 'EIP712') {
      throw new Error('Invalid JWT algorithm')
    }
    if (payload.domain === undefined || payload.domain === null) {
      throw new Error('Domain should be included in the payload')
    }
    const domain = payload.domain as TypedDataDomain

    const dataObj = { header, payload }
    const { types } = jsonToSolidityTypes(dataObj, { mainTypeName: 'JWT' })

    return await this.signer.signTypedData(domain, types, dataObj)
  }
}
