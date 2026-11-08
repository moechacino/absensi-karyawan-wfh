type Filters = Record<
  string,
  string | number | boolean | readonly string[] | undefined
>
const all = (identity: string) => ['private', identity] as const
const resource = (identity: string, name: string) =>
  [...all(identity), name] as const

export const queryKeys = {
  all,
  resource,
  profile: (identity: string) => resource(identity, 'profile'),
  home: (identity: string) => resource(identity, 'home'),
  attendanceDays: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'attendance'), 'days', filters] as const,
  attendance: (identity: string, id: string) =>
    [...resource(identity, 'attendance'), 'detail', id] as const,
  monitoring: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'monitoring'), filters] as const,
  employees: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'employees'), filters] as const,
  employee: (identity: string, id: string) =>
    [...resource(identity, 'employees'), 'detail', id] as const,
  organization: (identity: string) => resource(identity, 'organization'),
  divisions: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'organization'), 'divisions', filters] as const,
  positions: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'organization'), 'positions', filters] as const,
  schedule: (identity: string) => resource(identity, 'schedule'),
  scheduleVersions: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'schedule-versions'), filters] as const,
  holidays: (identity: string, year: number) =>
    [...resource(identity, 'holidays'), year] as const,
  timeZones: (identity: string, filters: Filters = {}) =>
    [...resource(identity, 'time-zones'), filters] as const,
}
