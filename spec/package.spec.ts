import "atom";
import { expect } from "chai";
import "mocha";
import {join} from "path";

const packagePath = join(__dirname, "..");

describe("ide-golang", () => {
  it("should activate", async () => {
    const packages: any = atom.packages;
    await packages.activatePackage(packagePath);
    expect(atom.packages.isPackageActive("ide-golang")).to.equal(true);
    expect(atom.config.get("ide-golang.maxConcurrency")).is.a("number");
  });
});
