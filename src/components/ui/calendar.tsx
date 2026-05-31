import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { ptBR } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-100',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 text-gray-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 text-gray-100',
        ),
        table: 'w-full border-collapse space-y-1',
        month_grid: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        weekdays: 'flex',
        head_cell: 'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
        weekday: 'text-gray-400 rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        week: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/5 [&:has([aria-selected])]:bg-white/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-white/5 [&:has([aria-selected])]:bg-white/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-gray-100',
        ),
        day_selected:
          'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 focus:bg-emerald-500/30 focus:text-emerald-300',
        selected:
          'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 focus:bg-emerald-500/30 focus:text-emerald-300',
        day_today: 'bg-white/10 text-gray-100',
        today: 'bg-white/10 text-gray-100',
        day_outside:
          'day-outside text-gray-500 opacity-50 aria-selected:bg-white/5 aria-selected:text-gray-400 aria-selected:opacity-30',
        outside:
          'day-outside text-gray-500 opacity-50 aria-selected:bg-white/5 aria-selected:text-gray-400 aria-selected:opacity-30',
        day_disabled: 'text-gray-500 opacity-50',
        disabled: 'text-gray-500 opacity-50',
        day_range_middle: 'aria-selected:bg-white/10 aria-selected:text-gray-100',
        range_middle: 'aria-selected:bg-white/10 aria-selected:text-gray-100',
        day_hidden: 'invisible',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
