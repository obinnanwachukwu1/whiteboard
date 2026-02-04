import React from 'react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import whyDidYouRender from '@welldone-software/why-did-you-render'

if (import.meta.env.DEV) {
  console.log('[wdyr] Initializing why-did-you-render')
  whyDidYouRender(React, {
    trackAllPureComponents: false,
    trackHooks: false,
    logOnDifferentValues: true,
    include: [
      /ActivityItem/,
      /ActivityPanel/,
      /PriorityItem/,
      /PriorityList/,
      /SummaryPopover/,
      /AIPopover/,
      /ListItemRow/,
      /Sidebar/,
      /Header/,
    ],
    exclude: [
      /lucide/i,
      /^Lucide/,
      /^ForwardRef/,
      /^Memo/,
      /^Wand2$/,
      /^Sparkles$/,
      /^Megaphone$/,
      /^Check$/,
      /^Calendar$/,
      /^Eye$/,
      /^EyeOff$/,
    ],
    collapseGroups: true,
  })
  console.log('[wdyr] Initialized successfully')
}

export {}
