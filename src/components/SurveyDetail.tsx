'use client'

import { useState, useEffect } from 'react'
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

export const SurveyDetail: React.FC<SurveyDetailProps> = ({ surveyId, onClose }) => {
  const [survey, setSurvey] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const { data, error } = await supabase
          .from('fire_door_surveys')
          .select('*')
          .eq('id', surveyId)
          .single();

        if (error) throw error;
        setSurvey(data);
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Survey Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Location Details */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Location Details</h3>
            <div className="space-y-4">
              <p><span className="font-medium">Name:</span> {survey.location_name || '-'}</p>
              <div className="h-[300px]">
                <DynamicMap 
                  center={[survey.coordinates?.lat || -41.2865, survey.coordinates?.lng || 174.7762]}
                >
                  <LeafletMarker position={[survey.coordinates?.lat || -41.2865, survey.coordinates?.lng || 174.7762]} />
                </DynamicMap>
              </div>
            </div>
          </section>

          {/* Door Details */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Door Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <p><span className="font-medium">Type:</span> {survey.door_type || '-'}</p>
              <p><span className="font-medium">Installation:</span> {survey.installation_type || '-'}</p>
              <p><span className="font-medium">Manufacturer:</span> {survey.manufacturer || '-'}</p>
              <p><span className="font-medium">Doorset Number:</span> {survey.doorset_number || '-'}</p>
              <p><span className="font-medium">Date Installed:</span> {survey.date_installed || '-'}</p>
              <p><span className="font-medium">Fire Rating:</span> {survey.fire_rating || '-'}</p>
            </div>
          </section>

          {/* Components & Hardware */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Components & Hardware</h3>
            <div className="grid grid-cols-2 gap-4">
              <p><span className="font-medium">Door Closer Manufacturer:</span> {survey.door_closer_manufacturer || '-'}</p>
              <p><span className="font-medium">Number of Hinges:</span> {survey.num_hinges || '-'}</p>
              <p><span className="font-medium">Hardware Supplier:</span> {survey.hardware_supplier || '-'}</p>
            </div>
          </section>

          {/* Dimensions */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Dimensions</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Standard Gaps:</span> {survey.has_standard_gaps ? 'Yes' : 'No'}</p>
              {survey.gaps_notes && (
                <p><span className="font-medium">Gaps Notes:</span> {survey.gaps_notes}</p>
              )}
              
              <h4 className="font-medium mt-2">Leaf Dimensions</h4>
              <div className="grid grid-cols-3 gap-4 ml-4">
                <p>Width: {survey.leaf_dimensions?.width || '-'} mm</p>
                <p>Height: {survey.leaf_dimensions?.height || '-'} mm</p>
                <p>Thickness: {survey.leaf_dimensions?.thickness || '-'} mm</p>
              </div>

              {survey.leaf_dimensions?.hasVisionPanel && (
                <>
                  <h4 className="font-medium mt-2">Vision Panel</h4>
                  <div className="grid grid-cols-3 gap-4 ml-4">
                    <p>Width: {survey.leaf_dimensions.visionPanel?.width || '-'} mm</p>
                    <p>Height: {survey.leaf_dimensions.visionPanel?.height || '-'} mm</p>
                    <p>Material: {survey.leaf_dimensions.visionPanelMaterial || '-'}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Inspection Results */}
          <section className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">Inspection Results</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(survey.inspection_results || {}).map(([key, value]: [string, any]) => (
                <div key={key} className="border-b last:border-0 py-2">
                  <p className="font-medium">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <div className="ml-4">
                    <p>Status: {value?.status || '-'}</p>
                    {value?.notes && <p className="text-gray-600">Notes: {value.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Photos */}
          {survey.photos?.length > 0 && (
            <section className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-2">Photos</h3>
              <div className="grid grid-cols-2 gap-4">
                {survey.photos.map((photo: any, index: number) => (
                  <div key={index} className="border p-2 rounded">
                    <img 
                      src={photo.file_path} 
                      alt={photo.description || `Photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Photo {index + 1}</p>
                        <p className="text-sm text-gray-600">{photo.description || 'No description'}</p>
                        <p className="text-sm text-gray-500">
                          Taken: {new Date(photo.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this photo?')) return;
                          try {
                            // Delete from storage
                            const fileName = photo.file_path.split('/').pop();
                            if (fileName) {
                              await supabase.storage
                                .from('fire-door-photos')
                                .remove([fileName]);
                            }
                            // Update survey record
                            const newPhotos = survey.photos.filter((_: any, i: number) => i !== index);
                            const { error } = await supabase
                              .from('fire_door_surveys')
                              .update({ photos: newPhotos })
                              .eq('id', survey.id);
                            
                            if (error) throw error;
                            
                            // Update local state
                            setSurvey({ ...survey, photos: newPhotos });
                          } catch (error) {
                            console.error('Error deleting photo:', error);
                            alert('Error deleting photo');
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
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