import { defineConfig } from 'tsup';

export default defineConfig({
  // `seed` and `create-admin` are one-off commands run inside the deployed container.
  entry: {
    index: 'src/index.ts',
    seed: '../../prisma/seed.ts',
    'create-admin': 'src/scripts/create-admin.ts',
  },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // The shared workspace package ships TypeScript source, so bundle it in.
  noExternal: ['@invite/shared'],
  // The seed loads .env through dotenv, which is CommonJS and cannot be bundled into ESM output.
  external: ['dotenv'],
});
