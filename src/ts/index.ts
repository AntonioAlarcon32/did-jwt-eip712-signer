import { Eip712Signer } from './eip-712-signer'
import { Eip712Verifier } from './eip-712-verifier'

export { Eip712Signer, Eip712Verifier }

// async function main() {
//   const randomWallet = Wallet.createRandom();

//   const signer = new Eip712Signer(randomWallet);

//   let fakeJwt: string =
//     'eyJhbGciOiJFSVA3MTIiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJkb21haW4iOnsibmFtZSI6IkVJUDcxMlNpZ25hdHVyZSIsInZlcnNpb24iOiIxIiwiY2hhaW5JZCI6MX19';

//   const domain: TypedDataDomain = {
//     name: 'EIP712Signature',
//     version: '1',
//     chainId: 1,
//   };
//   const signature = await signer.sign(fakeJwt, 'EIP712');
//   fakeJwt = fakeJwt + '.' + signature;
//   console.log(fakeJwt);

//   const verifier = new Eip712Verifier();

//   const result = verifier.verify('EIP712', fakeJwt, signature, []);
// }
// main();
