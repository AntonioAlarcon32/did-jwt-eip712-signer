import { jsonToSolidityTypes } from '@juanelas/solidity-types-from-json'
import { AbstractVerifier, decodeJWT } from 'did-jwt'
import { VerificationMethod } from 'did-resolver'
import { TypedDataDomain, verifyTypedData } from 'ethers'

const verificationMethods: string[] = [
  'EcdsaSecp256k1VerificationKey2019',

  'EcdsaSecp256k1RecoveryMethod2020',
  'Secp256k1VerificationKey2018',
  'Secp256k1SignatureVerificationKey2018',
  'EcdsaPublicKeySecp256k1'
]

export class Eip712Verifier extends AbstractVerifier {
  getSupportedVerificationMethods (alg?: string): string[] {
    return verificationMethods
  }

  verify (
    alg: string,
    data: string,
    signature: string,
    authenticators: VerificationMethod[]
  ): VerificationMethod {
    if (alg !== 'EIP712') {
      throw new Error(`Unsupported algorithm: ${alg}`)
    }

    const availableAuthenticators: boolean =
      authenticators.find((a: VerificationMethod) => {
        return (a.blockchainAccountId ?? a.ethereumAddress) !== undefined
      }) !== undefined

    if (!availableAuthenticators) {
      throw new Error('No available authenticators')
    }

    const fullJwt: string = data + '.' + signature
    const { header, payload } = decodeJWT(fullJwt)
    const dataObj = {
      header,
      payload
    }

    // Check correct algorithm in header
    if (header.alg !== 'EIP712') {
      throw new Error('Invalid JWT algorithm')
    }

    // Check for the domain
    if (payload.domain === undefined) {
      throw new Error('Domain should be included in the payload')
    }

    const domain = payload.domain as TypedDataDomain
    const types = jsonToSolidityTypes(dataObj, { mainTypeName: 'JWT' })
    const solidityTypes = types.types
    const signatureFormatted = signature
    const recoveredAddress = verifyTypedData(domain, solidityTypes, dataObj, signatureFormatted)
    const signer = authenticators.find(authenticator => {
      if (typeof authenticator.blockchainAccountId === 'string') {
        const [, chainId, address] = authenticator.blockchainAccountId.split(':')
        if (address.toLowerCase() === recoveredAddress.toLowerCase()) {
          if (domain?.chainId !== undefined && domain.chainId !== null) {
            return domain.chainId.toString() === chainId
          }
          return true
        }
      } else if (typeof authenticator.ethereumAddress === 'string') {
        if (domain.chainId !== undefined && domain.chainId !== null) {
          return authenticator.ethereumAddress.toLowerCase() === recoveredAddress.toLowerCase()
        }
      }
      return false
    })

    if (signer === undefined) {
      throw new Error('Signature verification failed')
    }
    return signer
  }
}
