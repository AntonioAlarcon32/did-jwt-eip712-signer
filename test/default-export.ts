import pkg, { helloWorld } from '#pkg'

describe('Testing default export', function () {
  it('should be executed without issues', function () {
    chai.expect(helloWorld('named'))
    chai.expect(pkg())
  })
})
