'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// Dynamic imports for Leaflet components
const DynamicMap = dynamic(
  () => import('@/components/Map').then(mod => mod.DynamicMap),
  { ssr: false }
)

const LeafletMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)

interface SurveyDetailProps {
  surveyId: string;
  onClose: () => void;
}

// Add a type for the photo structure
interface Photo {
  file_path: string;
  description: string;
  timestamp: string;
}

// Helper function to format value
const formatValue = (value: any, unit?: string) => {
  if (!value && value !== 0) return '';
  return unit ? `${value}${unit}` : value;
};

// Add type definitions
const doorTypes = ['single', 'double'] as const;
const installationTypes = ['interior', 'exterior'] as const;

export const SurveyDetail: React.FC<SurveyDetailProps> = ({ surveyId, onClose }) => {
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Single photos useMemo hook
  const photos = useMemo(() => {
    if (!survey?.photos) return [];
    try {
      const photoData = typeof survey.photos === 'string'
        ? JSON.parse(survey.photos)
        : survey.photos;
      return Array.isArray(photoData) ? photoData : [];
    } catch (error) {
      console.warn('Error parsing photos:', error);
      return [];
    }
  }, [survey?.photos]);

  const inspectionResults = useMemo(() => {
    if (!survey?.inspection_results) return [];
    try {
      const results = typeof survey.inspection_results === 'string' 
        ? JSON.parse(survey.inspection_results) 
        : survey.inspection_results;
      return Object.entries(results);
    } catch (error) {
      console.warn('Error parsing inspection results:', error);
      return [];
    }
  }, [survey?.inspection_results]);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const { data, error } = await supabase
          .from('fire_door_surveys')
          .select('*')
          .eq('id', surveyId)
          .single();

        if (error) throw error;

        // Parse JSON fields
        const parsedData = {
          ...data,
          door_closer: JSON.parse(data.door_closer || '{}'),
          hinges: JSON.parse(data.hinges || '{}'),
          hardware: JSON.parse(data.hardware || '{}'),
          leaf_dimensions: JSON.parse(data.leaf_dimensions || '{}'),
          second_leaf_dimensions: data.second_leaf_dimensions ? JSON.parse(data.second_leaf_dimensions) : null,
          gaps: JSON.parse(data.gaps || '{}'),
          building_features: JSON.parse(data.building_features || '{}'),
          inspection_results: JSON.parse(data.inspection_results || '{}'),
          photos: JSON.parse(data.photos || '[]')
        };

        setSurvey(parsedData);
      } catch (error) {
        console.error('Error fetching survey:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  if (loading) return <div>Loading...</div>;
  if (!survey) return <div>Survey not found</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <p>Loading survey details...</p>
          </div>
        ) : (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Survey Details</h2>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                survey.pass_fail ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {survey.pass_fail ? 'PASS' : 'FAIL'}
              </span>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Location Details */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Location Details</h3>
            <div className="space-y-4">
              <p><span className="font-medium">Name:</span> {survey.location_name}</p>
            </div>
          </section>

          {/* Door Details */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Door Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>
                <span className="font-medium">Type:</span>{' '}
                {survey.door_type?.charAt(0).toUpperCase() + survey.door_type?.slice(1)}
              </p>
              <p>
                <span className="font-medium">Installation:</span>{' '}
                {survey.installation_type?.charAt(0).toUpperCase() + survey.installation_type?.slice(1)}
              </p>
              <p><span className="font-medium">Manufacturer:</span> {survey.manufacturer}</p>
              <p><span className="font-medium">Doorset Number:</span> {survey.doorset_number}</p>
              <p><span className="font-medium">Date Manufactured:</span> {survey.date_manufactured}</p>
              <p><span className="font-medium">Fire Rating:</span> {survey.fire_rating ? `-/${survey.fire_rating}` : ''}</p>
            </div>
          </section>

          {/* Components & Hardware */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Components & Hardware</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Door Closer</h4>
                <p>Brand: {survey.door_closer?.brand}</p>
                <p>CE Marking: {survey.door_closer?.ceMarking ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <h4 className="font-medium">Hinges</h4>
                <p>Number of Sets: {survey.hinges?.numSets}</p>
                <p>Brand: {survey.hinges?.brand}</p>
                <p>CE Marking: {survey.hinges?.ceMarking ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <h4 className="font-medium">Door Handle, Locks, and Latches</h4>
                <p>Brand: {survey.hardware?.brand}</p>
                <p>CE Marking: {survey.hardware?.ceMarking ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </section>

          {/* Dimensions */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Dimensions</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Leaf Dimensions</h4>
                <div className="grid grid-cols-3 gap-4 ml-4">
                  <p>Width: {formatValue(survey.leaf_dimensions?.width, ' mm')}</p>
                  <p>Height: {formatValue(survey.leaf_dimensions?.height, ' mm')}</p>
                  <p>Thickness: {formatValue(survey.leaf_dimensions?.thickness, ' mm')}</p>
                </div>
              </div>

              {survey.leaf_dimensions?.hasVisionPanel && (
                <div>
                  <h4 className="font-medium">Vision Panel</h4>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <p>Width: {formatValue(survey.leaf_dimensions.visionPanel?.width, ' mm')}</p>
                    <p>Height: {formatValue(survey.leaf_dimensions.visionPanel?.height, ' mm')}</p>
                    <p>Material: {survey.leaf_dimensions.visionPanelMaterial}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-medium">Gap Measurements</h4>
                <div className="grid grid-cols-3 gap-4 ml-4">
                  <p>Left Side: {formatValue(survey.gaps?.leftSide, ' mm')}</p>
                  <p>Right Side: {formatValue(survey.gaps?.rightSide, ' mm')}</p>
                  <p>In-Between: {formatValue(survey.gaps?.inBetween, ' mm')}</p>
                  <p>Protrusion: {formatValue(survey.gaps?.protrusion, ' mm')}</p>
                  {survey.door_type === 'double' && (
                    <>
                      <p>Left Door Top: {formatValue(survey.gaps?.leftDoor?.top, ' mm')}</p>
                      <p>Left Door Bottom: {formatValue(survey.gaps?.leftDoor?.bottom, ' mm')}</p>
                      <p>Right Door Top: {formatValue(survey.gaps?.rightDoor?.top, ' mm')}</p>
                      <p>Right Door Bottom: {formatValue(survey.gaps?.rightDoor?.bottom, ' mm')}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Inspection Results */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Inspection Results</h3>
            <div className="grid grid-cols-1 gap-4">
              {inspectionResults.map(([key, value]: [string, any]) => {
                if (!value.status.length && !value.notes) return null;
                return (
                  <div key={key} className="border-b last:border-0 py-2">
                    <p className="font-medium">
                      {key
                        .split(/(?=[A-Z])/)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </p>
                    {value.status.length > 0 && (
                      <p className="ml-4">Issues: {value.status.join(', ')}</p>
                    )}
                    {value.notes && (
                      <p className="ml-4 text-gray-600">Notes: {value.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Photos */}
          {photos.length > 0 && (
            <section className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">Photos</h3>
              <div className="grid grid-cols-2 gap-4">
                {photos.map((photo: Photo, index: number) => (
                  <div key={index} className="border p-2 rounded">
                    <img 
                      src={photo.file_path}  // Use the URL directly
                      alt={photo.description || `Photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.png';
                        console.error('Error loading image:', photo.file_path);
                      }}
                    />
                    {photo.description && (
                      <p className="mt-2 text-sm text-gray-600">{photo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Additional Notes */}
          {survey.additional_notes && (
            <section>
              <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
              <p className="whitespace-pre-wrap">{survey.additional_notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}; 