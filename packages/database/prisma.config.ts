import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: process.env.POSTGRES_URL ?? 'postgresql://root:root@127.0.0.1:5434/dashboard',
  },
});
