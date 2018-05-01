// A custom test runner to use latest version of mocha
// most of them copied from https://github.com/BinaryMuse/atom-mocha-test-runner
const Mocha = require("mocha");
const { remote } = require("electron");

module.exports = function({testPaths, buildAtomEnvironment, buildDefaultApplicationDelegate, logFile, headless}){
    return new Promise(resolve => {
      try {
        global.atom = buildAtomEnvironment({
          applicationDelegate: buildDefaultApplicationDelegate(),
          window,
          document: window.document,
          configDirPath: process.env.ATOM_HOME,
          enablePersistence: false,
        });

        const mocha = new Mocha({
          timeout: 5000,
        });
        if (headless) {
          mocha.reporter("spec");
          console.log = function (...args) {
            process.stdout.write(require("util").format(...args) +"\n");
          }
          Object.defineProperties(process, {
            stdout: { value: remote.process.stdout },
            stderr: { value: remote.process.stderr },
          })
        }

        for (let path of testPaths) {
          let resolvedFiles = Mocha.utils.lookupFiles(path, ["spec.ts"], true);
          if (typeof resolvedFiles === "string") {
            resolvedFiles = [resolvedFiles];
          }
          for (let resolvedFile of resolvedFiles) {
            delete require.cache[resolvedFile];
            mocha.addFile(resolvedFile);
          }
        }

        window.runner = mocha.run(resolve);
      } catch (ex) {
        console.error(ex.stack);
        resolve(1);
      }
    })
};
