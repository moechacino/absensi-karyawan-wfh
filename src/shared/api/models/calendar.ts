import type { Actor, ChangeImpact, Page } from './common'

export interface ScheduleChange {
  expectedVersion: number
  workingDays: number[]
  startTime: string
  endTime: string
  endDayOffset: 0 | 1
  timeZone: string
  effectiveFrom: string
  opensMinutesBeforeStart: number
}

export interface ScheduleVersion extends Omit<ScheduleChange, 'expectedVersion'> {
  id: string
  effectiveAt: string
  state: 'ACTIVE' | 'SCHEDULED' | 'SUPERSEDED'
  createdAt: string
  createdBy: Actor
}

export interface WorkSchedule {
  version: number
  current: ScheduleVersion | null
  upcoming: ScheduleVersion | null
  checkInPolicy: { opensMinutesBeforeStart: number; lateAfterMinutes: number }
}

export interface SchedulePreview {
  schedule: ScheduleChange
  activationMode: 'ON_SAVE' | 'AT_INSTANT'
  effectiveAt: string | null
  comparisonDate: string
  impact: ChangeImpact
}

export interface ScheduleChanged {
  schedule: WorkSchedule
}

export interface TimeZoneChoices {
  items: { id: string; label: string; offsetMinutes: number; referenceAt: string }[]
}

export interface Holiday {
  date: string
  name: string
  category: 'COMPANY' | 'PUBLIC' | 'OTHER'
}

export interface HolidayCalendar {
  year: number
  version: number
  items: Holiday[]
}

export interface HolidayChange {
  year: number
  expectedVersion: number
  upsert: Holiday[]
  remove: string[]
}

export interface HolidayChanged {
  calendar: HolidayCalendar
}

export type ScheduleHistoryPage = Page<ScheduleVersion>
