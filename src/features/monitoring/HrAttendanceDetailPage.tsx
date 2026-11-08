import { AttendanceDetailScreen } from '../attendance/AttendanceDetailScreen'
import { getAttendanceForHR } from './api'
export default function HrAttendanceDetailPage() {
  return <AttendanceDetailScreen load={getAttendanceForHR} hr />
}
