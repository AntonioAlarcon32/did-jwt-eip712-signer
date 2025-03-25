[![License: {{PKG_LICENSE}}](https://img.shields.io/badge/License-{{PKG_LICENSE}}-yellow.svg)](LICENSE)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
{{BADGES}}

# {{PKG_NAME}}

A Signer implementation that supports EIP-712 Signing & Verification for DID-JWT. This package is designed to use [Ethers.js](https://github.com/ethers-io/ethers.js) signers to sign Verifiable Credentials and Presentations. A full working demo can be found in the [eip-712-demo](https://github.com/AntonioAlarcon32/eip-712-jwt-demo)

- [{{PKG\_NAME}}](#pkg_name)
  - [Install and use](#install-and-use)
  - [Usage example](#usage-example)
  - [API reference documentation](#api-reference-documentation)

## Install and use

For now, `{{PKG_NAME}}` can be imported to your project with `Github`:

```console
npm install https://github.com/AntonioAlarcon32/did-jwt-eth-typed-data-signature
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
//Signing
import { Eip712Signer, Eip712Verifier } from "did-jwt-eip712-signer";
import {
  createVerifiableCredentialJwt,
  verifyCredential,
} from "did-jwt-vc";

const classSigner = new Eip712Signer(signer);

const issuer = {
  did: "did:ethr:sepolia:" + selectedAccount,
  alg: "EIP712",
  signer: classSigner,
};
const vcPayload = {
  sub: "did:ethr:0x435df3eda57154cf8cf7926079881f2912f54db4",
  nbf: 1562950282,
  vc: {
    "@context": ["https://www.w3.org/2018/credentials/v1"],
    type: ["VerifiableCredential"],
    credentialSubject: {
      degree: {
        type: "BachelorDegree",
        name: "Baccalauréat en musiques numériques",
      },
    },
  },
  domain: domain,
};
const vcJwt = await createVerifiableCredentialJwt(vcPayload, issuer);

//Verification

const classVerifier = new Eip712Verifier();
const verifiedVC = await verifyCredential(
  vcJwt,
  resolver,
  undefined,
  classVerifier
);
```

## API reference documentation

[Check the API](../../docs/API.md)
