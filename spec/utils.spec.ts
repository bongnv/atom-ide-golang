import { TextEditor } from "atom";
import { expect } from "chai";
import * as sinon from "sinon";
import * as utils from "../lib/utils";

describe("getFileArchive", () => {
  it("should work as expected", () => {
    const e = new TextEditor();
    const stub = sinon.stub(e, "getText");
    const stubPath = sinon.stub(e, "getPath");
    stub.returns("some random text");
    stubPath.returns("/path");
    const archive = utils.getFileArchive(e);
    expect(archive).equals("/path\n16\nsome random text");
    expect(stub.calledOnce).to.be.true;
    expect(stubPath.calledOnce).to.be.true;
  });
});
