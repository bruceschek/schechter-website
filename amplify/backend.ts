import { defineBackend } from '@aws-amplify/backend';
import { contactFunction } from './functions/contact/resource';
import { FunctionUrl, FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';

const backend = defineBackend({
  contactFunction,
});

const fn = backend.contactFunction.resources.lambda;

const fnUrl = new FunctionUrl(
  backend.createStack('ContactFunctionUrl'),
  'ContactFunctionUrl',
  {
    function: fn,
    authType: FunctionUrlAuthType.NONE,
    cors: {
      allowedOrigins: ['*'],
      allowedMethods: [HttpMethod.ALL],
      allowedHeaders: ['Content-Type'],
    },
  }
);

backend.addOutput({
  custom: {
    contactApiUrl: fnUrl.url,
  },
});
