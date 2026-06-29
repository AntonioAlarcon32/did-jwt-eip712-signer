import { jsonToSolidityTypes } from '@juanelas/solidity-types-from-json'
import { AbstractVerifier, decodeJWT } from 'did-jwt'
import { type VerificationMethod } from 'did-resolver'
import { type TypedDataDomain, verifyTypedData } from 'ethers'

const verificationMethods: string[] = [
  'EcdsaSecp256k1VerificationKey2019',
  'EcdsaSecp256k1RecoveryMethod2020',
  'Secp256k1VerificationKey2018',
  'Secp256k1SignatureVerificationKey2018',
  'EcdsaPublicKeySecp256k1'
]

export interface Eip712VerifierOptions {
  /**
   * Pins expected values for EIP-712 domain fields. Any field set here must match the
   * `domain` carried in the JWT payload exactly, otherwise verification fails before
   * the signature is even checked. Use this to stop tokens signed under a different
   * application domain (name/version/verifyingContract) from being replayed here.
   * `chainId` presence is always required regardless of this option.
   */
  expectedDomain?: Pick<TypedDataDomain, 'name' | 'version' | 'chainId' | 'verifyingContract'>
}

export class Eip712Verifier extends AbstractVerifier {
  static supportedAlgorithmsAndVerificationMethods: Record<string, string[]> = {
    EIP712: verificationMethods
  }

  private readonly expectedDomain?: Eip712VerifierOptions['expectedDomain']

  constructor (options: Eip712VerifierOptions = {}) {
    super()
    this.expectedDomain = options.expectedDomain
  }

  private checkDomainPolicy (domain: TypedDataDomain): void {
    if (this.expectedDomain === undefined) return
    const mismatches: string[] = []
    const { name, version, chainId, verifyingContract } = this.expectedDomain
    if (name != null && domain.name !== name) {
      mismatches.push(`name "${String(domain.name)}" != "${name}"`)
    }
    if (version != null && domain.version !== version) {
      mismatches.push(`version "${String(domain.version)}" != "${version}"`)
    }
    if (chainId != null && domain.chainId?.toString() !== chainId.toString()) {
      mismatches.push(`chainId "${String(domain.chainId)}" != "${chainId.toString()}"`)
    }
    if (
      verifyingContract != null &&
      domain.verifyingContract?.toLowerCase() !== verifyingContract.toLowerCase()
    ) {
      mismatches.push(`verifyingContract "${String(domain.verifyingContract)}" != "${verifyingContract}"`)
    }
    if (mismatches.length > 0) {
      // deliberately NOT `invalid_signature`: a domain policy failure is the same for
      // every authenticator, so verifyJWT should abort rather than retry
      throw new Error(`Domain policy violation: ${mismatches.join('; ')}`)
    }
  }

  getSupportedVerificationMethods (alg?: string): string[] {
    if (alg === 'EIP712') {
      return verificationMethods
    }
    return []
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

    const fullJwt = data + '.' + signature
    const { header, payload } = decodeJWT(fullJwt)

    if (header.alg !== 'EIP712') {
      throw new Error('Invalid JWT algorithm')
    }
    if (payload.domain === undefined || payload.domain === null) {
      throw new Error('Domain should be included in the payload')
    }
    const domain = payload.domain as TypedDataDomain
    if (domain.chainId === undefined || domain.chainId === null) {
      throw new Error('Domain must include chainId to prevent cross-chain replay')
    }
    const domainChainId = domain.chainId.toString()
    this.checkDomainPolicy(domain)

    const dataObj = { header, payload }
    const { types } = jsonToSolidityTypes(dataObj, { mainTypeName: 'JWT' })
    const recoveredAddress = verifyTypedData(domain, types, dataObj, signature).toLowerCase()

    const matched = authenticators.find(authenticator => {
      if (typeof authenticator.blockchainAccountId === 'string') {
        const parts = authenticator.blockchainAccountId.split(':')
        if (parts.length !== 3) return false
        const [, chainId, address] = parts
        return address.toLowerCase() === recoveredAddress && chainId === domainChainId
      }
      if (typeof authenticator.ethereumAddress === 'string') {
        return authenticator.ethereumAddress.toLowerCase() === recoveredAddress
      }
      return false
    })

    if (matched === undefined) {
      const hasAddressed = authenticators.some(a =>
        typeof a.blockchainAccountId === 'string' || typeof a.ethereumAddress === 'string'
      )
      // `invalid_signature` lets did-jwt's verifyJWT loop move on to the next
      // authenticator instead of aborting on mixed-key DID documents
      if (!hasAddressed) {
        throw new Error('invalid_signature: No available authenticators with an Ethereum address')
      }
      throw new Error('invalid_signature: Signature verification failed: no authenticator matched the recovered address')
    }
    return matched
  }
}
