import babel from "@rollup/plugin-babel";
import minify from "@rollup/plugin-terser";
import { rollup } from "rollup";
import commonjs from "rollup-plugin-commonjs";
import builtins from "rollup-plugin-node-builtins";
import resolve from "rollup-plugin-node-resolve";
import replace from "rollup-plugin-replace";

var declarations = "";

var fs = require("fs");

async function doBuild() {
    try {
        let bundle = await rollup({
            input: "index.js",
            plugins: [
                replace({
                    "process.env.NODE_ENV": JSON.stringify("production"),
                }),
                builtins(),
                resolve({
                    browser: true,
                    mainFields: ["main", "jsnext:main", "browser"],
                }),
                commonjs({}),
                babel({
                    babelrc: false,
                    presets: [
                        [
                            "@babel/preset-env",
                            {
                                modules: false,
                            },
                        ],
                    ],
                    plugins: ["@babel/plugin-external-helpers"],
                    babelHelpers: "external",
                }),
                minify({}),
            ],
            external: ["@babel/polyfill"],
            strictDeprecations: true,
        });

        await bundle.write({
            banner: "/* APP */",
            file: "dist/browser.js",
            name: "window",
            format: "iife",
            globals: {
                "@babel/polyfill": "window",
            },
        });

        function definitionGenerator() {
            return {
                name: "definition-generator", // this name will show up in warnings and errors
                resolveId(importee) {
                    if (importee === "definition-generator") {
                        return importee; // this signals that rollup should not ask other plugins or check the file system to find this id
                    }
                    return null; // other ids should be handled as usually
                },
                load(id) {
                    if (id.indexOf("lib") != -1) {
                        id = id.split("lib").join("declarations");
                        id = id.split(".js").join(".d.ts");
                    }
                    if (fs.existsSync(id)) {
                        var declaration = fs.readFileSync(id).toString();
                        var lines = declaration.split("\n");
                        lines = lines.map((line) => {
                            var replaced = line.replace(
                                "export declare",
                                "declare"
                            );
                            replaced = replaced.replace("export default", "");
                            return replaced;
                        });
                        lines = lines.filter((line) => {
                            return (
                                line.indexOf("import") != 0 &&
                                line.indexOf("export") != 0
                            );
                        });
                        declarations = declarations + lines.join("\n");
                    }
                    return null; // other ids should be handled as usually
                },
            };
        }

        let customBundle = await rollup({
            input: "custom.js",
            plugins: [
                definitionGenerator(),
                replace({
                    "process.env.NODE_ENV": JSON.stringify("production"),
                }),
                builtins(),
                resolve({
                    browser: true,
                    mainFields: ["main", "jsnext:main", "browser"],
                }),
                commonjs({}),
                minify({}),
            ],
            external: ["@babel/polyfill"],
            strictDeprecations: true,
        });

        await customBundle.write({
            banner: "/* APP */",
            file: "dist/custom.js",
            name: "window",
            format: "iife",
            globals: {
                "@babel/polyfill": "window",
            },
        });

        fs.writeFileSync("dist/custom.d.ts", declarations);

        let bundleES6 = await rollup({
            input: "index.js",
            plugins: [
                replace({
                    "process.env.NODE_ENV": JSON.stringify("production"),
                }),
                builtins(),
                resolve({
                    browser: true,
                    mainFields: ["main", "jsnext:main", "browser"],
                }),
                commonjs({}),
                minify({}),
            ],
            external: ["@babel/polyfill"],
            strictDeprecations: true,
        });

        await bundleES6.write({
            banner: "/* APP */",
            file: "dist/browser.es6.js",
            name: "window",
            format: "iife",
            globals: {
                "@babel/polyfill": "window",
            },
        });

        let bundleNode = await rollup({
            input: "index.js",
            external: ["@babel/polyfill"],
            strictDeprecations: true,
        });

        await bundleNode.write({
            banner: "/* APP */",
            file: "dist/index.js",
            format: "cjs",
            sourcemap: true,
        });
    } catch (e) {
        console.error(e);
        console.log(e.message);
    }
}

doBuild().then(() => {
    // var data = fs.readFileSync('dist/browser.js')
    // var fd = fs.openSync('dist/browser.js', 'w+')
    // var insert = Buffer.from("var tf = window.tf || {};")
    // fs.writeSync(fd, insert, 0, insert.length, 0)
    // fs.writeSync(fd, data, 0, data.length, insert.length)
    // fs.close(fd, (err) => {
    //   if (err) throw err;
    // });

    // var data = fs.readFileSync('dist/browser.es6.js')
    // var fd = fs.openSync('dist/browser.es6.js', 'w+')
    // var insert = Buffer.from("var tf = window.tf || {};")
    // fs.writeSync(fd, insert, 0, insert.length, 0)
    // fs.writeSync(fd, data, 0, data.length, insert.length)
    // fs.close(fd, (err) => {
    //   if (err) throw err;
    // });
    console.log("Completed build for node and browser");
});
