import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar      from './components/Sidebar'
import DebtAnalysis from './pages/DebtAnalysis'
import CustomerList from './pages/CustomerList'
import BusinessType from './pages/BusinessType'
import DebtClassification from './pages/DebtClassification'
import CongNoReport       from './pages/CongNoReport'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"              element={<Navigate to="/congno-report" replace />} />
            <Route path="/congno-report"      element={<CongNoReport />}       />
            <Route path="/debt-analysis" element={<DebtAnalysis />} />
            <Route path="/customers"     element={<CustomerList />} />
            <Route path="/business-type" element={<BusinessType />} />
            <Route path="/debt-classification" element={<DebtClassification />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
