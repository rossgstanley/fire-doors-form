'use client'

import { useState } from 'react'
import { FireDoorSurvey } from '@/components/FireDoorSurvey'
import { SurveyList } from '@/components/SurveyList'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSurveySubmit = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <FireDoorSurvey onSubmitSuccess={handleSurveySubmit} />
      <SurveyList refreshTrigger={refreshTrigger} />
    </main>
  )
} 