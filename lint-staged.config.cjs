const path = require('path');

const eslint = (filenames) =>
  `eslint --fix ${filenames.map((f) => `"${path.relative(process.cwd(), f)}"`).join(' ')}`;

const prettier = (filenames) =>
  `prettier --write ${filenames.map((f) => `"${path.relative(process.cwd(), f)}"`).join(' ')}`;

/** GitHub labeler config is not strict YAML; Prettier cannot parse it. */
const prettierYamlMdx = (filenames) => {
  const filtered = filenames.filter(
    (f) => !/[\\/]\.github[\\/]labeler\.yml$/i.test(path.normalize(f)),
  );
  if (filtered.length === 0) {
    return [];
  }
  return [prettier(filtered)];
};

/** @type {import('lint-staged').Config} */
module.exports = {
  '**/*.{ts,tsx,cts,mts}': [eslint, prettier],
  '**/*.{js,jsx,cjs,mjs}': [prettier],
  '**/*.{yml,mdx}': [prettierYamlMdx],
  '**/*/package.json': 'node scripts/lint-staged-sync-pkg.cjs',
};
