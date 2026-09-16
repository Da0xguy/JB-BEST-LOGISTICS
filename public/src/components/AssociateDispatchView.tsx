import React, { useState } from 'react';
import {
  Truck,
  PlusCircle,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Box,
  Send,
  AlertCircle,
} from 'lucide-react';
import { Shipment, PickupRequest, Carrier, ShipmentStatus } from '../types';

interface AssociateDispatchViewProps {
  shipments: Shipment[];
  pickups: PickupRequest[];
  onAddShipment: (shipment: Shipment) => void;
  onUpdateShipment: (shipment: Shipment) => void;
  onUpdatePickup: (pickup: PickupRequest) => void;
}

export const AssociateDispatchView: React.FC<AssociateDispatchViewProps> = ({
  shipments,
  pickups,
  onAddShipment,
  onUpdateShipment,
  onUpdatePickup,
}) => {
  const [activeTab, setActiveTab] = useState<'shipments' | 'pickups'>('shipments');
  const [newTrackingNum, setNewTrackingNum] = useState('');
  const [carrier, setCarrier] = useState<Carrier>('fedex');
  const [recipientCity, setRecipientCity] = useState('Savannah');
  const [weight, setWeight] = useState(5.5);
  const [service, setService] = useState('FedEx 2Day Air');

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    const trackingId = newTrackingNum.trim() || `JB-${Math.floor(1000 + Math.random() * 9000)}-GA`;

    const newShipment: Shipment = {
      id: trackingId,
      trackingNumber: trackingId,
      carrier,
      serviceLevel: service,
      sender: {
        name: 'JB & Best Logistics Main Hub',
        street: '2450 Piedmont Rd NE',
        city: 'Atlanta',
        state: 'GA',
        zip: '30324',
        country: 'USA',
        phone: '+1 (404) 555-0199',
      },
      recipient: {
        name: 'Georgia Client Recipient',
        street: '100 Main Street',
        city: recipientCity,
        state: 'GA',
        zip: '31401',
        country: 'USA',
        phone: '+1 (404) 555-9000',
      },
      packageDetails: {
        weightLbs: Number(weight),
        dimensions: { length: 12, width: 8, height: 6, unit: 'in' },
        packageType: 'box',
        isFragile: false,
        requiresSignature: true,
        declaredValue: 200,
      },
      currentStatus: 'order_created',
      currentLocation: {
        city: 'Atlanta',
        state: 'GA',
        country: 'USA',
        latitude: 33.749,
        longitude: -84.388,
        facilityName: 'Atlanta Counter Intake',
      },
      originLocation: {
        city: 'Atlanta',
        state: 'GA',
        country: 'USA',
        latitude: 33.749,
        longitude: -84.388,
      },
      destinationLocation: {
        city: recipientCity,
        state: 'GA',
        country: 'USA',
        latitude: 32.0809,
        longitude: -81.0912,
      },
      estimatedDelivery: '2 Business Days',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingLogs: [
        {
          id: `log-${Date.now()}`,
          shipmentId: trackingId,
          status: 'order_created',
          title: 'Registered at Retail Terminal',
          description: 'Package accepted and barcoded by associate.',
          location: {
            city: 'Atlanta',
            state: 'GA',
            country: 'USA',
            latitude: 33.749,
            longitude: -84.388,
            facilityName: 'JB & Best Logistics Hub',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onAddShipment(newShipment);
    setNewTrackingNum('');
  };

  return (
    <div className="space-y-6">
      {/* High Density Staff Console Header */}
      <div className="bg-[#0F172A] text-white rounded border border-slate-800 p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-amber-400/20 mb-1">
              <Shield className="w-3 h-3" /> Staff Dispatch Console
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Associate & Courier Management</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Terminal manifest intake, real-time waypoint logging, and carrier driver assignments.
            </p>
          </div>

          <div className="flex bg-slate-900/80 p-0.5 rounded border border-slate-700 text-xs font-mono font-bold shrink-0">
            <button
              onClick={() => setActiveTab('shipments')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                activeTab === 'shipments' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Shipments Intake ({shipments.length})
            </button>
            <button
              onClick={() => setActiveTab('pickups')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                activeTab === 'pickups' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              Pickup Dispatch ({pickups.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'shipments' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Shipment Intake Form */}
          <div className="lg:col-span-5 bg-white rounded border border-gray-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 flex items-center gap-1.5 pb-2 border-b border-gray-100">
              <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
              Manifest New Shipment
            </h3>

            <form onSubmit={handleCreateShipment} className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Tracking ID (Auto or Custom)
                </label>
                <input
                  type="text"
                  placeholder="e.g. JB-9921-GA"
                  value={newTrackingNum}
                  onChange={(e) => setNewTrackingNum(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 font-mono text-xs focus:border-blue-500 focus:outline-none bg-gray-50 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Carrier
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value as Carrier)}
                    className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="fedex">FedEx</option>
                    <option value="ups">UPS</option>
                    <option value="usps">USPS</option>
                    <option value="jb_freight">JB Freight</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-mono font-bold bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Service Level
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 text-xs font-mono bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 block mb-1">
                  Destination City (Georgia)
                </label>
                <input
                  type="text"
                  value={recipientCity}
                  onChange={(e) => setRecipientCity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 text-xs bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-mono font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs mt-3 cursor-pointer uppercase tracking-wider"
              >
                <Send className="w-3 h-3" />
                Generate Label & Save to Firestore
              </button>
            </form>
          </div>

          {/* Active Inventory List */}
          <div className="lg:col-span-7 bg-white rounded border border-gray-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Live Shipments in Terminal</span>
              <span className="text-[10px] font-mono text-gray-500">{shipments.length} PARCELS</span>
            </h3>

            <div className="space-y-2">
              {shipments.map((s) => (
                <div key={s.id} className="p-3 rounded bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-gray-900">{s.trackingNumber}</span>
                      <span className="text-[9px] font-mono font-bold uppercase bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                        {s.carrier}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                      {s.originLocation.city} → {s.destinationLocation.city} • {s.packageDetails.weightLbs} lbs
                    </p>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                    {s.currentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Pickups Tab */
        <div className="bg-white rounded border border-gray-200 p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-900 pb-2 border-b border-gray-100">
            Commercial Pickups Requiring Driver Assignment
          </h3>
          <div className="divide-y divide-gray-100">
            {pickups.map((p) => (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-gray-900">{p.businessName || p.contactName}</h4>
                    <span className="text-[9px] font-mono uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {p.preferredCarrier.toUpperCase()}
                    </span>
                    {p.assignedDriverId && (
                      <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                        {p.assignedDriverId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    {p.pickupAddress.street}, {p.pickupAddress.city} • Window: {p.readyTime} - {p.closeTime}
                  </p>
                  <p className="text-[11px] font-mono text-gray-600">
                    Packages: {p.estimatedPackagesCount} • Weight: {p.totalWeightLbs} lbs
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onUpdatePickup({
                        ...p,
                        status: 'in_route',
                        assignedDriverId: 'Driver: Marcus (Van #04)',
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-mono font-bold transition shadow-2xs cursor-pointer uppercase tracking-wider"
                  >
                    Assign Driver & Route
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
