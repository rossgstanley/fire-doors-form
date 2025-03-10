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
  <div className="mb-6">
    <label className="block text-sm font-medium mb-2">{label}</label>
    <div className="space-y-4">
      {/* Checkboxes for issues */}
      <div className="border rounded p-4 space-y-2">
        {options.map(option => (
          <label key={option} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={(e) => {
                const newValue = e.target.checked
                  ? [...value, option]
                  : value.filter(v => v !== option);
                onChange(newValue.length ? newValue : []);  // Empty array if no issues selected
              }}
              className="w-4 h-4"
            />
            {option}
          </label>
        ))}
      </div>

      {/* Notes textarea */}
      <textarea
        className="w-full p-2 border rounded mt-2"
        placeholder="Additional notes..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={3}
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
type SectionName = 'location' | 'doorDetails' | 'components' | 'dimensions' | 'buildingFeatures' | 'inspection' | 'photos';

// First update the FormValues interface for inspection items
interface InspectionItem {
  status: string[];  // Always an array, ['OK'] for passing state
  notes: string;
}

// Update FormValues interface to remove unused properties
interface FormValues {
  locationName: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  };
  doorType: string;
  installationType: string;
  manufacturer: string;
  doorsetNumber: string;
  dateManufactured: {
    month: string;
    year: string;
  };
  fireRating: {
    integrity: string;
    insulation: string;
    smokeControl: string;
  };
  doorCloser: {
    brand: string;
    ceMarking: boolean;
    status: string[];
    notes: string;
  };
  hinges: {
    numSets: number | null;
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
    leftDoor?: {
      top: number | null;
      bottom: number | null;
    };
    rightDoor?: {
      top: number | null;
      bottom: number | null;
    };
  };
  buildingFeatures: {
    security: {
      features: string[];
      moreDetails: string;
    };
    wall: {
      substrate: string;
      substrateOther: string;
      finish: string;
      finishOther: string;
      architrave: string;
    };
    floor: {
      surface: string;
      finish: string[];
      finishOther: string;
    };
    notes: string;
    doorLeafMaterial: string;
    doorFrameMaterial: string;
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
    doorCloser: InspectionItem & { slowClosing: boolean };
    hardware: InspectionItem & { rattling: boolean };
    fireTag: InspectionItem;
    doorSignage: InspectionItem & {
      oneSideOnly: boolean;
      notNZS4520: boolean;
    };
  };
  photos: Array<{
    file_path: string;
    description: string;
    timestamp: string;
  }>;
  additionalNotes: string;
}

type FormField = keyof FormValues;

// Add a refresh prop to the component
interface FireDoorSurveyProps {
  onSubmitSuccess?: () => void;
}

export const FireDoorSurvey: React.FC<FireDoorSurveyProps> = ({ onSubmitSuccess }) => {
  // Update the status options to remove 'OK'
  const statusOptions = {
    doorLeaf: ['Chipped', 'Cracked', 'With Voids', 'Altered', 'Binding'],
    doorFrame: ['Chipped', 'Cracked', 'With Voids', 'Altered'],
    visionPanel: ['Not Present', 'Cracked', 'Scratched'],
    seals: ['Loose', 'Incomplete', 'Missing', 'With Tears', 'Painted'],
    hinges: ['Loose Screw', 'Missing Screw', 'Squeaky', 'Misaligned', 'Rusty/Tarnished'],
    doorCloser: ['Delayed/Not Closing', 'Rapid Closing', 'Unusual Noise'],
    hardware: ['Sticky Locks', 'Loose Locks', 'Misaligned', 'Needs Lubrication'],
    doorTag: ['Missing', 'Unreadable', 'Painted'],
    doorIndicator: ['Missing', 'Peeled-off/Unreadable']
  };

  // Section visibility state
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    doorDetails: true,
    components: true,
    dimensions: true,
    buildingFeatures: true,
    inspection: true,
    photos: true
  });

  // Door type state
  const [doorType, setDoorType] = useState('single');
  
  // Add these near the top of the component
  const initialFormState: FormValues = {
    locationName: '',
    coordinates: { 
      lat: null,  // Start with null
      lng: null   // Start with null
    },
    doorType: 'single',
    installationType: 'interior',
    manufacturer: '',
    doorsetNumber: '',
    dateManufactured: { 
      month: '', 
      year: '' 
    },
    fireRating: { 
      integrity: '', 
      insulation: '',
      smokeControl: ''
    },
    doorCloser: {
      brand: '',
      ceMarking: false,
      status: [],
      notes: ''
    },
    hinges: {
      numSets: null,
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
    leafDimensions: {
      width: '',
      height: '',
      thickness: '',
      hasVisionPanel: false,
      visionPanelMaterial: 'clear',
      visionPanel: { 
        width: '', 
        height: '' 
      }
    },
    secondLeafDimensions: {
      width: '',
      height: '',
      thickness: '',
      hasVisionPanel: false,
      visionPanelMaterial: 'clear',
      visionPanel: { 
        width: '', 
        height: '' 
      }
    },
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
        substrate: '',
        substrateOther: '',
        finish: '',
        finishOther: '',
        architrave: 'With'
      },
      floor: {
        surface: 'Leveled',
        finish: [],
        finishOther: ''
      },
      notes: '',
      doorLeafMaterial: '',
      doorFrameMaterial: ''
    },
    inspection: {
      doorLeaf: { status: [], notes: '' },
      doorLeafMaterial: { status: [], notes: '' },
      doorFrame: { status: [], notes: '' },
      doorFrameMaterial: { status: [], notes: '' },
      visionPanel: { status: [], notes: '' },
      intumescentSeal: { status: [], notes: '' },
      smokeSeal: { status: [], notes: '' },
      hinges: { status: [], notes: '' },
      doorCloser: { status: [], notes: '', slowClosing: false },
      hardware: { status: [], notes: '', rattling: false },
      fireTag: { status: [], notes: '' },
      doorSignage: { status: [], notes: '', oneSideOnly: false, notNZS4520: false }
    },
    photos: [],
    additionalNotes: ''
  };

  // Add state to track form changes
  const [isDirty, setIsDirty] = useState(false);

  // Update form state initialization
  const [formValues, setFormValues] = useState<FormValues>(initialFormState);

  // Near the top of the component, after initialFormState
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Add state to control location updates
  const [stopLocationUpdates, setStopLocationUpdates] = useState(false);

  // Add this helper function near the top of the component
  const preventScroll = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  useEffect(() => {
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleInputChange('coordinates', {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLoadingLocation(false);
        },
        (error) => {
          console.warn('Location error:', error.message);
          // Default to Wellington only if geolocation fails
          handleInputChange('coordinates', { 
            lat: -41.2865, 
            lng: 174.7762 
          });
          setIsLoadingLocation(false);
        }
      );
    }
  }, []);

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

  // Update the handlePhotoUpload function
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    
    for (const file of Array.from(files)) {
      try {
        // Convert file to data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const newPhoto = {
            file_path: reader.result as string,
            description: '',
            timestamp: new Date().toISOString()
          };

          setFormValues(prev => ({
            ...prev,
            photos: [...prev.photos, newPhoto]
          }));
        };
        reader.readAsDataURL(file);

      } catch (error) {
        console.error('Error handling photo:', error);
        alert('Error adding photo');
      }
    }
  };

  // Update the handlePhotoDelete function
  const handlePhotoDelete = (index: number) => {
    setFormValues(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // Add this helper function to check survey status
  const getSurveyStatus = (formValues: FormValues) => {
    const failures = [];

    // Check gaps - only add if they fail
    if (formValues.gaps.top !== null && formValues.gaps.top > 3) {
      failures.push('Top gap exceeds 3mm');
    }
    if (formValues.gaps.bottom !== null && (formValues.gaps.bottom < 3 || formValues.gaps.bottom > 10)) {
      failures.push('Bottom gap not between 3mm and 10mm');
    }
    if (formValues.gaps.leftSide !== null && formValues.gaps.leftSide > 3) {
      failures.push('Left side gap exceeds 3mm');
    }
    if (formValues.gaps.rightSide !== null && formValues.gaps.rightSide > 3) {
      failures.push('Right side gap exceeds 3mm');
    }
    if (formValues.gaps.inBetween !== null && (formValues.gaps.inBetween < 3 || formValues.gaps.inBetween > 10)) {
      failures.push('In-between gap not between 3mm and 10mm');  // Updated range
    }
    if (formValues.gaps.protrusion !== null && formValues.gaps.protrusion > 1) {
      failures.push('Protrusion exceeds 1mm');
    }

    // Check inspection items - only add if they have issues
    const criticalInspectionItems = {
      'Door Leaf': formValues.inspection.doorLeaf,
      'Door Frame': formValues.inspection.doorFrame,
      'Intumescent Seal': formValues.inspection.intumescentSeal,
      'Smoke Seal': formValues.inspection.smokeSeal,
      'Hinges': formValues.inspection.hinges,
      'Door Closer': formValues.inspection.doorCloser,
      'Locks and Latches': formValues.inspection.hardware,
      'Door Tag': formValues.inspection.fireTag,
      'Door Signage': formValues.inspection.doorSignage
    };

    Object.entries(criticalInspectionItems).forEach(([itemName, item]) => {
      if (item.status.length > 0) {
        failures.push(`${itemName} issues: ${item.status.join(', ')}`);
      }
    });

    return {
      passed: failures.length === 0,
      failures: failures // Only contains actual failures
    };
  };

  // Add validation function for required fields
  const validateRequiredFields = (): { isValid: boolean; missingFields: string[] } => {
    const missingFields: string[] = [];
    
    // Door Details
    if (!formValues.doorType) missingFields.push('Door Type');
    if (!formValues.installationType) missingFields.push('Installation Type');
    if (!formValues.fireRating.integrity || !formValues.fireRating.insulation) missingFields.push('Fire Resistance Rating');
    
    // Components
    if (!formValues.doorCloser.brand) missingFields.push('Door Closer Brand');
    if (formValues.hinges.numSets === null) missingFields.push('Number of Hinges');
    
    // Dimensions - Leaf
    if (!formValues.leafDimensions.width) missingFields.push('Leaf Width');
    if (!formValues.leafDimensions.height) missingFields.push('Leaf Height');
    if (!formValues.leafDimensions.thickness) missingFields.push('Leaf Thickness');
    
    // Vision Panel - First Leaf (if present)
    if (formValues.leafDimensions.hasVisionPanel) {
      if (!formValues.leafDimensions.visionPanel.width) missingFields.push('First Leaf Vision Panel Width');
      if (!formValues.leafDimensions.visionPanel.height) missingFields.push('First Leaf Vision Panel Height');
      if (!formValues.leafDimensions.visionPanelMaterial) missingFields.push('First Leaf Vision Panel Material');
    }
    
    // Second Leaf Dimensions (if double door)
    if (formValues.doorType === 'double') {
      if (!formValues.secondLeafDimensions?.width) missingFields.push('Second Leaf Width');
      if (!formValues.secondLeafDimensions?.height) missingFields.push('Second Leaf Height');
      if (!formValues.secondLeafDimensions?.thickness) missingFields.push('Second Leaf Thickness');
      
      // Vision Panel - Second Leaf (if present)
      if (formValues.secondLeafDimensions?.hasVisionPanel) {
        if (!formValues.secondLeafDimensions?.visionPanel?.width) missingFields.push('Second Leaf Vision Panel Width');
        if (!formValues.secondLeafDimensions?.visionPanel?.height) missingFields.push('Second Leaf Vision Panel Height');
        if (!formValues.secondLeafDimensions?.visionPanelMaterial) missingFields.push('Second Leaf Vision Panel Material');
      }
    }
    
    // Gap Measurements
    if (formValues.gaps.leftSide === null) missingFields.push('Left Side Gap');
    if (formValues.gaps.rightSide === null) missingFields.push('Right Side Gap');
    if (formValues.gaps.protrusion === null) missingFields.push('Protrusion from Frame');
    
    // For single leaf door
    if (formValues.doorType === 'single') {
      if (formValues.gaps.top === null) missingFields.push('Top Gap');
      if (formValues.gaps.bottom === null) missingFields.push('Bottom Gap');
    }
    
    // For double leaf door
    if (formValues.doorType === 'double') {
      if (formValues.gaps.inBetween === null) missingFields.push('In-Between Gap');
      
      // Left door gaps
      if (formValues.gaps.leftDoor?.top === null || formValues.gaps.leftDoor?.top === undefined) {
        missingFields.push('Left Door Top Gap');
      }
      if (formValues.gaps.leftDoor?.bottom === null || formValues.gaps.leftDoor?.bottom === undefined) {
        missingFields.push('Left Door Bottom Gap');
      }
      
      // Right door gaps
      if (formValues.gaps.rightDoor?.top === null || formValues.gaps.rightDoor?.top === undefined) {
        missingFields.push('Right Door Top Gap');
      }
      if (formValues.gaps.rightDoor?.bottom === null || formValues.gaps.rightDoor?.bottom === undefined) {
        missingFields.push('Right Door Bottom Gap');
      }
    }
    
    // Building Features
    if (!formValues.buildingFeatures.doorLeafMaterial) missingFields.push('Door Leaf Material');
    if (!formValues.buildingFeatures.doorFrameMaterial) missingFields.push('Door Frame Material');
    
    // Photos
    if (formValues.photos.length === 0) missingFields.push('At least one photo');
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  };

  // State for validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update handleSubmit
  const handleSubmit = async () => {
    try {
      // Validate required fields
      const { isValid, missingFields } = validateRequiredFields();
      
      if (!isValid) {
        setValidationErrors(missingFields);
        // Scroll to top to show validation errors
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      
      // Clear any previous validation errors
      setValidationErrors([]);
      
      const { passed } = getSurveyStatus(formValues);

      // Default coordinates (Wellington)
      const defaultLat = -41.2865;
      const defaultLng = 174.7762;

      // Use actual coordinates or defaults
      const lat = formValues.coordinates.lat ?? defaultLat;
      const lng = formValues.coordinates.lng ?? defaultLng;

      const submissionData = {
        location_name: formValues.locationName,
        latitude: lat,
        longitude: lng,
        location: `POINT(${lng} ${lat})`,
        coordinates: `POINT(${lng} ${lat})`,
        door_type: formValues.doorType,
        installation_type: formValues.installationType,
        manufacturer: formValues.manufacturer,
        doorset_number: formValues.doorsetNumber,
        date_manufactured: formValues.dateManufactured.month && formValues.dateManufactured.year 
          ? `${formValues.dateManufactured.year}-${formValues.dateManufactured.month}-01` 
          : null,
        fire_rating: formValues.fireRating.integrity && formValues.fireRating.insulation 
          ? `${formValues.fireRating.integrity}/${formValues.fireRating.insulation}${formValues.fireRating.smokeControl ? ' sm' : ''}` 
          : null,
        door_closer: JSON.stringify({
          brand: formValues.doorCloser.brand,
          ceMarking: formValues.doorCloser.ceMarking
        }),
        hinges: JSON.stringify({
          numSets: formValues.hinges.numSets,
          brand: formValues.hinges.brand,
          ceMarking: formValues.hinges.ceMarking
        }),
        hardware: JSON.stringify({
          brand: formValues.hardware.brand,
          ceMarking: formValues.hardware.ceMarking
        }),
        leaf_dimensions: JSON.stringify(formValues.leafDimensions),
        second_leaf_dimensions: formValues.secondLeafDimensions ? JSON.stringify(formValues.secondLeafDimensions) : null,
        gaps: JSON.stringify(formValues.gaps),
        building_features: JSON.stringify(formValues.buildingFeatures),
        inspection_results: JSON.stringify(formValues.inspection),
        photos: JSON.stringify(formValues.photos),
        additional_notes: formValues.additionalNotes,
        pass_fail: passed
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
      'Other'
    ],
    wallSubstrate: [
      '',
      'Masonry',
      'Plasterboard',
      'Other'
    ],
    wallFinish: [
      '',
      'Painted',
      'Other'
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
    ],
    doorArchitrave: [
      'With',
      'Without'
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

  // Add number input restriction helper
  const handleNumberInput = (e: React.KeyboardEvent<HTMLInputElement>, allowDecimal = false, allowNegative = false) => {
    const allowedKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ];
    
    if (allowDecimal) allowedKeys.push('.');
    if (allowNegative) allowedKeys.push('-');

    if (!allowedKeys.includes(e.key)) {
      e.preventDefault();
    }

    // Only allow one decimal point
    if (allowDecimal && e.key === '.' && (e.target as HTMLInputElement).value.includes('.')) {
      e.preventDefault();
    }

    // Only allow negative at start
    if (allowNegative && e.key === '-' && (e.target as HTMLInputElement).value !== '') {
      e.preventDefault();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-8">Fire Door Survey</h1>

      {/* Validation Error Message */}
      {validationErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5" />
            <div className="text-red-600">
              <p className="font-medium mb-2">Please fill in the following required fields:</p>
              <ul className="list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Location Details Section - Map hidden but still tracking coordinates */}
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
            {/* Map component hidden but still tracking coordinates in the background */}
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
                <label className="block text-sm font-medium mb-1">
                  Door Type <span className="text-red-500">*</span>
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  Installation Type <span className="text-red-500">*</span>
                </label>
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

            <h3 className="font-semibold mb-4">Fire Door Tag</h3>
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
                <label className="block text-sm font-medium mb-1">Date Manufactured</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="MM"
                    className="w-full p-2 border rounded"
                    min="1"
                    max="12"
                    value={formValues.dateManufactured.month}
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('dateManufactured', {
                      ...formValues.dateManufactured,
                      month: e.target.value
                    })}
                  />
                  <input
                    type="number"
                    placeholder="YYYY"
                    className="w-full p-2 border rounded"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={formValues.dateManufactured.year}
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('dateManufactured', {
                      ...formValues.dateManufactured,
                      year: e.target.value
                    })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fire Resistance Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg">-/</span>
                  <input
                    type="number"
                    className="w-20 p-2 border rounded"
                    value={formValues.fireRating.integrity}
                    min="0"
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
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
                    min="0"
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('fireRating', {
                      ...formValues.fireRating,
                      insulation: e.target.value
                    })}
                  />
                  <select
                    className="w-24 p-2 border rounded"
                    value={formValues.fireRating.smokeControl || ''}
                    onChange={(e) => handleInputChange('fireRating', {
                      ...formValues.fireRating,
                      smokeControl: e.target.value
                    })}
                  >
                    <option value=""></option>
                    <option value="sm">sm</option>
                  </select>
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
                  <label className="block text-sm font-medium mb-1">
                    Brand <span className="text-red-500">*</span>
                  </label>
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
                  <label className="block text-sm font-medium mb-1">
                    Number of Sets <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.hinges.numSets ?? ''}
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('hinges', {
                      ...formValues.hinges,
                      numSets: e.target.value ? parseInt(e.target.value) : null
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

            {/* Hardware Sub-section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Hardware</h3>
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
            <h3 className="font-semibold mb-4">Leaf Dimensions (Left)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Width (mm) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.width}
                  onWheel={preventScroll}
                  onKeyDown={(e) => handleNumberInput(e)}
                  onChange={(e) => handleInputChange('leafDimensions', {
                    ...formValues.leafDimensions,
                    width: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Height (mm) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.height}
                  onWheel={preventScroll}
                  onKeyDown={(e) => handleNumberInput(e)}
                  onChange={(e) => handleInputChange('leafDimensions', {
                    ...formValues.leafDimensions,
                    height: e.target.value
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Thickness (mm) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded"
                  value={formValues.leafDimensions.thickness}
                  onWheel={preventScroll}
                  onKeyDown={(e) => handleNumberInput(e)}
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
                  <label>Vision Panel</label>
                </div>
              </div>
            </div>

            {/* First leaf vision panel */}
            {formValues.leafDimensions.hasVisionPanel && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Width (mm) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.leafDimensions.visionPanel.width}
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
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
                  <label className="block text-sm font-medium mb-1">
                    Height (mm) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.leafDimensions.visionPanel.height}
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
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
                  <label className="block text-sm font-medium mb-1">
                    Material <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={formValues.leafDimensions.visionPanelMaterial}
                    onChange={(e) => handleInputChange('leafDimensions', {
                      ...formValues.leafDimensions,
                      visionPanelMaterial: e.target.value
                    })}
                  >
                    <option value="clear">Clear</option>
                    <option value="mesh">With Mesh</option>
                  </select>
                </div>
              </div>
            )}

            {/* Second Leaf (if double door) */}
            {formValues.doorType === 'double' && (
              <>
                <h3 className="font-semibold mb-4">Leaf Dimensions (Right)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Width (mm) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.width}
                      onWheel={preventScroll}
                      onKeyDown={(e) => handleNumberInput(e)}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions ?? {
                          width: '',
                          height: '',
                          thickness: '',
                          hasVisionPanel: false,
                          visionPanelMaterial: 'clear',
                          visionPanel: { width: '', height: '' }
                        },
                        width: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Height (mm) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.height}
                      onWheel={preventScroll}
                      onKeyDown={(e) => handleNumberInput(e)}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions ?? {
                          width: '',
                          height: '',
                          thickness: '',
                          hasVisionPanel: false,
                          visionPanelMaterial: 'clear',
                          visionPanel: { width: '', height: '' }
                        },
                        height: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Thickness (mm) <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="number"
                      className="w-full p-2 border rounded"
                      value={formValues.secondLeafDimensions?.thickness}
                      onWheel={preventScroll}
                      onKeyDown={(e) => handleNumberInput(e)}
                      onChange={(e) => handleInputChange('secondLeafDimensions', {
                        ...formValues.secondLeafDimensions ?? {
                          width: '',
                          height: '',
                          thickness: '',
                          hasVisionPanel: false,
                          visionPanelMaterial: 'clear',
                          visionPanel: { width: '', height: '' }
                        },
                        thickness: e.target.value
                      })}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        className="rounded"
                        checked={formValues.secondLeafDimensions?.hasVisionPanel}
                        onChange={(e) => handleInputChange('secondLeafDimensions', {
                          ...formValues.secondLeafDimensions ?? {
                            width: '',
                            height: '',
                            thickness: '',
                            hasVisionPanel: false,
                            visionPanelMaterial: 'clear',
                            visionPanel: { width: '', height: '' }
                          },
                          hasVisionPanel: e.target.checked
                        })}
                      />
                      <label>Vision Panel</label>
                    </div>
                  </div>
                </div>

                {formValues.secondLeafDimensions?.hasVisionPanel && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Width (mm) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.secondLeafDimensions?.visionPanel?.width ?? ''}
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => {
                          const currentDimensions = formValues.secondLeafDimensions ?? {
                            width: '',
                            height: '',
                            thickness: '',
                            hasVisionPanel: true,
                            visionPanelMaterial: 'clear',
                            visionPanel: { width: '', height: '' }
                          };
                          handleInputChange('secondLeafDimensions', {
                            ...currentDimensions,
                            visionPanel: {
                              ...currentDimensions.visionPanel,
                              width: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Height (mm) <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.secondLeafDimensions?.visionPanel?.height ?? ''}
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => {
                          const currentDimensions = formValues.secondLeafDimensions ?? {
                            width: '',
                            height: '',
                            thickness: '',
                            hasVisionPanel: true,
                            visionPanelMaterial: 'clear',
                            visionPanel: { width: '', height: '' }
                          };
                          handleInputChange('secondLeafDimensions', {
                            ...currentDimensions,
                            visionPanel: {
                              ...currentDimensions.visionPanel,
                              height: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Material <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full p-2 border rounded"
                        value={formValues.secondLeafDimensions?.visionPanelMaterial ?? 'clear'}
                        onChange={(e) => {
                          const currentDimensions = formValues.secondLeafDimensions ?? {
                            width: '',
                            height: '',
                            thickness: '',
                            hasVisionPanel: true,
                            visionPanelMaterial: 'clear',
                            visionPanel: { width: '', height: '' }
                          };
                          handleInputChange('secondLeafDimensions', {
                            ...currentDimensions,
                            visionPanelMaterial: e.target.value
                          });
                        }}
                      >
                        <option value="clear">Clear</option>
                        <option value="mesh">With Mesh</option>
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Gap Measurements Sub-section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Gap Measurements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Left Side Gap (mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.gaps.leftSide ?? ''}
                    min="0"
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('gaps', {
                      ...formValues.gaps,
                      leftSide: e.target.value === '' ? null : Number(e.target.value)
                    })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Right Side Gap (mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.gaps.rightSide ?? ''}
                    min="0"
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('gaps', {
                      ...formValues.gaps,
                      rightSide: e.target.value === '' ? null : Number(e.target.value)
                    })}
                  />
                </div>

                {formValues.doorType === 'single' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Top Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.top ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          top: e.target.value === '' ? null : Number(e.target.value)
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Bottom Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.bottom ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          bottom: e.target.value === '' ? null : Number(e.target.value)
                        })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Protrusion from Frame (mm) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={formValues.gaps.protrusion ?? ''}
                    min="0"
                    onWheel={preventScroll}
                    onKeyDown={(e) => handleNumberInput(e)}
                    onChange={(e) => handleInputChange('gaps', {
                      ...formValues.gaps,
                      protrusion: e.target.value === '' ? null : Number(e.target.value)
                    })}
                  />
                </div>

                {formValues.doorType === 'double' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        In-Between Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.inBetween ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          inBetween: e.target.value === '' ? null : Number(e.target.value)
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Left Door Top Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.leftDoor?.top ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          leftDoor: {
                            ...formValues.gaps.leftDoor,
                            top: e.target.value === '' ? null : Number(e.target.value)
                          }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Left Door Bottom Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.leftDoor?.bottom ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          leftDoor: {
                            ...formValues.gaps.leftDoor,
                            bottom: e.target.value === '' ? null : Number(e.target.value)
                          }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Right Door Top Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.rightDoor?.top ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          rightDoor: {
                            ...formValues.gaps.rightDoor,
                            top: e.target.value === '' ? null : Number(e.target.value)
                          }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Right Door Bottom Gap (mm) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={formValues.gaps.rightDoor?.bottom ?? ''}
                        min="0"
                        onWheel={preventScroll}
                        onKeyDown={(e) => handleNumberInput(e)}
                        onChange={(e) => handleInputChange('gaps', {
                          ...formValues.gaps,
                          rightDoor: {
                            ...formValues.gaps.rightDoor,
                            bottom: e.target.value === '' ? null : Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </>
                )}
              </div>
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
            {/* Door Materials - moved to top */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Door Leaf Material <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.buildingFeatures.doorLeafMaterial || ''}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    doorLeafMaterial: e.target.value
                  })}
                >
                  <option value="">Select material...</option>
                  <option value="Timber">Timber</option>
                  <option value="Steel">Steel</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Door Frame Material <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.buildingFeatures.doorFrameMaterial || ''}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    doorFrameMaterial: e.target.value
                  })}
                >
                  <option value="">Select material...</option>
                  <option value="Timber">Timber</option>
                  <option value="Steel">Steel</option>
                </select>
              </div>
            </div>

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
              {formValues.buildingFeatures.security.features.includes('Other') && (
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Please specify other security features..."
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
                <select
                  className="w-full p-2 border rounded"
                  value={formValues.buildingFeatures.floor.finish[0] || ''}
                  onChange={(e) => handleInputChange('buildingFeatures', {
                    ...formValues.buildingFeatures,
                    floor: {
                      ...formValues.buildingFeatures.floor,
                      finish: e.target.value ? [e.target.value] : []
                    }
                  })}
                >
                  {buildingOptions.floorFinish.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
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
              label="Door Leaf" 
              options={statusOptions.doorLeaf}
              value={formValues.inspection.doorLeaf.status}
              onChange={(value) => handleStatusChange('inspection.doorLeaf.status', value)}
              notes={formValues.inspection.doorLeaf.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorLeaf.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Frame" 
              options={statusOptions.doorFrame}
              value={formValues.inspection.doorFrame.status}
              onChange={(value) => handleStatusChange('inspection.doorFrame.status', value)}
              notes={formValues.inspection.doorFrame.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorFrame.notes', value)}
            />

            <DropdownWithNotes 
              label="Vision Panel" 
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
              label="Hinges" 
              options={statusOptions.hinges}
              value={formValues.inspection.hinges.status}
              onChange={(value) => handleStatusChange('inspection.hinges.status', value)}
              notes={formValues.inspection.hinges.notes}
              onNotesChange={(value) => handleNotesChange('inspection.hinges.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Closer" 
              options={statusOptions.doorCloser}
              value={formValues.inspection.doorCloser.status}
              onChange={(value) => handleStatusChange('inspection.doorCloser.status', value)}
              notes={formValues.inspection.doorCloser.notes}
              onNotesChange={(value) => handleNotesChange('inspection.doorCloser.notes', value)}
            />

            <DropdownWithNotes 
              label="Hardware" 
              options={statusOptions.hardware}
              value={formValues.inspection.hardware.status}
              onChange={(value) => handleStatusChange('inspection.hardware.status', value)}
              notes={formValues.inspection.hardware.notes}
              onNotesChange={(value) => handleNotesChange('inspection.hardware.notes', value)}
            />

            <DropdownWithNotes 
              label="Fire Tag" 
              options={statusOptions.doorTag}
              value={formValues.inspection.fireTag.status}
              onChange={(value) => handleStatusChange('inspection.fireTag.status', value)}
              notes={formValues.inspection.fireTag.notes}
              onNotesChange={(value) => handleNotesChange('inspection.fireTag.notes', value)}
            />

            <DropdownWithNotes 
              label="Door Signage" 
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
                  <p className="mt-2 text-sm text-gray-600">Click to upload photos or use camera <span className="text-red-500">*</span></p>
                  <p className="text-xs text-gray-500">(At least one photo required)</p>
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
          </div>
        )}
      </div>

      {/* Survey Status Section */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="font-semibold mb-4">Survey Status</h3>
        {(() => {
          const { passed, failures } = getSurveyStatus(formValues);
          return (
            <div>
              <div className={`text-lg font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {passed ? 'PASS' : 'FAIL'}
              </div>
              {!passed && (
                <div className="mt-2">
                  <p className="font-medium mb-2">Issues found:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {failures.map((failure, index) => (
                      <li key={index}>{failure}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          onClick={handleSubmit}
        >
          Submit Survey
        </button>
      </div>
    </div>
  );
};