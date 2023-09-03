import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: {
    "dynamo-content/dynamo-content": "dynamo-content/dynamo-content.ts",
    "basic-auth/basic-auth": "basic-auth/basic-auth.ts",
    "render-page/render-page": "render-page/render-page.ts",
  },
  output: {
    dir: `../dist/lambda/`,
    entryFileNames: '[name].js',
    format: 'cjs',
    exports: "named",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    nodeResolve(),
    commonjs(),
    json(),
    terser({ output: { comments: /@license/i } }),
  ]
};