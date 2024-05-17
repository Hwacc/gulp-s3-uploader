
import typescript from "@rollup/plugin-typescript"

export default {
  input: './index.ts',

  output: [
    {
      file: './lib/index.cjs',
      format: 'cjs',
      sourcemap: false
    },
    {
      file: './lib/index.mjs',
      format: 'es',
      sourcemap: false
    }
  ],

  plugins: [
    typescript()
  ]
}