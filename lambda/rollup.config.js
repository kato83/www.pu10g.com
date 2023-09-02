import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const entry = name => ({
  input: `${name}/${name}.ts`,
  output: {
    dir: `../dist/lambda/${name}`,
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
});

export default [
  entry('dynamo-content'),
  entry('basic-auth'),
]