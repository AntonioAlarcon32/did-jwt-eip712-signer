import { Eip712Signer, Eip712Verifier } from '#pkg'
import { SigningKey, Wallet, type TypedDataDomain } from 'ethers'
import { type VerificationMethod } from 'did-resolver'
import { jsonToSolidityTypes } from '@juanelas/solidity-types-from-json'
import {
  recoverTypedSignature,
  signTypedData,
  SignTypedDataVersion,
  type MessageTypes,
  type TypedMessage
} from '@metamask/eth-sig-util'

// did-jwt invokes signers with `b64u(header).b64u(payload)`
const b64u = (obj: object): string =>
  Buffer.from(JSON.stringify(obj)).toString('base64url')

const buildSigningInput = (header: object, payload: object): string =>
  `${b64u(header)}.${b64u(payload)}`

const expectThrowsAsync = async (
  fn: () => Promise<unknown>,
  msgPart?: string
): Promise<void> => {
  let err: Error | undefined
  try {
    await fn()
  } catch (e) {
    err = e as Error
  }
  chai.expect(err, 'expected to throw').to.not.equal(undefined)
  if (msgPart !== undefined) {
    chai.expect((err as Error).message).to.contain(msgPart)
  }
}

const samplePayload = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  iss: 'did:ethr:sepolia:0x0000000000000000000000000000000000000000',
  sub: 'did:ethr:0x435df3eda57154cf8cf7926079881f2912f54db4',
  nbf: 1562950282,
  vc: {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential'],
    credentialSubject: {
      degree: {
        type: 'BachelorDegree',
        name: 'Baccalaureat'
      }
    }
  },
  ...extra
})

const sampleHeader = { alg: 'EIP712', typ: 'JWT' }

const sampleDomain: TypedDataDomain = {
  name: 'EIP712Signature',
  version: '1',
  chainId: 1
}

const caip10Authenticator = (chainId: number, address: string): VerificationMethod => ({
  id: 'did:ethr:test#controller',
  type: 'EcdsaSecp256k1RecoveryMethod2020',
  controller: 'did:ethr:test',
  blockchainAccountId: `eip155:${chainId}:${address}`
})

const jwkAuthenticator = (id: string, controller: string): VerificationMethod => ({
  id,
  type: 'JsonWebKey2020',
  controller
})

const ethereumAddressAuthenticator = (address: string): VerificationMethod => ({
  id: 'did:ethr:test#controller',
  type: 'Secp256k1VerificationKey2018',
  controller: 'did:ethr:test',
  ethereumAddress: address
} as unknown as VerificationMethod)

describe(`Eip712Signer / Eip712Verifier (${_MODULE_TYPE})`, function () {
  let wallet: Wallet
  let signer: Eip712Signer
  let verifier: Eip712Verifier

  before(function () {
    wallet = new Wallet('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')
    signer = new Eip712Signer(wallet)
    verifier = new Eip712Verifier()
  })

  describe('round-trip', function () {
    it('signs and verifies a credential payload (blockchainAccountId / CAIP-10)', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const result = verifier.verify(
        'EIP712',
        signingInput,
        sig,
        [caip10Authenticator(1, wallet.address)]
      )
      chai.expect(result.blockchainAccountId).to.equal(`eip155:1:${wallet.address}`)
    })

    it('signs and verifies with a legacy ethereumAddress authenticator', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const result = verifier.verify(
        'EIP712',
        signingInput,
        sig,
        [ethereumAddressAuthenticator(wallet.address)]
      )
      chai.expect((result as VerificationMethod & { ethereumAddress: string }).ethereumAddress)
        .to.equal(wallet.address)
    })

    it('accepts Uint8Array signing input', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(new TextEncoder().encode(signingInput), 'EIP712')

      const result = verifier.verify(
        'EIP712',
        signingInput,
        sig,
        [caip10Authenticator(1, wallet.address)]
      )
      chai.expect(result).to.not.equal(undefined)
    })
  })

  describe('constructor variants', function () {
    const hex = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

    it('produces equivalent signatures for hex string, SigningKey, and Wallet', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)

      const sFromHex = new Eip712Signer(hex)
      const sFromKey = new Eip712Signer(new SigningKey(hex))
      const sFromWallet = new Eip712Signer(new Wallet(hex))

      const [a, b, c] = await Promise.all([
        sFromHex.sign(signingInput, 'EIP712'),
        sFromKey.sign(signingInput, 'EIP712'),
        sFromWallet.sign(signingInput, 'EIP712')
      ])
      chai.expect(a).to.equal(b)
      chai.expect(b).to.equal(c)
    })
  })

  describe('signer rejection', function () {
    it('rejects unsupported algorithm', async function () {
      const signingInput = buildSigningInput(sampleHeader, samplePayload({ domain: sampleDomain }))
      await expectThrowsAsync(async () => await signer.sign(signingInput, 'ES256K'), 'Unsupported')
    })

    it('rejects payload missing domain', async function () {
      const signingInput = buildSigningInput(sampleHeader, samplePayload())
      await expectThrowsAsync(async () => await signer.sign(signingInput, 'EIP712'), 'Domain')
    })

    it('rejects header with wrong alg', async function () {
      const signingInput = buildSigningInput(
        { alg: 'ES256K', typ: 'JWT' },
        samplePayload({ domain: sampleDomain })
      )
      await expectThrowsAsync(async () => await signer.sign(signingInput, 'EIP712'), 'algorithm')
    })

    it('rejects malformed JWT signing input (wrong number of segments)', async function () {
      await expectThrowsAsync(async () => await signer.sign('not-a-jwt', 'EIP712'), 'JWT')
    })
  })

  describe('verifier rejection', function () {
    it('rejects unsupported algorithm', function () {
      chai.expect(() =>
        verifier.verify('ES256K', 'a.b', '0x00', [caip10Authenticator(1, wallet.address)])
      ).to.throw(/Unsupported/)
    })

    it('rejects when no authenticator carries an address', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')
      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [jwkAuthenticator('x', 'did:x')])
      ).to.throw(/authenticator/)
    })

    it('detects a tampered payload', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const tamperedPayload = samplePayload({ domain: sampleDomain, sub: 'did:ethr:0xdead' })
      const tamperedInput = buildSigningInput(sampleHeader, tamperedPayload)

      chai.expect(() =>
        verifier.verify('EIP712', tamperedInput, sig, [caip10Authenticator(1, wallet.address)])
      ).to.throw()
    })

    it('detects a tampered signature', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')
      const flipped = sig.slice(0, -2) + (sig.endsWith('00') ? '11' : '00')

      chai.expect(() =>
        verifier.verify('EIP712', signingInput, flipped, [caip10Authenticator(1, wallet.address)])
      ).to.throw()
    })

    it('rejects when the only authenticator is a different address', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const otherWallet = Wallet.createRandom()
      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [caip10Authenticator(1, otherWallet.address)])
      ).to.throw(/verification failed/)
    })

    it('rejects payload without a domain', async function () {
      const signingInput = buildSigningInput(sampleHeader, samplePayload())
      chai.expect(() =>
        verifier.verify('EIP712', signingInput, '0x' + '00'.repeat(65), [
          caip10Authenticator(1, wallet.address)
        ])
      ).to.throw(/Domain/)
    })

    it('rejects header with wrong alg', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput({ alg: 'ES256K', typ: 'JWT' }, payload)
      chai.expect(() =>
        verifier.verify('EIP712', signingInput, '0x' + '00'.repeat(65), [
          caip10Authenticator(1, wallet.address)
        ])
      ).to.throw(/algorithm/)
    })
  })

  describe('mixed-key DID documents (verifyJWT retry contract)', function () {
    // did-jwt's verifyJWT tries authenticators one at a time and only moves on
    // when the error message contains `invalid_signature` (JWT.ts:572)
    it('marks "no address-bearing authenticator" as invalid_signature', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [jwkAuthenticator('did:ethr:test#key-1', 'did:ethr:test')])
      ).to.throw(/^invalid_signature/)
    })

    it('marks "no authenticator matched" as invalid_signature', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const otherWallet = Wallet.createRandom()
      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [caip10Authenticator(1, otherWallet.address)])
      ).to.throw(/^invalid_signature/)
    })

    it('still matches the right authenticator among mixed key types', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const result = verifier.verify('EIP712', signingInput, sig, [
        jwkAuthenticator('did:ethr:test#key-1', 'did:ethr:test'),
        caip10Authenticator(1, wallet.address)
      ])
      chai.expect(result.blockchainAccountId).to.equal(`eip155:1:${wallet.address}`)
    })
  })

  describe('domain policy (expectedDomain)', function () {
    it('accepts when every pinned field matches', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const pinned = new Eip712Verifier({
        expectedDomain: { name: 'EIP712Signature', version: '1', chainId: 1 }
      })
      const result = pinned.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
      chai.expect(result.blockchainAccountId).to.equal(`eip155:1:${wallet.address}`)
    })

    it('rejects a mismatching domain name', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const pinned = new Eip712Verifier({ expectedDomain: { name: 'SomeOtherApp' } })
      chai.expect(() =>
        pinned.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
      ).to.throw(/Domain policy violation.*name/)
    })

    it('rejects a mismatching chainId even when the signature itself is fine', async function () {
      const payload = samplePayload({ domain: sampleDomain }) // chainId 1
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const pinned = new Eip712Verifier({ expectedDomain: { chainId: 137 } })
      chai.expect(() =>
        pinned.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
      ).to.throw(/Domain policy violation.*chainId/)
    })

    it('compares verifyingContract case-insensitively', async function () {
      const contract = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC'
      const domain = { ...sampleDomain, verifyingContract: contract }
      const payload = samplePayload({ domain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const pinned = new Eip712Verifier({ expectedDomain: { verifyingContract: contract.toLowerCase() } })
      const result = pinned.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
      chai.expect(result).to.not.equal(undefined)
    })

    it('domain policy failures are not retryable (no invalid_signature token)', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const pinned = new Eip712Verifier({ expectedDomain: { version: '2' } })
      try {
        pinned.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
        chai.expect.fail('expected to throw')
      } catch (e) {
        chai.expect((e as Error).message).to.not.contain('invalid_signature')
      }
    })
  })

  describe('cross-implementation conformance (@metamask/eth-sig-util)', function () {
    // eth-sig-util needs the EIP712Domain type spelled out; ethers derives it
    // from the fields present in the domain object (canonical order)
    const eip712DomainType = [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' }
    ]

    const typedDataFor = (header: object, payload: object): TypedMessage<MessageTypes> => {
      const dataObj = { header, payload }
      const { types } = jsonToSolidityTypes(dataObj, { mainTypeName: 'JWT' })
      return {
        types: { EIP712Domain: eip712DomainType, ...types },
        domain: sampleDomain as TypedMessage<MessageTypes>['domain'],
        primaryType: 'JWT',
        message: dataObj
      }
    }

    it('eth-sig-util recovers the signing address from an Eip712Signer signature', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const recovered = recoverTypedSignature({
        data: typedDataFor(sampleHeader, payload),
        signature: sig,
        version: SignTypedDataVersion.V4
      })
      chai.expect(recovered.toLowerCase()).to.equal(wallet.address.toLowerCase())
    })

    it('Eip712Verifier accepts a signature produced by eth-sig-util', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)

      const sig = signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), 'hex'),
        data: typedDataFor(sampleHeader, payload),
        version: SignTypedDataVersion.V4
      })

      const result = verifier.verify('EIP712', signingInput, sig, [caip10Authenticator(1, wallet.address)])
      chai.expect(result.blockchainAccountId).to.equal(`eip155:1:${wallet.address}`)
    })

    it('both implementations produce the identical signature for the same input', async function () {
      const payload = samplePayload({ domain: sampleDomain })
      const signingInput = buildSigningInput(sampleHeader, payload)

      const oursSignature = await signer.sign(signingInput, 'EIP712')
      const theirsSignature = signTypedData({
        privateKey: Buffer.from(wallet.privateKey.slice(2), 'hex'),
        data: typedDataFor(sampleHeader, payload),
        version: SignTypedDataVersion.V4
      })
      chai.expect(oursSignature).to.equal(theirsSignature)
    })
  })

  describe('chainId binding', function () {
    it('rejects when authenticator chainId differs from domain chainId', async function () {
      const payload = samplePayload({ domain: { ...sampleDomain, chainId: 1 } })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [
          caip10Authenticator(137, wallet.address) // polygon, not mainnet
        ])
      ).to.throw(/verification failed/)
    })

    it('rejects when domain.chainId is missing (cross-chain replay guard)', async function () {
      const { chainId, ...domainNoChain } = sampleDomain
      void chainId
      const payload = samplePayload({ domain: domainNoChain })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      chai.expect(() =>
        verifier.verify('EIP712', signingInput, sig, [
          caip10Authenticator(1, wallet.address)
        ])
      ).to.throw(/chainId|verification failed/)
    })

    it('accepts when authenticator chainId matches domain chainId', async function () {
      const payload = samplePayload({ domain: { ...sampleDomain, chainId: 137 } })
      const signingInput = buildSigningInput(sampleHeader, payload)
      const sig = await signer.sign(signingInput, 'EIP712')

      const result = verifier.verify('EIP712', signingInput, sig, [
        caip10Authenticator(137, wallet.address)
      ])
      chai.expect(result.blockchainAccountId).to.contain('eip155:137:')
    })
  })
})
