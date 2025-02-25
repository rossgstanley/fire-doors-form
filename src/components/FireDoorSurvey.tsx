'use client'

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Camera, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DynamicMap, LocationMarker } from './Map';

interface DropdownWithNotesProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}

// Reusable dropdown component with notes
const DropdownWithNotes = ({ label, options, value, onChange, notes, onNotesChange }: DropdownWithNotesProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1">{label}</label>
    <div className="flex gap-2">
      <div className="w-1/2 p-2 border rounded">
        {options.map(option => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={(e) => {
                const newValue = e.target.checked
                  ? [...value, option]
                  : value.filter(v => v !== option);
                onChange(newValue);
              }}
            />
            {option}
          </label>
        ))}
      </div>
      <input
        type="text"
        className="w-1/2 p-2 border rounded"
        placeholder="Optional notes..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </div>
  </div>
);

interface SectionHeaderProps {
  title: string;
  section: string;
  isExpanded: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  section, 
  isExpanded, 
  onToggle 
}) => (
  <div 
    className="flex justify-between items-center bg-slate-100 p-4 rounded-t cursor-pointer"
    onClick={onToggle}
  >
    <h2 className="text-xl font-semibold">{title}</h2>
    {isExpanded ? <ChevronUp /> : <ChevronDown />}
  </div>
);

// Add at the top with other interfaces
type SectionName = 'location' | 'doorDetails' | 'components' | 'dimensions' | 'inspection' | 'photos' | 'siteConditions' | 'doorArchitrave' | 'doorMaterial' | 'buildingFeatures';

// First update the FormValues interface for inspection items
interface InspectionItem {
  status: string[];  // Always an array, ['OK'] for passing state
  notes: string;
}

// Add at the top with other interfaces
interface FormValues {
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  doorType: string;
  installationType: string;
  manufacturer: string;
  doorsetNumber: string;
  dateInstalled: {
    day: string;
    month: string;
    year: string;
  };
  fireRating: {
    integrity: string;
    insulation: string;
  };
  doorCloserManufacturer: string;
  numHinges: number;
  hardwareSupplier: string;
  hasStandardGaps: boolean;
  hasStandardBottomGap: boolean;
  gapsNotes: {
    top: string;
    sides: string;
    bottom: string;
    meetingStile?: string;
  };
  leafDimensions: {
    width: string;
    height: string;
    thickness: string;
    hasVisionPanel: boolean;
    visionPanelMaterial: string;
    visionPanel: {
      width: string;
      height: string;
    };
  };
  doorLeaf: { status: string[], notes: string };
  doorFrame: { status: string[], notes: string };
  visionPanel: { status: string[], notes: string };
  intumescentSeal: { status: string[], notes: string };
  smokeSeal: { status: string[], notes: string };
  hinges: {
    numSets: number;
    brand: string;
    ceMarking: boolean;
    status: string[];
    notes: string;
  };
  doorCloser: {
    brand: string;
    ceMarking: boolean;
    status: string[];
    notes: string;
  };
  hardware: {
    brand: string;
    ceMarking: boolean;
    status: string[];
    notes: string;
  };
  doorTag: { status: string[], notes: string };
  doorIndicator: { status: string[], notes: string };
  photos: Array<{
    file_path: string;
    description: string;
    timestamp: string;
  }>;
  additionalNotes: string;
  siteConditions: {
    securityFeatures: {
      type: string;
      otherSpecify?: string;
    };
    wallSubstrate: {
      type: string;
      otherSpecify?: string;
    };
    wallFinish: {
      type: string;
      otherSpecify?: string;
    };
    floorSurface: string;
    floorFinish: string[];
  };
  doorArchitrave: string;
  doorMaterial: {
    type: string;
    otherSpecify?: string;
  };
  secondLeafDimensions?: {
    width: string;
    height: string;
    thickness: string;
    hasVisionPanel: boolean;
    visionPanelMaterial: string;
    visionPanel: {
      width: string;
      height: string;
    };
  };
  gaps: {
    top: number | null;
    bottom: number | null;
    leftSide: number | null;
    rightSide: number | null;
    inBetween: number | null;
    protrusion: number | null;
  };
  buildingFeatures: {
    security: {
      features: string[];
      moreDetails?: string;
    };
    wall: {
      substrate: string;
      substrateOther?: string;
      finish: string;
      finishOther?: string;
      architrave: string;
    };
    floor: {
      surface: string;
      finish: string[];
      finishOther?: string;
    };
    notes: string;
  };
  inspection: {
    doorLeaf: InspectionItem;
    doorLeafMaterial: InspectionItem;
    doorFrame: InspectionItem;
    doorFrameMaterial: InspectionItem;
    visionPanel: InspectionItem;
    intumescentSeal: InspectionItem;
    smokeSeal: InspectionItem;
    hinges: InspectionItem;
    doorCloser: InspectionItem & {
      slowClosing: boolean;  // Takes more than 25 seconds to close
    };
    hardware: InspectionItem & {
      rattling: boolean;  // Does not firmly close without rattling
    };
    fireTag: InspectionItem;
    doorSignage: InspectionItem & {
      oneSideOnly: boolean;  // One side only but required on both
      notNZS4520: boolean;  // Not in accordance with NZS 4520
    };
  };
}

type FormField = keyof FormValues;

// Add a refresh prop to the component
interface FireDoorSurveyProps {
  onSubmitSuccess?: () => void;
}

export const FireDoorSurvey: React.FC<FireDoorSurveyProps> = ({ onSubmitSuccess }) => {
  // Status options
  const statusOptions = {
    doorLeaf: ['OK', 'Chipped', 'Cracked', 'With Voids', 'Altered', 'Binding'],
    doorFrame: ['OK', 'Chipped', 'Cracked', 'With Voids', 'Altered'],
    visionPanel: ['OK', 'Not Present', 'Cracked', 'Scratched', 'Clear', 'With Mesh'],
    seals: ['OK', 'Loose', 'Incomplete', 'Missing', 'With Tears'],
    hinges: ['OK', 'Loose Screw', 'Missing Screw', 'Squeaky', 'Misaligned', 'Rusty/Tarnished'],
    doorCloser: ['OK', 'Delayed/Not Closing', 'Rapid Closing', 'Unusual Noise'],
    hardware: ['OK', 'Sticky Locks', 'Loose Locks', 'Misaligned', 'Needs Lubrication'],
    doorTag: ['OK', 'Missing', 'Unreadable', 'Painted'],
    doorIndicator: ['OK', 'Missing', 'Peeled-off/Unreadable']
  };

  // Section visibility state
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    doorDetails: true,
    components: true,
    dimensions: true,
    inspection: true,
    photos: true,
    siteConditions: true,
    doorArchitrave: true,
    doorMaterial: true,
    buildingFeatures: true
  });

  // Door type state
  const [doorType, setDoorType] = useState('single');
  
  // Add these near the top of the component
  const initialFormState: FormValues = {
    locationName: '',
    coordinates: { lat: -41.2865, lng: 174.7762 },
    doorType: 'single',
    installationType: 'interior',
    manufacturer: '',
    doorsetNumber: '',
    dateInstalled: { day: '', month: '', year: '' },
    fireRating: { integrity: '', insulation: '' },
    doorCloserManufacturer: '',
    numHinges: 0,
    hardwareSupplier: '',
    hasStandardGaps: false,
    hasStandardBottomGap: false,
    gapsNotes: {
      top: '',
      sides: '',
      bottom: '',
    },
    leafDimensions: {
      width: '',
      height: '',
      thickness: '',
      hasVisionPanel: false,
      visionPanelMaterial: 'clear',
      visionPanel: { width: '', height: '' }
    },
    doorLeaf: { status: [], notes: '' },
    doorFrame: { status: [], notes: '' },
    visionPanel: { status: [], notes: '' },
    intumescentSeal: { status: [], notes: '' },
    smokeSeal: { status: [], notes: '' },
    hinges: {
      numSets: 0,
      brand: '',
      ceMarking: false,
      status: [],
      notes: ''
    },
    doorCloser: {
      brand: '',
      ceMarking: false,
      status: [],
      notes: ''
    },
    hardware: {
      brand: '',
      ceMarking: false,
      status: [],
      notes: ''
    },
    doorTag: { status: [], notes: '' },
    doorIndicator: { status: [], notes: '' },
    photos: [],
    additionalNotes: '',
    siteConditions: {
      securityFeatures: { type: 'Ordinary Lockset' },
      wallSubstrate: { type: 'Masonry' },
      wallFinish: { type: 'Painted' },
      floorSurface: 'Leveled',
      floorFinish: []
    },
    doorArchitrave: 'With',
    doorMaterial: { type: 'Timber Leaf and Timber Frame' },
    secondLeafDimensions: undefined,
    gaps: {
      top: null,
      bottom: null,
      leftSide: null,
      rightSide: null,
      inBetween: null,
      protrusion: null
    },
    buildingFeatures: {
      security: {
        features: [],
        moreDetails: ''
      },
      wall: {
        substrate: 'Masonry',
        substrateOther: '',
        finish: 'Painted',
        finishOther: '',
        architrave: 'With'
      },
      floor: {
        surface: 'Leveled',
        finish: [],
        finishOther: ''
      },
      notes: ''
    },
    inspection: {
      doorLeaf: { status: ['OK'], notes: '' },
      doorLeafMaterial: { status: ['OK'], notes: '' },
      doorFrame: { status: ['OK'], notes: '' },
      doorFrameMaterial: { status: ['OK'], notes: '' },
      visionPanel: { status: ['OK'], notes: '' },
      intumescentSeal: { status: ['OK'], notes: '' },
      smokeSeal: { status: ['OK'], notes: '' },
      hinges: { status: ['OK'], notes: '' },
      doorCloser: { status: ['OK'], notes: '', slowClosing: false },
      hardware: { status: ['OK'], notes: '', rattling: false },
      fireTag: { status: ['OK'], notes: '' },
      doorSignage: { status: ['OK'], notes: '', oneSideOnly: false, notNZS4520: false }
    },
  };

  // Add state to track form changes
  const [isDirty, setIsDirty] = useState(false);

  // Update form state initialization
  const [formValues, setFormValues] = useState<FormValues>(initialFormState);

  // Near the top of the component, after initialFormState
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    // Get current location when component mounts
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleInputChange('coordinates', {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoadingLocation(false);
        },
        (error) => {
          console.warn('Location error:', error.message);
          // More user-friendly error handling
          switch (error.code) {
            case error.PERMISSION_DENIED:
              alert('Please enable location access to use current location.');
              break;
            case error.POSITION_UNAVAILABLE:
              alert('Location information is unavailable. Using default location.');
              break;
            case error.TIMEOUT:
              alert('Location request timed out. Using default location.');
              break;
            default:
              alert('An error occurred getting location. Using default location.');
          }
          // Fall back to default coordinates (Wellington)
          handleInputChange('coordinates', { 
            lat: -41.2865, 
            lng: 174.7762 
          });
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: false, // Set to false for faster response
          timeout: 10000,           // Reduce timeout to 10 seconds
          maximumAge: 300000        // Allow cached positions up to 5 minutes old
        }
      );

      // Cleanup function to stop watching location
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      // Geolocation not supported
      alert('Geolocation is not supported by your browser. Using default location.');
      handleInputChange('coordinates', { 
        lat: -41.2865, 
        lng: 174.7762 
      });
      setIsLoadingLocation(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Toggle section visibility
  const toggleSection = (section: SectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Modify handleInputChange to track changes
  const handleInputChange = (field: FormField, value: any) => {
    setIsDirty(true);
    setFormValues(prev => ({
      ...prev,
      [field]: typeof value === 'object' ? { ...(prev[field] as object), ...value } : value
    }));
  };

  // Update the type and functions
  type FormPath = string;

  const handleStatusChange = (path: FormPath, value: string[]) => {
    setFormValues(prev => {
      const newValues = { ...prev };
      const parts = path.split('.');
      let current: any = newValues;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      return newValues;
    });
  };

  const handleNotesChange = (path: FormPath, value: string) => {
    setFormValues(prev => {
      const newValues = { ...prev };
      const parts = path.split('.');
      let current: any = newValues;
      
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      
      return newValues;
    });
  };

  // Handle photo upload
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    
    const newPhotos = Array.isArray(formValues.photos) 
      ? [...formValues.photos] 
      : [];
    
    for (const file of Array.from(files)) {
      try {
        console.log('Uploading file:', file.name);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('fire-door-photos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('fire-door-photos')
          .getPublicUrl(fileName);

        console.log('Adding photo to form:', {
          file_path: publicUrl,
          description: '',
          timestamp: new Date().toISOString()
        });

        // Add to photos array
        newPhotos.push({
          file_path: publicUrl,
          description: '',
          timestamp: new Date().toISOString()
        });

        // Update form state immediately after each upload
        setFormValues(prev => ({
          ...prev,
          photos: newPhotos
        }));
      } catch (error: unknown) {
        console.error('Detailed error uploading photo:', error);
        if (error instanceof Error) {
          alert(`Error uploading photo: ${error.message}`);
        } else {
          alert('Error uploading photo');
        }
      }
    }
  };

  // Update the photo deletion handler
  const handlePhotoDelete = async (index: number) => {
    try {
      const photo = formValues.photos[index];
      const fileName = photo.file_path.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('fire-door-photos')
          .remove([fileName]);
      }
      
      const newPhotos = [...formValues.photos];
      newPhotos.splice(index, 1);
      setFormValues(prev => ({
        ...prev,
        photos: newPhotos
      }));
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Error deleting photo');
    }
  };

  // Update handleSubmit
  const handleSubmit = async () => {
    try {
      const submissionData = {
        location_name: formValues.locationName,
        coordinates: formValues.coordinates,
        door_type: formValues.doorType,
        installation_type: formValues.installationType,
        manufacturer: formValues.manufacturer,
        doorset_number: formValues.doorsetNumber,
        date_installed: formValues.dateInstalled.day && formValues.dateInstalled.month && formValues.dateInstalled.year ? `${formValues.dateInstalled.year}-${formValues.dateInstalled.month}-${formValues.dateInstalled.day}` : null,
        fire_rating: formValues.fireRating.integrity && formValues.fireRating.insulation ? `${formValues.fireRating.integrity}/${formValues.fireRating.insulation}` : null,
        door_closer_manufacturer: formValues.doorCloserManufacturer,
        num_hinges: formValues.numHinges,
        hardware_supplier: formValues.hardwareSupplier,
        has_standard_gaps: formValues.hasStandardGaps,
        has_standard_bottom_gap: formValues.hasStandardBottomGap,
        gaps_notes: JSON.stringify(formValues.gapsNotes),
        leaf_dimensions: JSON.stringify(formValues.leafDimensions),
        second_leaf_dimensions: formValues.secondLeafDimensions ? JSON.stringify(formValues.secondLeafDimensions) : null,
        inspection_results: JSON.stringify(formValues.inspection),
        photos: JSON.stringify(formValues.photos),
        additional_notes: formValues.additionalNotes,
        site_conditions: JSON.stringify(formValues.siteConditions),
        door_architrave: formValues.doorArchitrave,
        door_material: JSON.stringify(formValues.doorMaterial),
        building_features: JSON.stringify(formValues.buildingFeatures)
      };

      console.log('Submitting data:', submissionData);

      const { data, error } = await supabase
        .from('fire_door_surveys')
        .insert([submissionData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Success! Data:', data);
      // Reset form
      setFormValues(initialFormState);
      setIsDirty(false);
      onSubmitSuccess?.();
    } catch (error: unknown) {
      console.error('Detailed error:', error);
      if (error instanceof Error) {
        alert(`Error submitting survey: ${error.message}`);
      } else {
        alert('An unknown error occurred while submitting the survey');
      }
    }
  };

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('fire_door_surveys')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        console.log('Supabase connection successful');
      } catch (error) {
        console.error('Supabase connection error:', error);
      }
    };

    testConnection();
  }, []);

  // Add new options objects
  const siteOptions = {
    securityFeatures: [
      'Ordinary Lockset',
      'Electromagnetic Door Closer',
      'Door Access',
      'Motion Sensors',
      'Others'
    ],
    wallSubstrate: ['Masonry', 'Plasterboard', 'Others'],
    wallFinish: ['Painted', 'Others'],
    floorSurface: ['Leveled', 'Sloping inward/outward'],
    floorFinish: ['Concrete', 'Carpet', 'Vinyl', 'Wood', 'With Threshold'],
    doorArchitrave: ['With', 'Without'],
    doorMaterial: [
      'Timber Leaf and Timber Frame',
      'Timber Leaf and Steel Frame',
      'Steel Leaf and Steel Frame',
      'Others'
    ]
  };

  // Add new component for "Other Specify" fields
  const DropdownWithOther = ({ 
    label, 
    options, 
    value, 
    otherValue, 
    onChange 
  }: { 
    label: string;
    options: string[];
    value: string;
    otherValue?: string;
    onChange: (value: string, otherValue?: string) => void;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <select
        className="w-full p-2 border rounded"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      {value === 'Others' && (
        <input
          type="text"
          className="w-full p-2 border rounded mt-2"
          placeholder="Please specify..."
          value={otherValue || ''}
          onChange={(e) => onChange(value, e.target.value)}
        />
      )}
    </div>
  );

  // Add validation function
  const validateGaps = (gaps: FormValues['gaps']): boolean => {
    if (gaps.top !== null && gaps.top > 3) return false;
    if (gaps.leftSide !== null && gaps.leftSide > 3) return false;
    if (gaps.rightSide !== null && gaps.rightSide > 3) return false;
    if (gaps.bottom !== null && (gaps.bottom < 3 || gaps.bottom > 10)) return false;
    if (gaps.inBetween !== null && (gaps.inBetween < 3 || gaps.inBetween > 4)) return false;
    if (gaps.protrusion !== null && gaps.protrusion > 1) return false;
    return true;
  };

  // Update the options object
  const buildingOptions = {
    security: [
      'Ordinary Lockset',
      'Electromagnetic Door Closer',
      'Door Access',
      'Motion Sensors',
      'More'
    ],
    wallSubstrate: [
      'Masonry',
      'Plasterboard',
      'Other'
    ],
    wallFinish: [
      'Painted',
      'Other'
    ],
    doorArchitrave: [
      'With',
      'Without'
    ],
    floorSurface: [
      'Leveled',
      'Sloping inward/outward'
    ],
    floorFinish: [
      'Concrete',
      'Carpet',
      'Vinyl',
      'Wood',
      'With Threshold',
      'Other'
    ]
  };

  // Update the inspection options
  const inspectionOptions = {
    doorLeaf: ['Chipped', 'Cracked', 'With Voids', 'Altered', 'Binding'],
    doorLeafMaterial: ['Damaged', 'Incorrect Type', 'Poor Condition'],
    doorFrame: ['Chipped', 'Cracked', 'With Voids', 'Altered'],
    doorFrameMaterial: ['Damaged', 'Incorrect Type', 'Poor Condition'],
    visionPanel: ['Cracked', 'Scratched', 'Incorrect Type', 'Not Secure'],
    intumescentSeal: ['Missing', 'Damaged', 'Incomplete', 'Wrong Type'],
    smokeSeal: ['Missing', 'Damaged', 'Incomplete', 'Wrong Type'],
    hinges: ['Loose', 'Missing Screws', 'Damaged', 'Wrong Type'],
    doorCloser: ['Not Closing Properly', 'Damaged', 'Wrong Type'],
    hardware: ['Loose', 'Damaged', 'Wrong Type', 'Not Functioning'],
    fireTag: ['Missing', 'Damaged', 'Incorrect', 'Not Visible'],
    doorSignage: ['Missing', 'Damaged', 'Incorrect', 'Not Visible']
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-8">Fire Door Survey</h1>

      {/* Location Details Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Location Details" 
          section="location"
          isExpanded={expandedSections.location}
          onToggle={() => toggleSection('location')}
        />
        {expandedSections.location && (
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Location Name</label>
              <input 
                type="text"
                className="w-full p-2 border rounded"
                value={formValues.locationName}
                onChange={(e) => handleInputChange('locationName', e.target.value)}
              />
            </div>

            <div className="h-[400px] relative">
              {isLoadingLocation ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <p>Getting location...</p>
                </div>
              ) : (
                <DynamicMap 
                  center={[formValues.coordinates.lat || -41.2865, formValues.coordinates.lng || 174.7762]}
                  onLocationSelect={(pos) => handleInputChange('coordinates', { lat: pos.lat, lng: pos.lng })}
                >
                  <LocationMarker
                    position={[formValues.coordinates.lat || -41.2865, formValues.coordinates.lng || 174.7762]}
                    onPositionChange={(pos) => handleInputChange('coordinates', { lat: pos.lat, lng: pos.lng })}
                  />
                </DynamicMap>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Door Details Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Door Details" 
          section="doorDetails"
          isExpanded={expandedSections.doorDetails}
          onToggle={() => toggleSection('doorDetails')}
        />
        {expandedSections.doorDetails && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Door Type</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={formValues.doorType}
                  onChange={(e) => {
                    handleInputChange('doorType', e.target.value);
                    setDoorType(e.target.value);
                  }}
                >
                  <option value="single">Single Leaf</option>
                  <option value="double">Double Leaf</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Installation Type</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={formValues.installationType}
                  onChange={(e) => handleInputChange('installationType', e.target.value)}
                >
                  <option value="interior">Interior</option>
                  <option value="exterior">Exterior</option>
                </select>
              </div>
            </div>

            <h3 className="font-semibold mb-4">Fire Door Tagging</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Manufacturer</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formValues.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Doorset Number</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formValues.doorsetNumber}
                  onChange={(e) => handleInputChange('doorsetNumber', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Installed</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="DD"
                    className="w-full p-2 border rounded"
                    min="1"
                    max="31"
                    value={formValues.dateInstalled.day}
                    onChange={(e) => handleInputChange('dateInstalled', {
                      ...formValues.dateInstalled,
                      day: e.target.value
                    })}
                  />
                  <input
                    type="number"
                    placeholder="MM"
                    className="w-full p-2 border rounded"
                    min="1"
                    max="12"
                    value={formValues.dateInstalled.month}
                    onChange={(e) => handleInputChange('dateInstalled', {
                      ...formValues.dateInstalled,
                      month: e.target.value
                    })}
                  />
                  <input
                    type="number"
                    placeholder="YYYY"
                    className="w-full p-2 border rounded"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formValues.dateInstalled.year}
                    onChange={(e) => handleInputChange('dateInstalled', {
                      ...formValues.dateInstalled,
                      year: e.target.value
                    })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fire Resistance Rating (-/XX/XX)</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg">-/</span>
                  <input
                    type="number"
                    className="w-20 p-2 border rounded"
                    value={formValues.fireRating.integrity}
                    onChange={(e) => handleInputChange('fireRating', {
                      ...formValues.fireRating,
                      integrity: e.target.value
                    })}
                  />
                  <span className="text-lg">/</span>
                  <input
                    type="number"
                    className="w-20 p-2 border rounded"
                    value={formValues.fireRating.insulation}
                    onChange={(e) => handleInputChange('fireRating', {
                      ...formValues.fireRating,
                      insulation: e.target.value
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Components & Hardware Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Components & Hardware" 
          section="components"
          isExpanded={expandedSections.components}
          onToggle={() => toggleSection('components')}
        />
        {expandedSections.components && (
          <div className="p-6 space-y-6">
            {/* Door Closer Sub-section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Door Closer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded"
                    value={formValues.doorCloser.brand}
                    onChange={(e) => handleInputChange('doorCloser', {
                      ...formValues.doorCloser,
                      brand: e.target.value
                    })}
                  />
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    className="mr-2"
                    checked={formValues.doorCloser.ceMarking}
                    onChange={(e) => handleInputChange('doorCloser', {
                      ...formValues.doorCloser,
                      ceMarking: e.target.checked
                    })}
                  />
                  <label>CE Marking</label>
                </div>
              </div>
            </div>

            {/* Hinges Sub-section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Hinges</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Number of Sets</label>
                  <input 
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.hinges.numSets}
                    onChange={(e) => handleInputChange('hinges', {
                      ...formValues.hinges,
                      numSets: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded"
                    value={formValues.hinges.brand}
                    onChange={(e) => handleInputChange('hinges', {
                      ...formValues.hinges,
                      brand: e.target.value
                    })}
                  />
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    className="mr-2"
                    checked={formValues.hinges.ceMarking}
                    onChange={(e) => handleInputChange('hinges', {
                      ...formValues.hinges,
                      ceMarking: e.target.checked
                    })}
                  />
                  <label>CE Marking</label>
                </div>
              </div>
            </div>

            {/* Door Handle, Locks, and Latches Sub-section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Door Handle, Locks, and Latches</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input 
                    type="text"
                    className="w-full p-2 border rounded"
                    value={formValues.hardware.brand}
                    onChange={(e) => handleInputChange('hardware', {
                      ...formValues.hardware,
                      brand: e.target.value
                    })}
                  />
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    className="mr-2"
                    checked={formValues.hardware.ceMarking}
                    onChange={(e) => handleInputChange('hardware', {
                      ...formValues.hardware,
                      ceMarking: e.target.checked
                    })}
                  />
                  <label>CE Marking</label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dimensions Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Dimensions" 
          section="dimensions"
          isExpanded={expandedSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        />
        {expandedSections.dimensions && (
          <div className="p-6">
            <h3 className="font-semibold mb-4">Gap Measurements (mm)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Top Gap</label>
                <input 
                  type="number"
                  step="0.1"
                  className={`w-full p-2 border rounded ${
                    formValues.gaps.top !== null && formValues.gaps.top > 3 ? 'border-red-500' : ''
                  }`}
                  value={formValues.gaps.top ?? ''}
                  onChange={(e) => handleInputChange('gaps', {
                    ...formValues.gaps,
                    top: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
                {formValues.gaps.top !== null && formValues.gaps.top > 3 && (
                  <p className="text-red-500 text-sm mt-1">Must not exceed 3mm</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bottom Gap</label>
                <input 
                  type="number"
                  step="0.1"
                  className={`w-full p-2 border rounded ${
                    formValues.gaps.bottom !== null && (formValues.gaps.bottom < 3 || formValues.gaps.bottom > 10) ? 'border-red-500' : ''
                  }`}
                  value={formValues.gaps.bottom ?? ''}
                  onChange={(e) => handleInputChange('gaps', {
                    ...formValues.gaps,
                    bottom: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
                {formValues.gaps.bottom !== null && (formValues.gaps.bottom < 3 || formValues.gaps.bottom > 10) && (
                  <p className="text-red-500 text-sm mt-1">Must be between 3mm and 10mm</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Left Side Gap</label>
                <input 
                  type="number"
                  step="0.1"
                  className={`w-full p-2 border rounded ${
                    formValues.gaps.leftSide !== null && formValues.gaps.leftSide > 3 ? 'border-red-500' : ''
                  }`}
                  value={formValues.gaps.leftSide ?? ''}
                  onChange={(e) => handleInputChange('gaps', {
                    ...formValues.gaps,
                    leftSide: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
                {formValues.gaps.leftSide !== null && formValues.gaps.leftSide > 3 && (
                  <p className="text-red-500 text-sm mt-1">Must not exceed 3mm</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Right Side Gap</label>
                <input 
                  type="number"
                  step="0.1"
                  className={`w-full p-2 border rounded ${
                    formValues.gaps.rightSide !== null && formValues.gaps.rightSide > 3 ? 'border-red-500' : ''
                  }`}
                  value={formValues.gaps.rightSide ?? ''}
                  onChange={(e) => handleInputChange('gaps', {
                    ...formValues.gaps,
                    rightSide: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
                {formValues.gaps.rightSide !== null && formValues.gaps.rightSide > 3 && (
                  <p className="text-red-500 text-sm mt-1">Must not exceed 3mm</p>
                )}
              </div>

              {formValues.doorType === 'double' && (
                <div>
                  <label className="block text-sm font-medium mb-1">In-Between Gap</label>
                  <input 
                    type="number"
                    step="0.1"
                    className={`w-full p-2 border rounded ${
                      formValues.gaps.inBetween !== null && (formValues.gaps.inBetween < 3 || formValues.gaps.inBetween > 4) ? 'border-red-500' : ''
                    }`}
                    value={formValues.gaps.inBetween ?? ''}
                    onChange={(e) => handleInputChange('gaps', {
                      ...formValues.gaps,
                      inBetween: e.target.value ? parseFloat(e.target.value) : null
                    })}
                  />
                  {formValues.gaps.inBetween !== null && (formValues.gaps.inBetween < 3 || formValues.gaps.inBetween > 4) && (
                    <p className="text-red-500 text-sm mt-1">Must be between 3mm and 4mm</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Protrusion from Frame</label>
                <input 
                  type="number"
                  step="0.1"
                  className={`w-full p-2 border rounded ${
                    formValues.gaps.protrusion !== null && formValues.gaps.protrusion > 1 ? 'border-red-500' : ''
                  }`}
                  value={formValues.gaps.protrusion ?? ''}
                  onChange={(e) => handleInputChange('gaps', {
                    ...formValues.gaps,
                    protrusion: e.target.value ? parseFloat(e.target.value) : null
                  })}
                />
                {formValues.gaps.protrusion !== null && formValues.gaps.protrusion > 1 && (
                  <p className="text-red-500 text-sm mt-1">Must not exceed 1mm</p>
                )}
              </div>
            </div>

            <h3 className="font-semibold mb-4">Leaf Dimensions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Width (mm)</label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.width}
                  onChange={(e) => handleInputChange('leafDimensions', {
                    ...formValues.leafDimensions,
                    width: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Height (mm)</label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.height}
                  onChange={(e) => handleInputChange('leafDimensions', {
                    ...formValues.leafDimensions,
                    height: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thickness (mm)</label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.thickness}
                  onChange={(e) => handleInputChange('leafDimensions', {
                    ...formValues.leafDimensions,
                    thickness: e.target.value
                  })}
                />
              </div>
              <div className="md:col-span-3">
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox"
                    className="rounded"
                    checked={formValues.leafDimensions.hasVisionPanel}
                    onChange={(e) => handleInputChange('leafDimensions', {
                      ...formValues.leafDimensions,
                      hasVisionPanel: e.target.checked
                    })}
                  />
                  <label>Vision Panel Present</label>
                </div>
              </div>
            </div>

            {formValues.leafDimensions.hasVisionPanel && (
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Vision Panel Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Width (mm)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.leafDimensions.visionPanel.width}
                      onChange={(e) => handleInputChange('leafDimensions', {
                        ...formValues.leafDimensions,
                        visionPanel: {
                          ...formValues.leafDimensions.visionPanel,
                          width: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Height (mm)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.leafDimensions.visionPanel.height}
                      onChange={(e) => handleInputChange('leafDimensions', {
                        ...formValues.leafDimensions,
                        visionPanel: {
                          ...formValues.leafDimensions.visionPanel,
                          height: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Material</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={formValues.leafDimensions.visionPanelMaterial}
                      onChange={(e) => handleInputChange('leafDimensions', {
                        ...formValues.leafDimensions,
                        visionPanelMaterial: e.target.value
                      })}
                    >
                      <option value="clear">Clear Glass</option>
                      <option value="mesh">Mesh Glass</option>
                      <option value="wire">Wired Glass</option>
                      <option value="ceramic">Ceramic Glass</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {formValues.doorType === 'double' && (
              <div className="mt-6">
                <h4 className="font-medium mb-2">Second Leaf Dimensions (R)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Width (mm)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.width}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions,
                        width: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Height (mm)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.height}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions,
                        height: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Thickness (mm)</label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.thickness}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions,
                        thickness: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inspection Checklist Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Inspection Checklist" 
          section="inspection"
          isExpanded={expandedSections.inspection}
          onToggle={() => toggleSection('inspection')}
        />
        {expandedSections.inspection && (
          <div className="p-6">
            <DropdownWithNotes 
              label="Door Leaf Status" 
              options={statusOptions.doorLeaf}
              value={formValues.inspection.doorLeaf.status}
              onChange={(value) => handleStatusChange('inspection.doorLeaf.status', value)}
              notes={formValues.inspection.doorLeaf.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorLeaf.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Frame Status" 
              options={statusOptions.doorFrame}
              value={formValues.inspection.doorFrame.status}
              onChange={(value) => handleStatusChange('inspection.doorFrame.status', value)}
              notes={formValues.inspection.doorFrame.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorFrame.notes', value)}
            />

            <DropdownWithNotes 
              label="Vision Panel Status" 
              options={statusOptions.visionPanel}
              value={formValues.inspection.visionPanel.status}
              onChange={(value) => handleStatusChange('inspection.visionPanel.status', value)}
              notes={formValues.inspection.visionPanel.notes}
              onNotesChange={(value) => handleNotesChange('inspection.visionPanel.notes', value)}
            />

            <DropdownWithNotes 
              label="Intumescent Seal" 
              options={statusOptions.seals}
              value={formValues.inspection.intumescentSeal.status}
              onChange={(value) => handleStatusChange('inspection.intumescentSeal.status', value)}
              notes={formValues.inspection.intumescentSeal.notes}
              onNotesChange={(value) => handleNotesChange('inspection.intumescentSeal.notes', value)}
            />

            <DropdownWithNotes 
              label="Smoke Seal" 
              options={statusOptions.seals}
              value={formValues.inspection.smokeSeal.status}
              onChange={(value) => handleStatusChange('inspection.smokeSeal.status', value)}
              notes={formValues.inspection.smokeSeal.notes}
              onNotesChange={(value) => handleNotesChange('inspection.smokeSeal.notes', value)}
            />

            <DropdownWithNotes 
              label="Hinges Status" 
              options={statusOptions.hinges}
              value={formValues.inspection.hinges.status}
              onChange={(value) => handleStatusChange('inspection.hinges.status', value)}
              notes={formValues.inspection.hinges.notes}
              onNotesChange={(value) => handleNotesChange('inspection.hinges.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Closer Status" 
              options={statusOptions.doorCloser}
              value={formValues.inspection.doorCloser.status}
              onChange={(value) => handleStatusChange('inspection.doorCloser.status', value)}
              notes={formValues.inspection.doorCloser.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorCloser.notes', value)}
            />

            <DropdownWithNotes 
              label="Hardware Status" 
              options={statusOptions.hardware}
              value={formValues.inspection.hardware.status}
              onChange={(value) => handleStatusChange('inspection.hardware.status', value)}
              notes={formValues.inspection.hardware.notes}
              onNotesChange={(value) => handleNotesChange('inspection.hardware.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Tag Status" 
              options={statusOptions.doorTag}
              value={formValues.inspection.fireTag.status}
              onChange={(value) => handleStatusChange('inspection.fireTag.status', value)}
              notes={formValues.inspection.fireTag.notes}
              onNotesChange={(value) => handleNotesChange('inspection.fireTag.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Indicator Status" 
              options={statusOptions.doorIndicator}
              value={formValues.inspection.doorSignage.status}
              onChange={(value) => handleStatusChange('inspection.doorSignage.status', value)}
              notes={formValues.inspection.doorSignage.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorSignage.notes', value)}
            />
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Photos" 
          section="photos"
          isExpanded={expandedSections.photos}
          onToggle={() => toggleSection('photos')}
        />
        {expandedSections.photos && (
          <div className="p-6">
            <div className="mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  id="photo-upload"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                <label htmlFor="photo-upload" className="cursor-pointer">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload photos or use camera</p>
                </label>
              </div>
            </div>

            {formValues.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {formValues.photos.map((photo, index) => (
                  <div key={index} className="border rounded p-4">
                    <img 
                      src={photo.file_path} 
                      alt={photo.description || `Photo ${index + 1}`}
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Photo {index + 1}</span>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => handlePhotoDelete(index)}
                      >
                        Delete
                      </button>
                    </div>
                    <input
                      type="text"
                      className="w-full p-2 border rounded"
                      placeholder="Photo description..."
                      value={photo.description}
                      onChange={(e) => {
                        const newPhotos = formValues.photos.map((p, i) => 
                          i === index 
                            ? { ...p, description: e.target.value }
                            : p
                        );
                        setFormValues(prev => ({
                          ...prev,
                          photos: newPhotos
                        }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={formValues.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder="Any additional notes about the photos or general observations..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Building Features Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Building Features" 
          section="buildingFeatures"
          isExpanded={expandedSections.buildingFeatures}
          onToggle={() => toggleSection('buildingFeatures')}
        />
        {expandedSections.buildingFeatures && (
          <div className="p-6 space-y-6">
            {/* Security Features */}
            <div className="space-y-4">
              <h3 className="font-semibold">Security Features</h3>
              <div className="space-y-2">
                {buildingOptions.security.map(feature => (
                  <label key={feature} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formValues.buildingFeatures.security.features.includes(feature)}
                      onChange={(e) => {
                        const newFeatures = e.target.checked
                          ? [...formValues.buildingFeatures.security.features, feature]
                          : formValues.buildingFeatures.security.features.filter(f => f !== feature);
                        handleInputChange('buildingFeatures', {
                          ...formValues.buildingFeatures,
                          security: {
                            ...formValues.buildingFeatures.security,
                            features: newFeatures
                          }
                        });
                      }}
                    />
                    {feature}
                  </label>
                ))}
              </div>
              {formValues.buildingFeatures.security.features.includes('More') && (
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Please specify additional security features..."
                  value={formValues.buildingFeatures.security.moreDetails || ''}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    security: {
                      ...formValues.buildingFeatures.security,
                      moreDetails: e.target.value
                    }
                  })}
                />
              )}
            </div>

            {/* Wall */}
            <div className="space-y-4">
              <h3 className="font-semibold">Wall</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Substrate</label>
                <select
                  className="w-full p-2 border rounded mb-2"
                  value={formValues.buildingFeatures.wall.substrate}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    wall: {
                      ...formValues.buildingFeatures.wall,
                      substrate: e.target.value
                    }
                  })}
                >
                  {buildingOptions.wallSubstrate.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {formValues.buildingFeatures.wall.substrate === 'Other' && (
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Please specify substrate..."
                    value={formValues.buildingFeatures.wall.substrateOther || ''}
                    onChange={(e) => handleInputChange('buildingFeatures', {
                      ...formValues.buildingFeatures,
                      wall: {
                        ...formValues.buildingFeatures.wall,
                        substrateOther: e.target.value
                      }
                    })}
                  />
                )}
              </div>

              {/* Wall Finish */}
              <div>
                <label className="block text-sm font-medium mb-1">Wall Finish</label>
                <select
                  className="w-full p-2 border rounded mb-2"
                  value={formValues.buildingFeatures.wall.finish}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    wall: {
                      ...formValues.buildingFeatures.wall,
                      finish: e.target.value
                    }
                  })}
                >
                  {buildingOptions.wallFinish.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {formValues.buildingFeatures.wall.finish === 'Other' && (
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Please specify wall finish..."
                    value={formValues.buildingFeatures.wall.finishOther || ''}
                    onChange={(e) => handleInputChange('buildingFeatures', {
                      ...formValues.buildingFeatures,
                      wall: {
                        ...formValues.buildingFeatures.wall,
                        finishOther: e.target.value
                      }
                    })}
                  />
                )}
              </div>

              {/* Door Architrave */}
              <div>
                <label className="block text-sm font-medium mb-1">Door Architrave</label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.buildingFeatures.wall.architrave}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    wall: {
                      ...formValues.buildingFeatures.wall,
                      architrave: e.target.value
                    }
                  })}
                >
                  {buildingOptions.doorArchitrave.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Floor */}
            <div className="space-y-4">
              <h3 className="font-semibold">Floor</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Floor Surface</label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.buildingFeatures.floor.surface}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    floor: {
                      ...formValues.buildingFeatures.floor,
                      surface: e.target.value
                    }
                  })}
                >
                  {buildingOptions.floorSurface.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Floor Finish</label>
                <div className="space-y-2">
                  {buildingOptions.floorFinish.map(finish => (
                    <label key={finish} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formValues.buildingFeatures.floor.finish.includes(finish)}
                        onChange={(e) => {
                          const newFinishes = e.target.checked
                            ? [...formValues.buildingFeatures.floor.finish, finish]
                            : formValues.buildingFeatures.floor.finish.filter(f => f !== finish);
                          handleInputChange('buildingFeatures', {
                            ...formValues.buildingFeatures,
                            floor: {
                              ...formValues.buildingFeatures.floor,
                              finish: newFinishes
                            }
                          });
                        }}
                      />
                      {finish}
                    </label>
                  ))}
                </div>
                {formValues.buildingFeatures.floor.finish.includes('Other') && (
                  <input
                    type="text"
                    className="w-full p-2 border rounded mt-2"
                    placeholder="Please specify floor finish..."
                    value={formValues.buildingFeatures.floor.finishOther || ''}
                    onChange={(e) => handleInputChange('buildingFeatures', {
                      ...formValues.buildingFeatures,
                      floor: {
                        ...formValues.buildingFeatures.floor,
                        finishOther: e.target.value
                      }
                    })}
                  />
                )}
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Additional Notes</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={formValues.buildingFeatures.notes}
                onChange={(e) => handleInputChange('buildingFeatures', {
                  ...formValues.buildingFeatures,
                  notes: e.target.value
                })}
                placeholder="Any additional notes about building features..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Door Architrave Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Door Architrave" 
          section="doorArchitrave"
          isExpanded={expandedSections.doorArchitrave}
          onToggle={() => toggleSection('doorArchitrave')}
        />
        {expandedSections.doorArchitrave && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Door Architrave</label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.doorArchitrave}
                  onChange={(e) => handleInputChange('doorArchitrave', e.target.value)}
                >
                  {siteOptions.doorArchitrave.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Door Material Section */}
      <div className="bg-white rounded-lg shadow">
        <SectionHeader 
          title="Door Material" 
          section="doorMaterial"
          isExpanded={expandedSections.doorMaterial}
          onToggle={() => toggleSection('doorMaterial')}
        />
        {expandedSections.doorMaterial && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Door Material</label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.doorMaterial.type}
                  onChange={(e) => handleInputChange('doorMaterial', {
                    ...formValues.doorMaterial,
                    type: e.target.value
                  })}
                >
                  {siteOptions.doorMaterial.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Other Specify</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={formValues.doorMaterial.otherSpecify}
                  onChange={(e) => handleInputChange('doorMaterial', {
                    ...formValues.doorMaterial,
                    otherSpecify: e.target.value
                  })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <button 
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          onClick={() => {
            if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
              setFormValues(initialFormState);
            }
          }}
        >
          Cancel
        </button>
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={!isDirty}
        >
          Submit Survey
        </button>
      </div>
    </div>
  );
};