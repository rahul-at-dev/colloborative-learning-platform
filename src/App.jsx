import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import RoomPage from './pages/RoomPage'
import JoinRoomPage from './pages/JoinRoomPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/room/:id" element={
          <ProtectedRoute><RoomPage /></ProtectedRoute>
        } />
        <Route path="/join/:token" element={
          <ProtectedRoute><JoinRoomPage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
