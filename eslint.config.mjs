// ESLint (flat config) com o Google TypeScript Style (gts). O gts já inclui
// eslint-config-prettier + eslint-plugin-prettier, então Prettier e ESLint
// não conflitam: a formatação vem do .prettierrc.json.
import {defineConfig, globalIgnores} from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import gts from 'gts';

export default defineConfig([
  globalIgnores(['dist/', 'coverage/', 'src/generated/', '.scannerwork/']),
  ...gts,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: null,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // Mantido por último para desligar qualquer regra estilística que conflite.
  prettierConfig,
]);
