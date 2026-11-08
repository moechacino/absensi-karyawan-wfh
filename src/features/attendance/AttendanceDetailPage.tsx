import { AttendanceDetailScreen } from './AttendanceDetailScreen'
import { getOwnAttendance } from './historyApi'
export default function AttendanceDetailPage() {
  return <AttendanceDetailScreen load={getOwnAttendance} />
}
