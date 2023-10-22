export const isBrowser = () => typeof window !== 'undefined'
export const isNodeJs = () => !isBrowser()