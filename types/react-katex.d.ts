declare module 'react-katex' {
  import { ReactNode } from 'react'

  export interface KatexProps {
    math: string
    block?: boolean
    errorColor?: string
    renderError?: (error: Error) => ReactNode
  }

  export const InlineMath: React.FC<KatexProps>
  export const BlockMath: React.FC<KatexProps>
}
