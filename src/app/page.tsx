'use client'

import { FireDoorSurvey } from '../components/FireDoorSurvey'
import { SurveyList } from '../components/SurveyList'
import { useState } from 'react'

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleSurveySubmit = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FireDoorSurvey onSubmitSuccess={handleSurveySubmit} />
      <div className="max-w-4xl mx-auto p-6">
        <SurveyList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
} 