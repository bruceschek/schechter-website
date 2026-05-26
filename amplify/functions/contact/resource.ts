import { defineFunction } from '@aws-amplify/backend';

export const contactFunction = defineFunction({
  name: 'contact',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
