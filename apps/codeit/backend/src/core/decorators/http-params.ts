import 'reflect-metadata'

export const PARAM_METADATA_KEY = Symbol('handler:params')

export type ParamType = 'body' | 'query' | 'param' | 'headers' | 'request' | 'reply'

export interface ParamDefinition {
  type: ParamType
  index: number
  key?: string
}

function createParamDecorator(type: ParamType) {
  return (key?: string): ParameterDecorator => {
    return (target, propertyKey, index) => {
      const existing: ParamDefinition[] =
        Reflect.getMetadata(PARAM_METADATA_KEY, target, propertyKey!) ?? []

      existing.push({ type, index, key })

      Reflect.defineMetadata(PARAM_METADATA_KEY, existing, target, propertyKey!)
    }
  }
}

export const Body = createParamDecorator('body')
export const Query = createParamDecorator('query')
export const Param = createParamDecorator('param')
export const Headers = createParamDecorator('headers')
export const Req = createParamDecorator('request')
export const Res = createParamDecorator('reply')
