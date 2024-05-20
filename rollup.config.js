
import typescript from "@rollup/plugin-typescript"
import commonjs from "@rollup/plugin-commonjs"
import resolver from '@rollup/plugin-node-resolve';

export default {
  input: './index.ts',
  output: [
    {
      file: './lib/index.cjs',
      format: 'cjs',
      sourcemap: false
    },
  ],
  context: 'process',
  plugins: [
    typescript(),
    commonjs(),
    resolver({
      resolveOnly: ['mime']
    }),
  ]
}