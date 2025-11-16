import { PropsWithChildren } from 'react'
import clsx from 'clsx'

interface StarFieldLayoutProps extends PropsWithChildren {
  className?: string
  glowClassName?: string
  fixedHeight?: boolean
}

/**
 * 统一的星际科幻背景布局
 * 用于包裹页面主体，使视觉风格保持一致
 */
export default function StarFieldLayout({
  children,
  className,
  glowClassName,
  fixedHeight = false,
}: StarFieldLayoutProps) {
  return (
    <div className={clsx('relative w-full overflow-hidden bg-[#050817] text-white', fixedHeight ? 'h-screen' : 'min-h-screen')}>
      {/* 星际背景层 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(64,147,255,0.22),transparent_58%),radial-gradient(circle_at_78%_18%,rgba(162,118,255,0.2),transparent_62%),radial-gradient(circle_at_45%_84%,rgba(108,214,255,0.16),transparent_58%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(6,14,40,0.95)_0%,rgba(4,7,22,0.94)_55%,rgba(8,16,41,0.98)_100%)]" />
        <div
          className={clsx(
            'absolute -inset-[18vw] bg-[radial-gradient(circle,rgba(54,112,255,0.12)_0%,transparent_70%)] blur-3xl',
            glowClassName
          )}
        />
        <div className="absolute inset-0 bg-[url('https://assets.futuretools-pro.com/starfield-dark.svg')] bg-cover bg-center opacity-55 mix-blend-screen" />
        <div className="absolute left-[10%] top-[32%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(64,147,255,0.38)_0%,transparent_68%)] blur-3xl" />
        <div className="absolute right-[6%] top-[58%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(170,118,255,0.32)_0%,transparent_72%)] blur-3xl" />
      </div>

      <div className={clsx('relative z-10 flex w-full flex-col', fixedHeight ? 'h-full' : 'min-h-screen', className)}>
        {children}
      </div>
    </div>
  )
}

