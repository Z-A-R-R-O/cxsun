export const TENANT_API_VERSION = 'v1'

export const TENANT_API_SURFACE = {
  http: {
    internalBasePath: `api/${TENANT_API_VERSION}/tenants`,
    externalBasePath: `api/${TENANT_API_VERSION}/tenants`,
  },
  graphql: {
    namespace: 'tenants',
  },
} as const

