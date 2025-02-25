'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SurveyDetail } from './SurveyDetail'

interface Survey {
  id: string
  created_at: string
  location_name: string
  door_type: string
  installation_type: string
  fire_rating: string
}

interface SurveyListProps {
  refreshTrigger: number
}

export const SurveyList: React.FC<SurveyListProps> = ({ refreshTrigger }) => {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null)

  useEffect(() => {
    const fetchSurveys = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('fire_door_surveys')
          .select('id, created_at, location_name, door_type, installation_type, fire_rating')
          .order('created_at', { ascending: false })

        if (error) throw error
        setSurveys(data || [])
      } catch (error) {
        console.error('Error fetching surveys:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSurveys()
  }, [refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    
    try {
      const { error } = await supabase
        .from('fire_door_surveys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSurveys(surveys.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting survey:', error);
      alert('Error deleting survey');
    }
  };

  if (loading) return <div>Loading surveys...</div>

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4">Recent Surveys</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Door Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fire Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {surveys.map((survey) => (
              <tr 
                key={survey.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedSurveyId(survey.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(survey.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {survey.location_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey.door_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey.installation_type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {survey.fire_rating}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(survey.id);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSurveyId && (
        <SurveyDetail
          surveyId={selectedSurveyId}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}
    </div>
  )
} 