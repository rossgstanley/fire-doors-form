'use client'

import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Camera, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DropdownWithNotesProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}

// Reusable dropdown component with notes
const DropdownWithNotes = ({ label, options, value, onChange, notes, onNotesChange }: DropdownWithNotesProps) => (
  <div className="mb-4">
    <label className="block text-sm font-medium mb-1">{label}</label>
    <select 
      className="w-full p-2 border rounded mb-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
    {value !== 'OK' && (
      <textarea
        className="w-full p-2 border rounded"
        placeholder="Additional notes..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        rows={2}
      />
    )}
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
type SectionName = 'location' | 'doorDetails' | 'components' | 'dimensions' | 'inspection' | 'photos';

// Add at the top with other interfaces
interface FormValues {
  locationName: string;
  locationId: string;
  doorType: string;
  installationType: string;
  manufacturer: string;
  doorsetNumber: string;
  dateInstalled: string;
  fireRating: string;
  doorCloserManufacturer: string;
  numHinges: number;
  hardwareSupplier: string;
  hasStandardGaps: boolean;
  gapsNotes: string;
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
  doorLeaf: { status: string; notes: string };
  doorFrame: { status: string; notes: string };
  visionPanel: { status: string; notes: string };
  intumescentSeal: { status: string; notes: string };
  smokeSeal: { status: string; notes: string };
  hinges: { status: string; notes: string };
  doorCloser: { status: string; notes: string };
  hardware: { status: string; notes: string };
  doorTag: { status: string; notes: string };
  doorIndicator: { status: string; notes: string };
  photos: Array<{ file: File; description: string; timestamp: string }>;
  additionalNotes: string;
}

type FormField = keyof FormValues;

export const FireDoorSurvey: React.FC = () => {
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
    photos: true
  });

  // Door type state
  const [doorType, setDoorType] = useState('single');
  
  // Form values state
  const [formValues, setFormValues] = useState<FormValues>({
    // Location Details
    locationName: '',
    locationId: '',
    
    // Door Details
    doorType: 'single',
    installationType: 'interior',
    manufacturer: '',
    doorsetNumber: '',
    dateInstalled: '',
    fireRating: '',
    
    // Components & Hardware
    doorCloserManufacturer: '',
    numHinges: 0,
    hardwareSupplier: '',
    
    // Dimensions
    hasStandardGaps: false,
    gapsNotes: '',
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
    
    // Inspection checklist
    doorLeaf: { status: 'OK', notes: '' },
    doorFrame: { status: 'OK', notes: '' },
    visionPanel: { status: 'OK', notes: '' },
    intumescentSeal: { status: 'OK', notes: '' },
    smokeSeal: { status: 'OK', notes: '' },
    hinges: { status: 'OK', notes: '' },
    doorCloser: { status: 'OK', notes: '' },
    hardware: { status: 'OK', notes: '' },
    doorTag: { status: 'OK', notes: '' },
    doorIndicator: { status: 'OK', notes: '' },
    
    // Photos
    photos: [],
    additionalNotes: ''
  });

  // Toggle section visibility
  const toggleSection = (section: SectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle form value changes
  const handleInputChange = (field: FormField, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [field]: typeof value === 'object' ? { ...(prev[field] as object), ...value } : value
    }));
  };

  // Handle status changes for inspection items
  const handleStatusChange = (field: FormField, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: { ...(prev[field] as { status: string; notes: string }), status: value }
    }));
  };

  // Handle notes changes for inspection items
  const handleNotesChange = (field: FormField, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: { ...(prev[field] as { status: string; notes: string }), notes: value }
    }));
  };

  // Handle photo upload
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = [...formValues.photos];
    Array.from(files).forEach(file => {
      newPhotos.push({
        file,
        description: '',
        timestamp: new Date().toISOString()
      });
    });
    handleInputChange('photos', newPhotos);
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
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Location Name</label>
              <input 
                type="text"
                className="w-full p-2 border rounded"
                value={formValues.locationName}
                onChange={(e) => handleInputChange('locationName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location ID</label>
              <input 
                type="text"
                className="w-full p-2 border rounded"
                value={formValues.locationId}
                onChange={(e) => handleInputChange('locationId', e.target.value)}
              />
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

            <h3 className="font-semibold mb-4">Fire Rating & Manufacturer</h3>
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
                <input 
                  type="date"
                  className="w-full p-2 border rounded"
                  value={formValues.dateInstalled}
                  onChange={(e) => handleInputChange('dateInstalled', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fire Resistance Rating</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="e.g., -/60/30"
                  value={formValues.fireRating}
                  onChange={(e) => handleInputChange('fireRating', e.target.value)}
                />
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
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Door Closer Manufacturer</label>
              <input 
                type="text"
                className="w-full p-2 border rounded"
                value={formValues.doorCloserManufacturer}
                onChange={(e) => handleInputChange('doorCloserManufacturer', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Number of Hinges</label>
              <input 
                type="number"
                className="w-full p-2 border rounded"
                value={formValues.numHinges}
                onChange={(e) => handleInputChange('numHinges', parseInt(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hardware Supplier</label>
              <input 
                type="text"
                className="w-full p-2 border rounded"
                value={formValues.hardwareSupplier}
                onChange={(e) => handleInputChange('hardwareSupplier', e.target.value)}
              />
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
            <div className="mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <input 
                  type="checkbox"
                  className="rounded"
                  checked={formValues.hasStandardGaps}
                  onChange={(e) => handleInputChange('hasStandardGaps', e.target.checked)}
                />
                <label>3mm standard gaps throughout</label>
              </div>
              {!formValues.hasStandardGaps && (
                <textarea
                  className="w-full p-2 border rounded"
                  placeholder="Notes about non-standard gaps..."
                  value={formValues.gapsNotes}
                  onChange={(e) => handleInputChange('gapsNotes', e.target.value)}
                  rows={2}
                />
              )}
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
              value={formValues.doorLeaf.status}
              onChange={(value) => handleStatusChange('doorLeaf', value)}
              notes={formValues.doorLeaf.notes}
              onNotesChange={(value) => handleNotesChange('doorLeaf', value)}
            />

            <DropdownWithNotes 
              label="Door Frame Status" 
              options={statusOptions.doorFrame}
              value={formValues.doorFrame.status}
              onChange={(value) => handleStatusChange('doorFrame', value)}
              notes={formValues.doorFrame.notes}
              onNotesChange={(value) => handleNotesChange('doorFrame', value)}
            />

            <DropdownWithNotes 
              label="Vision Panel Status" 
              options={statusOptions.visionPanel}
              value={formValues.visionPanel.status}
              onChange={(value) => handleStatusChange('visionPanel', value)}
              notes={formValues.visionPanel.notes}
              onNotesChange={(value) => handleNotesChange('visionPanel', value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DropdownWithNotes 
                label="Intumescent Seal" 
                options={statusOptions.seals}
                value={formValues.intumescentSeal.status}
                onChange={(value) => handleStatusChange('intumescentSeal', value)}
                notes={formValues.intumescentSeal.notes}
                onNotesChange={(value) => handleNotesChange('intumescentSeal', value)}
              />

              <DropdownWithNotes 
                label="Smoke Seal" 
                options={statusOptions.seals}
                value={formValues.smokeSeal.status}
                onChange={(value) => handleStatusChange('smokeSeal', value)}
                notes={formValues.smokeSeal.notes}
                onNotesChange={(value) => handleNotesChange('smokeSeal', value)}
              />
            </div>

            <DropdownWithNotes 
              label="Hinges Status" 
              options={statusOptions.hinges}
              value={formValues.hinges.status}
              onChange={(value) => handleStatusChange('hinges', value)}
              notes={formValues.hinges.notes}
              onNotesChange={(value) => handleNotesChange('hinges', value)}
            />

            <DropdownWithNotes 
              label="Door Closer Status" 
              options={statusOptions.doorCloser}
              value={formValues.doorCloser.status}
              onChange={(value) => handleStatusChange('doorCloser', value)}
              notes={formValues.doorCloser.notes}
              onNotesChange={(value) => handleNotesChange('doorCloser', value)}
            />

            <DropdownWithNotes 
              label="Hardware Status" 
              options={statusOptions.hardware}
              value={formValues.hardware.status}
              onChange={(value) => handleStatusChange('hardware', value)}
              notes={formValues.hardware.notes}
              onNotesChange={(value) => handleNotesChange('hardware', value)}
            />

            <DropdownWithNotes 
              label="Door Tag Status" 
              options={statusOptions.doorTag}
              value={formValues.doorTag.status}
              onChange={(value) => handleStatusChange('doorTag', value)}
              notes={formValues.doorTag.notes}
              onNotesChange={(value) => handleNotesChange('doorTag', value)}
            />

            <DropdownWithNotes 
              label="Door Indicator Status" 
              options={statusOptions.doorIndicator}
              value={formValues.doorIndicator.status}
              onChange={(value) => handleStatusChange('doorIndicator', value)}
              notes={formValues.doorIndicator.notes}
              onNotesChange={(value) => handleNotesChange('doorIndicator', value)}
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
              <div className="space-y-4">
                {formValues.photos.map((photo, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Photo {index + 1}</span>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => {
                          const newPhotos = formValues.photos.filter((_, i) => i !== index);
                          handleInputChange('photos', newPhotos);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      className="w-full p-2 border rounded mb-2"
                      placeholder="Photo description..."
                      value={photo.description}
                      onChange={(e) => {
                        const newPhotos = [...formValues.photos];
                        newPhotos[index].description = e.target.value;
                        handleInputChange('photos', newPhotos);
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

      {/* Submit Button */}
      <div className="flex justify-end mt-8">
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => {
            // Handle form submission here
            console.log('Form values:', formValues);
          }}
        >
          Submit Survey
        </button>
      </div>
    </div>
  );
};