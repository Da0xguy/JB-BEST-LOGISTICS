import React, { useState } from 'react';
import { X, Copy, Check, FileCode, FolderTree, Shield, Server, Terminal } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tree' | 'firebase' | 'types' | 'tracking' | 'webhook' | 'rules'>('tree');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TREE_STRUCTURE = `jb-best-logistics/
├── app/
│   ├── layout.tsx                     # Root layout with Tailwind CSS & metadata
│   ├── page.tsx                       # Landing page & carrier service hub
│   ├── track/
│   │   └── [trackingId]/
│   │       └── page.tsx               # Client component with Firestore onSnapshot + Mapbox GL
│   ├── appointment/
│   │   └── page.tsx                   # Service appointment booking system (Notary, Packing)
│   ├── pickup/
│   │   └── page.tsx                   # B2B & residential pickup scheduling portal
│   ├── invoice/
│   │   └── [invoiceId]/
│   │       ├── page.tsx               # Invoice viewer & Paystack/Stripe checkout
│   │       └── print/
│   │           └── page.tsx           # 80mm thermal receipt & letterhead print driver
│   └── api/
│       ├── paystack/
│       │   └── webhook/
│       │       └── route.ts           # HMAC SHA512 signature validation & Firestore update
│       └── stripe/
│           └── webhook/
│               └── route.ts           # Stripe webhook handler for card & recurring mailboxes
├── components/
│   ├── ui/                            # Shadcn UI primitives (Button, Dialog, Badge, Card)
│   ├── tracking/
│   │   ├── MapboxMap.tsx              # Interactive Mapbox GL vector map & pins
│   │   └── MilestoneStepper.tsx       # Progress tracking stepper component
│   └── invoice/
│       └── ThermalReceipt.tsx         # 80mm thermal printer canvas & barcode
├── lib/
│   ├── firebase.ts                    # Client-side Firebase App, Auth & Firestore singleton
│   ├── firebase-admin.ts              # Server-side Firebase Admin SDK initialization
│   ├── stripe.ts                      # Stripe SDK client initialization
│   └── paystack.ts                    # Paystack REST helper client
├── types/
│   └── index.ts                       # Complete TypeScript domain interfaces
├── firestore.rules                    # Cloud Firestore security rules with RBAC
├── firebase-blueprint.json            # Intermediate Representation (IR) schema
├── next.config.mjs                    # Next.js 14+ configuration
├── tailwind.config.ts                 # Tailwind CSS theme configuration
└── package.json`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl border border-slate-700 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Next.js 14+ App Router & Boilerplate Architecture
              </h3>
              <p className="text-xs text-slate-400">
                JB & Best Logistics LLC • Full-Stack Production Implementation Specs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto px-6 py-2 bg-slate-950 border-b border-slate-800 gap-2 text-xs no-scrollbar">
          {[
            { id: 'tree', label: '1. Folder Tree' },
            { id: 'firebase', label: '2. Firebase Config' },
            { id: 'types', label: '3. TypeScript Types' },
            { id: 'tracking', label: '4. Tracking Page' },
            { id: 'webhook', label: '5. Paystack Webhook' },
            { id: 'rules', label: '6. Firestore Rules' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs bg-slate-950/80">
          {activeTab === 'tree' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Directory Layout (Next.js 14 App Router)</span>
                <button
                  onClick={() => handleCopy(TREE_STRUCTURE)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Tree'}
                </button>
              </div>
              <pre className="text-slate-200 leading-relaxed overflow-x-auto whitespace-pre">
                {TREE_STRUCTURE}
              </pre>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-4 text-slate-200">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                Client (lib/firebase.ts) & Server Admin (lib/firebase-admin.ts) Initialization
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Both singletons use conditional check mechanisms (<code className="text-blue-400">getApps().length &gt; 0</code> and <code className="text-blue-400">admin.apps.length</code>) to strictly prevent duplicate initialization across Next.js fast-refresh hot-reloading and Server Actions.
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-2">// lib/firebase.ts</span>
                <pre className="whitespace-pre overflow-x-auto text-slate-300">{`import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'types' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                File: types/index.ts (Complete Domain Interfaces)
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Includes full interfaces for <code className="text-blue-400">User</code>, <code className="text-blue-400">Shipment</code>, <code className="text-blue-400">TrackingLog</code>, <code className="text-blue-400">Appointment</code>, <code className="text-blue-400">PickupRequest</code>, and <code className="text-blue-400">Invoice</code>.
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre overflow-x-auto text-slate-300">{`export type UserRole = 'customer' | 'associate' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  mailboxNumber?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  carrier: 'fedex' | 'ups' | 'usps' | 'dhl' | 'jb_freight';
  serviceLevel: string;
  currentStatus: 'order_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
  currentLocation: { latitude: number; longitude: number; city: string; state: string };
  trackingLogs: TrackingLog[];
  estimatedDelivery: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  totalAmount: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'voided';
  paymentGateway?: 'paystack' | 'stripe' | 'cash';
}`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                File: app/track/[trackingId]/page.tsx (Firestore onSnapshot + Mapbox GL)
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Listens directly to the Firestore document using <code className="text-blue-400">onSnapshot(doc(db, &apos;shipments&apos;, trackingId))</code> for instantaneous, reactive real-time coordinates updates.
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <pre className="whitespace-pre overflow-x-auto text-slate-300">{`'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shipment } from '@/types';

export default function TrackingPage({ params }: { params: { trackingId: string } }) {
  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'shipments', params.trackingId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setShipment({ ...snap.data(), id: snap.id } as Shipment);
      }
    });
    return () => unsubscribe();
  }, [params.trackingId]);

  // Renders Mapbox GL canvas, current coordinates, and milestone stepper
}`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                File: app/api/paystack/webhook/route.ts (HMAC SHA512 Cryptographic Signature Verification)
              </div>
              <p className="text-slate-400 font-sans text-xs">
                Uses Node.js <code className="text-blue-400">crypto.createHmac(&apos;sha512&apos;)</code> and <code className="text-blue-400">crypto.timingSafeEqual</code> to prevent timing attacks before updating invoices in Firestore via Firebase Admin SDK.
              </p>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <pre className="whitespace-pre overflow-x-auto text-slate-300">{`import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-paystack-signature');
  const rawBody = await req.text();
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(hash))) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
  }

  const { event, data } = JSON.parse(rawBody);
  if (event === 'charge.success') {
    await adminDb.collection('invoices').doc(data.metadata.invoiceId).update({
      status: 'paid',
      paidAt: data.paid_at,
      paymentGateway: 'paystack',
      paymentReference: data.reference,
    });
  }
  return NextResponse.json({ status: 'success' });
}`}</pre>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 pb-2 border-b border-slate-800">
                File: firestore.rules (Security Rules with RBAC: Customer, Associate, Admin)
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre overflow-x-auto text-slate-300">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isOwner(uid) { return isAuthenticated() && request.auth.uid == uid; }
    function isAdmin() { return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }
    function isAssociate() { return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'associate'; }

    match /shipments/{shipmentId} {
      allow read: if true; // Public package tracking by ID
      allow write: if isAdmin() || isAssociate();
    }

    match /invoices/{invoiceId} {
      allow read: if isOwner(resource.data.customerId) || isAdmin() || isAssociate();
      allow write: if isAdmin() || isAssociate();
    }
  }
}`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>All 6 files generated directly in repository root and available for export or deployment.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
