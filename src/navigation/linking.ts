import type {LinkingOptions} from '@react-navigation/native';

/** Open `/auth/handoff?code=` from Customer web or App Links. */
export const partnerLinking: LinkingOptions<any> = {
  prefixes: [
    'https://partner.akansho.com',
    'https://www.partner.akansho.com',
    'akansho-partner://',
  ],
  config: {
    screens: {
      AuthHandoff: 'auth/handoff',
      Login: 'login',
      ProviderMain: {
        path: '',
      },
    },
  },
};
