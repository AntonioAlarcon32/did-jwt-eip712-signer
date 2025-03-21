describe('testing env variables', function () {
  it('should have printed node.js\'s env variable PATH no matter if it is run in node or a browser', function () {
    console.log(process.env.PATH)
    chai.expect(process.env.PATH).to.not.equal(undefined)
  })
})
