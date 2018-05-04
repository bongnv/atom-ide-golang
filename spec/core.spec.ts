import { assert, expect } from "chai";
import * as sinon from "sinon";
import { Core } from "../lib/core";

describe("core", () => {
  it("should return error max concurrency", () => {
    const core = new Core();
    const stub = sinon.stub(atom.config, "get");
    stub.withArgs("ide-golang.maxConcurrency").returns(0);
    return core.spawn("echo", [])
      .then(() => {
          assert.fail();
        })
      .catch((err: any) => {
        expect(err.message).equal("Max concurrency exceeded.");
      });
  });
});
