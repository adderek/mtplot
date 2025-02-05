import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/mtplot.js',
      format: 'umd',
      name: 'MTPlot',
      sourcemap: true
    },
    {
      file: 'dist/mtplot.esm.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/mtplot.min.js',
      format: 'umd',
      name: 'MTPlot',
      plugins: [terser()],
      sourcemap: true
    }
  ],
  plugins: [
    typescript(),
    resolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
};
