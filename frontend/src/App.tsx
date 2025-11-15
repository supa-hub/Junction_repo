import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { PlaySessionPage } from './pages/PlaySessionPage'
import { TeacherLoginPage } from './pages/TeacherLoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play/:sessionId" element={<PlaySessionPage />} />
      <Route path="/teacher" element={<TeacherLoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
