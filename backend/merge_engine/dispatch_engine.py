"""
Kshitij Tactical EMR - Dispatch Engine
Bengaluru JP Nagar Demo Simulation & Multi-Ambulance Atomic Dispatch Coordinator
Authoritative Backend State Management with Asyncio Concurrency Locking
"""

import time
import math
import asyncio
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# Verified Koramangala Default Anchor: 80 Feet Road, 4th Block, Koramangala, Bengaluru, 560034
DEFAULT_ANCHOR = {
    "name": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
    "address": "80 Feet Road, 4th Block, Koramangala, Bengaluru, Karnataka 560034",
    "lat": 12.9352,
    "lng": 77.6244,
    "locality": "4th Block, Koramangala",
    "pincode": "560034"
}

# Real, Verified Hospitals in Koramangala Operating Area
VERIFIED_HOSPITALS = [
    {
        "hospital_id": "HOSP-ST-JOHNS",
        "name": "St. John’s Medical College Hospital",
        "address": "Sarjapur Main Rd, John Nagar, Koramangala, Bengaluru 560034",
        "lat": 12.9315,
        "lng": 77.6210,
        "phone": "+91 80 2206 5000",
        "capabilities": ["Level-1 Emergency Trauma Care", "24/7 Casualty", "Critical Resus ICU", "Blood Bank"],
        "total_beds": 1200,
        "icu_available": 42,
        "triage_compatibility": ["IMMEDIATE_RED", "DELAYED_YELLOW"],
        "verified": True
    },
    {
        "hospital_id": "HOSP-APOLLO-SPECTRA",
        "name": "Apollo Spectra Hospitals, Koramangala",
        "address": "5th Block, 143, 1st Cross Rd, KHB Colony, Koramangala, Bengaluru 560095",
        "lat": 12.9344,
        "lng": 77.6292,
        "phone": "+91 80 4333 5555",
        "capabilities": ["Emergency Critical Care", "Orthopedic Trauma", "Surgical Resus", "ICU"],
        "total_beds": 95,
        "icu_available": 8,
        "triage_compatibility": ["IMMEDIATE_RED", "DELAYED_YELLOW"],
        "verified": True
    },
    {
        "hospital_id": "HOSP-BEAMS-KORA",
        "name": "Beams Multi Speciality Hospital, Koramangala",
        "address": "6th Block, 80 Feet Road, Koramangala, Bengaluru 560095",
        "lat": 12.9330,
        "lng": 77.6260,
        "phone": "+91 80 2552 1100",
        "capabilities": ["24/7 Casualty", "Trauma Stabilization", "Emergency OT", "ICU"],
        "total_beds": 75,
        "icu_available": 6,
        "triage_compatibility": ["IMMEDIATE_RED", "DELAYED_YELLOW"],
        "verified": True
    },
    {
        "hospital_id": "HOSP-MANIPAL-SARJ",
        "name": "Manipal Hospital, Sarjapur Road",
        "address": "Sarjapur Main Rd, Iblur Junction, Bengaluru 560102",
        "lat": 12.9260,
        "lng": 77.6350,
        "phone": "+91 80 2502 4444",
        "capabilities": ["Level-1 Trauma", "Cardiac Resuscitation", "Emergency ICU", "ECMO"],
        "total_beds": 350,
        "icu_available": 22,
        "triage_compatibility": ["IMMEDIATE_RED", "DELAYED_YELLOW"],
        "verified": True
    },
    {
        "hospital_id": "HOSP-KAVERI-MADI",
        "name": "Kaveri Multi Speciality Hospital, Madiwala",
        "address": "Hosur Main Rd, Madiwala Junction, Bengaluru 560068",
        "lat": 12.9230,
        "lng": 77.6200,
        "phone": "+91 80 2553 4400",
        "capabilities": ["Emergency Polytrauma", "Neuro-trauma", "ICU", "Dialysis"],
        "total_beds": 140,
        "icu_available": 12,
        "triage_compatibility": ["DELAYED_YELLOW", "MINIMAL_GREEN"],
        "verified": True
    },
    {
        "hospital_id": "HOSP-JAYADEVA",
        "name": "Jayadeva Institute of Cardiovascular Sciences",
        "address": "Bannerghatta Main Rd, Jayanagar 9th Block, Bengaluru 560069",
        "lat": 12.918510,
        "lng": 77.598280,
        "phone": "+91 80 2297 7400",
        "capabilities": ["Autonomous Cardiac Emergency", "Coronary Care Unit", "ECMO"],
        "total_beds": 600,
        "icu_available": 25,
        "triage_compatibility": ["IMMEDIATE_RED"],
        "verified": True
    }
]

# 12 Simulated Ambulances distributed around Koramangala 4th Block (Deterministic Demo Fixtures)
INITIAL_AMBULANCE_FIXTURES = [
    {
        "ambulance_id": "AMB-01",
        "callsign": "Koramangala ALS Alpha-1",
        "vehicle_type": "ALS (Advanced Life Support)",
        "lat": 12.9358,
        "lng": 77.6248,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 180,
        "speed_kmh": 32.0,
        "last_gps_update_secs_ago": 4,
        "crew": "Medic R. Nayak, Pilot S. Rao",
        "equipment": ["Ventilator", "Defibrillator", "IV Pumps", "Combat Gauze"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-02",
        "callsign": "St. John’s Gate BLS Beta-2",
        "vehicle_type": "BLS (Basic Life Support)",
        "lat": 12.9320,
        "lng": 77.6215,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 45,
        "speed_kmh": 28.0,
        "last_gps_update_secs_ago": 10,
        "crew": "EMT V. Gowda, Pilot M. Kumar",
        "equipment": ["Oxygen Resuscitator", "Splints", "Spine Board"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-03",
        "callsign": "Sony World MICU Critical-3",
        "vehicle_type": "MICU (Mobile ICU)",
        "lat": 12.9370,
        "lng": 77.6272,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 220,
        "speed_kmh": 35.0,
        "last_gps_update_secs_ago": 3,
        "crew": "Dr. P. Hegde (ER Phys), Medic C. Das",
        "equipment": ["Transport Vent", "Blood Warmer", "Ultrasound", "Multipara Monitor"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-04",
        "callsign": "Wipro Park ALS-4",
        "vehicle_type": "ALS (Advanced Life Support)",
        "lat": 12.9312,
        "lng": 77.6310,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 310,
        "speed_kmh": 30.0,
        "last_gps_update_secs_ago": 7,
        "crew": "Paramedic K. Sharma, Pilot A. Joshi",
        "equipment": ["Defibrillator", "LUCAS CPR", "Suction Unit"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-05",
        "callsign": "Koramangala 5th BLS Patrol-5",
        "vehicle_type": "BLS (Basic Life Support)",
        "lat": 12.9345,
        "lng": 77.6190,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 90,
        "speed_kmh": 34.0,
        "last_gps_update_secs_ago": 12,
        "crew": "EMT-P N. Reddy, Pilot T. Babu",
        "equipment": ["Defib Monitor", "Chest Seals", "TXA Kit"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-06",
        "callsign": "Nexus Forum Rapid BLS-6",
        "vehicle_type": "BLS (Basic Life Support)",
        "lat": 12.9350,
        "lng": 77.6120,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 160,
        "speed_kmh": 26.0,
        "last_gps_update_secs_ago": 18,
        "crew": "EMT D. Patil, Pilot B. Suresh",
        "equipment": ["C-Collar", "First Aid Kit", "Automated Defib"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-07",
        "callsign": "Sarjapur Rd MICU-7",
        "vehicle_type": "MICU (Mobile ICU)",
        "lat": 12.9280,
        "lng": 77.6330,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 130,
        "speed_kmh": 38.0,
        "last_gps_update_secs_ago": 5,
        "crew": "Dr. A. Verma, Medic E. Paul",
        "equipment": ["ICU Ventilator", "Infusion Pumps", "Capnography"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-08",
        "callsign": "Madiwala Junction BLS-8",
        "vehicle_type": "BLS (Basic Life Support)",
        "lat": 12.9240,
        "lng": 77.6210,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 260,
        "speed_kmh": 30.0,
        "last_gps_update_secs_ago": 20,
        "crew": "EMT R. Mohan, Pilot G. Prasad",
        "equipment": ["Spine Board", "Oxygen Delivery", "Tourniquets"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-09",
        "callsign": "Apollo Spectra Depot ALS-9",
        "vehicle_type": "ALS (Advanced Life Support)",
        "lat": 12.9340,
        "lng": 77.6290,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 210,
        "speed_kmh": 35.0,
        "last_gps_update_secs_ago": 14,
        "crew": "Medic L. Fernandez, Pilot K. John",
        "equipment": ["Multi-Lead ECG", "Emergency Drug Kit", "EZ-IO"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-10",
        "callsign": "Koramangala 3rd Block BLS-10",
        "vehicle_type": "BLS (Basic Life Support)",
        "lat": 12.9330,
        "lng": 77.6185,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 180,
        "speed_kmh": 29.0,
        "last_gps_update_secs_ago": 25,
        "crew": "EMT S. Bhat, Pilot H. Ali",
        "equipment": ["Splints", "Stretcher", "Basic Airway Kit"],
        "stale_gps": False
    },
    {
        "ambulance_id": "AMB-11",
        "callsign": "Agram Reserve ALS-11 (Offline)",
        "vehicle_type": "ALS (Advanced Life Support)",
        "lat": 12.9420,
        "lng": 77.6200,
        "status": "OFFLINE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 0,
        "speed_kmh": 0.0,
        "last_gps_update_secs_ago": 480,
        "crew": "Maintenance Shift",
        "equipment": ["Depot Service Pending"],
        "stale_gps": True
    },
    {
        "ambulance_id": "AMB-12",
        "callsign": "Hosur Road MICU-12 (Stale GPS)",
        "vehicle_type": "MICU (Mobile ICU)",
        "lat": 12.9290,
        "lng": 77.6150,
        "status": "AVAILABLE",
        "assignment_state": "UNASSIGNED",
        "assigned_emergency_id": None,
        "heading": 90,
        "speed_kmh": 0.0,
        "last_gps_update_secs_ago": 520,
        "crew": "Medic F. Joseph, Pilot N. Kumar",
        "equipment": ["Full Mobile ICU Kit"],
        "stale_gps": True
    }
]

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def estimate_road_eta_mins(distance_km: float, speed_kmh: float = 35.0) -> int:
    """Estimates urban road transit ETA with traffic overhead factor."""
    urban_traffic_factor = 1.35
    minutes = (distance_km / max(15.0, speed_kmh)) * 60.0 * urban_traffic_factor
    return max(1, math.ceil(minutes))


class DispatchCoordinator:
    """
    Authoritative Dispatch Coordinator for Kshitij Tactical EMR.
    Enforces atomic ambulance assignments, concurrent acceptance locking,
    multi-offer lifecycles, and audit history.
    """

    def __init__(self):
        self._lock = asyncio.Lock()
        self.operating_anchor = dict(DEFAULT_ANCHOR)
        self.operating_radius_km = 5.0
        self.ambulances: List[Dict[str, Any]] = [dict(a) for a in INITIAL_AMBULANCE_FIXTURES]
        self.hospitals: List[Dict[str, Any]] = [dict(h) for h in VERIFIED_HOSPITALS]
        
        # Active Emergency
        self.active_emergency: Dict[str, Any] = {
            "emergency_id": "EMG-KORA-101",
            "patient_id": "PT-101",
            "patient_name": "Major Vikram Rathore (Blast Trauma)",
            "priority": "IMMEDIATE_RED",
            "lat": DEFAULT_ANCHOR["lat"],
            "lng": DEFAULT_ANCHOR["lng"],
            "location_label": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
            "created_at": time.time(),
            "status": "OFFERING", # 'UNASSIGNED' | 'OFFERING' | 'ASSIGNED' | 'ESCALATED'
            "assigned_ambulance_id": None,
            "assigned_at": None,
            "recommended_hospital_id": "HOSP-STJOHNS"
        }

        # Active Offers: Dict of offer_id -> offer dict
        self.active_offers: Dict[str, Dict[str, Any]] = {}
        self.offer_group_index = 0
        self.offer_timeout_seconds = 15

        # Audit timeline (chronological event stream labeled [DEMO])
        self.audit_log: List[Dict[str, Any]] = []

        self._record_audit(
            event_type="DISPATCH_COORDINATOR_INITIALIZED",
            details="Operating Anchor set to 80 Feet Road, 4th Block, Koramangala, Bengaluru (12.9352, 77.6244). 12 simulated units loaded."
        )

        self._issue_initial_demo_offers()

    def _record_audit(self, event_type: str, details: str, actor: str = "Dispatch Engine"):
        entry = {
            "event_id": f"EVT-{int(time.time() * 1000) % 1000000}",
            "timestamp": time.strftime("%H:%M:%S", time.localtime()),
            "timestamp_epoch": time.time(),
            "event_type": event_type,
            "details": details,
            "actor": actor,
            "is_demo": True
        }
        self.audit_log.insert(0, entry)
        if len(self.audit_log) > 60:
            self.audit_log.pop()

    def _issue_initial_demo_offers(self):
        """Pre-populates an initial multi-offer group for the active emergency."""
        self.active_offers.clear()
        emergency_id = self.active_emergency["emergency_id"]
        
        # Find eligible ambulances sorted by road ETA
        eligible = self._get_ranked_eligible_ambulances(emergency_id)
        top_group = eligible[:3]

        now = time.time()
        for idx, amb in enumerate(top_group):
            offer_id = f"OFFER-{emergency_id}-{amb['ambulance_id']}"
            dist = haversine_distance_km(
                self.active_emergency["lat"], self.active_emergency["lng"],
                amb["lat"], amb["lng"]
            )
            eta = estimate_road_eta_mins(dist, amb["speed_kmh"])
            offer = {
                "offer_id": offer_id,
                "emergency_id": emergency_id,
                "ambulance_id": amb["ambulance_id"],
                "callsign": amb["callsign"],
                "vehicle_type": amb["vehicle_type"],
                "distance_km": dist,
                "eta_mins": eta,
                "issued_at": now,
                "expires_at": now + self.offer_timeout_seconds,
                "status": "OFFERED", # 'OFFERED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'
                "group_index": 0
            }
            self.active_offers[amb["ambulance_id"]] = offer
            
            # Update ambulance state
            for a in self.ambulances:
                if a["ambulance_id"] == amb["ambulance_id"]:
                    a["status"] = "OFFERED"
                    a["assignment_state"] = "PENDING_OFFER"

        self._record_audit(
            event_type="OFFERS_DISPATCHED",
            details=f"Dispatched multi-unit offer group 1 to {[a['ambulance_id'] for a in top_group]} with 15s timeout."
        )

    def _get_ranked_eligible_ambulances(self, emergency_id: str) -> List[Dict[str, Any]]:
        """Filters out offline, stale, busy ambulances and ranks by road ETA."""
        emg_lat = self.active_emergency["lat"]
        emg_lng = self.active_emergency["lng"]

        eligible = []
        for amb in self.ambulances:
            # Eligibility rules:
            if amb["status"] in ["OFFLINE", "TRANSPORTING", "ACCEPTED", "EN ROUTE", "ON SCENE"]:
                continue
            if amb["assignment_state"] == "ASSIGNED":
                continue
            if amb.get("stale_gps", False):
                continue
            
            dist = haversine_distance_km(emg_lat, emg_lng, amb["lat"], amb["lng"])
            if dist > self.operating_radius_km:
                continue

            eta = estimate_road_eta_mins(dist, amb["speed_kmh"])
            amb_copy = dict(amb)
            amb_copy["distance_km"] = dist
            amb_copy["eta_mins"] = eta
            eligible.append(amb_copy)

        # Rank by ETA ascending
        eligible.sort(key=lambda x: (x["eta_mins"], x["distance_km"]))
        return eligible

    def get_state(self) -> Dict[str, Any]:
        """Returns the full tactical dispatch radar state."""
        emg_lat = self.active_emergency["lat"]
        emg_lng = self.active_emergency["lng"]

        # Calculate live distance & ETA for hospitals from active emergency
        enriched_hospitals = []
        for h in self.hospitals:
            h_copy = dict(h)
            dist = haversine_distance_km(emg_lat, emg_lng, h["lat"], h["lng"])
            h_copy["distance_km"] = dist
            h_copy["eta_mins"] = estimate_road_eta_mins(dist, 40.0)
            enriched_hospitals.append(h_copy)
        enriched_hospitals.sort(key=lambda x: x["distance_km"])

        # Calculate live distance & ETA for ambulances
        enriched_ambulances = []
        for a in self.ambulances:
            a_copy = dict(a)
            dist = haversine_distance_km(emg_lat, emg_lng, a["lat"], a["lng"])
            a_copy["distance_km"] = dist
            a_copy["eta_mins"] = estimate_road_eta_mins(dist, a["speed_kmh"])
            enriched_ambulances.append(a_copy)

        return {
            "demo_mode": True,
            "operating_anchor": self.operating_anchor,
            "operating_radius_km": self.operating_radius_km,
            "active_emergency": self.active_emergency,
            "hospitals": enriched_hospitals,
            "ambulances": enriched_ambulances,
            "active_offers": list(self.active_offers.values()),
            "offer_timeout_seconds": self.offer_timeout_seconds,
            "audit_log": self.audit_log,
            "timestamp": time.time()
        }

    def set_operating_radius(self, radius_km: float) -> Dict[str, Any]:
        self.operating_radius_km = float(radius_km)
        self._record_audit(
            event_type="OPERATING_RADIUS_EXPANDED",
            details=f"Radar operational radius adjusted to {radius_km} km."
        )
        return self.get_state()

    def set_incident_location(self, lat: float, lng: float, label: str, patient_id: Optional[str] = None) -> Dict[str, Any]:
        """Changes or recenters the emergency incident location."""
        self.active_emergency["lat"] = lat
        self.active_emergency["lng"] = lng
        self.active_emergency["location_label"] = label
        if patient_id:
            self.active_emergency["patient_id"] = patient_id
        
        self.active_emergency["status"] = "OFFERING"
        self.active_emergency["assigned_ambulance_id"] = None
        self.active_emergency["assigned_at"] = None

        self._record_audit(
            event_type="INCIDENT_RELOCATED",
            details=f"Incident coordinates updated to {label} ({lat:.6f}, {lng:.6f}). Refreshing unit eligibility."
        )

        self._issue_initial_demo_offers()
        return self.get_state()

    async def respond_to_offer_atomic(self, emergency_id: str, ambulance_id: str, response_type: str) -> Dict[str, Any]:
        """
        Authoritative Atomic Assignment Method.
        Protected by asyncio.Lock to guarantee race-condition safety:
        If two ambulance crews accept simultaneously, only the first commits;
        the other receives an explicit ALREADY_ASSIGNED error response.
        """
        async with self._lock:
            # 1. Validation
            if self.active_emergency["emergency_id"] != emergency_id:
                return {
                    "success": False,
                    "status": "REJECTED",
                    "reason": "EMERGENCY_MISMATCH",
                    "message": f"Emergency ID {emergency_id} not found or inactive."
                }

            # 2. If response is DECLINE
            if response_type == "DECLINE":
                if ambulance_id in self.active_offers:
                    self.active_offers[ambulance_id]["status"] = "DECLINED"
                for a in self.ambulances:
                    if a["ambulance_id"] == ambulance_id:
                        a["status"] = "AVAILABLE"
                        a["assignment_state"] = "UNASSIGNED"

                self._record_audit(
                    event_type="OFFER_DECLINED",
                    details=f"Ambulance {ambulance_id} declined assignment. Evaluating next candidate."
                )

                # Check if all active offers in this group are declined or expired
                all_declined = all(
                    o["status"] in ["DECLINED", "EXPIRED", "CANCELLED"] 
                    for o in self.active_offers.values()
                )
                if all_declined:
                    self._escalate_to_next_group()

                return {
                    "success": True,
                    "status": "DECLINED",
                    "ambulance_id": ambulance_id,
                    "state": self.get_state()
                }

            # 3. If response is ACCEPT
            if response_type == "ACCEPT":
                # RACE CONDITION GUARD: Check if emergency is already committed
                if self.active_emergency["status"] == "ASSIGNED":
                    winning_id = self.active_emergency["assigned_ambulance_id"]
                    self._record_audit(
                        event_type="RACE_CONDITION_PREVENTED",
                        details=f"Conflict averted: {ambulance_id} attempted acceptance, but emergency was already committed to {winning_id}."
                    )
                    return {
                        "success": False,
                        "status": "REJECTED",
                        "reason": "ALREADY_ASSIGNED",
                        "winning_ambulance_id": winning_id,
                        "message": f"Conflict averted: Incident is already assigned to {winning_id}."
                    }

                # Check if this specific ambulance is already committed to something else
                target_amb = next((a for a in self.ambulances if a["ambulance_id"] == ambulance_id), None)
                if not target_amb:
                    return {
                        "success": False,
                        "status": "REJECTED",
                        "reason": "AMBULANCE_NOT_FOUND",
                        "message": f"Ambulance {ambulance_id} not recognized."
                    }

                if target_amb["assignment_state"] == "ASSIGNED":
                    return {
                        "success": False,
                        "status": "REJECTED",
                        "reason": "AMBULANCE_ALREADY_COMMITTED",
                        "message": f"Ambulance {ambulance_id} is already committed to another incident."
                    }

                # ATOMIC COMMIT: This ambulance wins the assignment!
                self.active_emergency["status"] = "ASSIGNED"
                self.active_emergency["assigned_ambulance_id"] = ambulance_id
                self.active_emergency["assigned_at"] = time.time()

                # Mark winning ambulance
                target_amb["status"] = "EN ROUTE"
                target_amb["assignment_state"] = "ASSIGNED"
                target_amb["assigned_emergency_id"] = emergency_id

                # Cancel or expire all other outstanding offers
                cancelled_units = []
                for amb_id, offer in self.active_offers.items():
                    if amb_id == ambulance_id:
                        offer["status"] = "ACCEPTED"
                    else:
                        offer["status"] = "CANCELLED"
                        cancelled_units.append(amb_id)
                        # Release other ambulances back to AVAILABLE
                        for a in self.ambulances:
                            if a["ambulance_id"] == amb_id and a["assignment_state"] != "ASSIGNED":
                                a["status"] = "AVAILABLE"
                                a["assignment_state"] = "UNASSIGNED"

                self._record_audit(
                    event_type="ASSIGNMENT_CONFIRMED",
                    details=f"AUTHORITATIVE ATOMIC COMMIT: {ambulance_id} accepted and assigned to {emergency_id}. Other offers cancelled for {cancelled_units}."
                )

                return {
                    "success": True,
                    "status": "ASSIGNED",
                    "winning_ambulance_id": ambulance_id,
                    "emergency_id": emergency_id,
                    "cancelled_offers": cancelled_units,
                    "state": self.get_state()
                }

            return {
                "success": False,
                "status": "REJECTED",
                "reason": "INVALID_RESPONSE_TYPE",
                "message": f"Unknown response type {response_type}"
            }

    def _escalate_to_next_group(self):
        """Escalates to the next eligible ambulance group or expands radius."""
        emergency_id = self.active_emergency["emergency_id"]
        
        # Check currently offered or declined units
        already_offered_ids = set(self.active_offers.keys())
        all_eligible = self._get_ranked_eligible_ambulances(emergency_id)
        next_candidates = [a for a in all_eligible if a["ambulance_id"] not in already_offered_ids]

        if next_candidates:
            self.offer_group_index += 1
            top_next = next_candidates[:3]
            now = time.time()
            for amb in top_next:
                offer_id = f"OFFER-{emergency_id}-{amb['ambulance_id']}"
                dist = haversine_distance_km(
                    self.active_emergency["lat"], self.active_emergency["lng"],
                    amb["lat"], amb["lng"]
                )
                eta = estimate_road_eta_mins(dist, amb["speed_kmh"])
                self.active_offers[amb["ambulance_id"]] = {
                    "offer_id": offer_id,
                    "emergency_id": emergency_id,
                    "ambulance_id": amb["ambulance_id"],
                    "callsign": amb["callsign"],
                    "vehicle_type": amb["vehicle_type"],
                    "distance_km": dist,
                    "eta_mins": eta,
                    "issued_at": now,
                    "expires_at": now + self.offer_timeout_seconds,
                    "status": "OFFERED",
                    "group_index": self.offer_group_index
                }
                for a in self.ambulances:
                    if a["ambulance_id"] == amb["ambulance_id"]:
                        a["status"] = "OFFERED"
                        a["assignment_state"] = "PENDING_OFFER"

            self._record_audit(
                event_type="DISPATCH_ESCALATED_GROUP",
                details=f"Escalation Group {self.offer_group_index + 1} offered to {[a['ambulance_id'] for a in top_next]}."
            )
        else:
            # Expand radius if needed
            if self.operating_radius_km < 15.0:
                old_r = self.operating_radius_km
                self.operating_radius_km = min(15.0, self.operating_radius_km + 5.0)
                self._record_audit(
                    event_type="DISPATCH_ESCALATED_RADIUS",
                    details=f"No group acceptances. Auto-escalating search radius from {old_r}km to {self.operating_radius_km}km."
                )
                self._issue_initial_demo_offers()
            else:
                self.active_emergency["status"] = "ESCALATED"
                self._record_audit(
                    event_type="NO_ACCEPTANCE_DISPATCH_ALERT",
                    details="NO ACCEPTANCE — CRITICAL ESCALATION REQUIRED. All eligible units exhausted within 15km."
                )

    def force_offer_timeout(self) -> Dict[str, Any]:
        """Simulates expiration of active offers to test escalation."""
        for offer in self.active_offers.values():
            if offer["status"] == "OFFERED":
                offer["status"] = "EXPIRED"
        
        self._record_audit(
            event_type="OFFERS_TIMED_OUT",
            details=f"Offer countdown expired after {self.offer_timeout_seconds}s with no response."
        )
        self._escalate_to_next_group()
        return self.get_state()

    def reset_demo(self) -> Dict[str, Any]:
        """Resets the demo simulation to initial clean state."""
        self.operating_anchor = dict(DEFAULT_ANCHOR)
        self.operating_radius_km = 5.0
        self.ambulances = [dict(a) for a in INITIAL_AMBULANCE_FIXTURES]
        self.active_emergency = {
            "emergency_id": "EMG-KORA-101",
            "patient_id": "PT-101",
            "patient_name": "Major Vikram Rathore (Blast Trauma)",
            "priority": "IMMEDIATE_RED",
            "lat": DEFAULT_ANCHOR["lat"],
            "lng": DEFAULT_ANCHOR["lng"],
            "location_label": "80 Feet Road, 4th Block, Koramangala, Bengaluru",
            "created_at": time.time(),
            "status": "OFFERING",
            "assigned_ambulance_id": None,
            "assigned_at": None,
            "recommended_hospital_id": "HOSP-STJOHNS"
        }
        self.offer_group_index = 0
        self._record_audit(
            event_type="DEMO_RESET",
            details="Simulation reset to default anchor: 80 Feet Road, 4th Block, Koramangala, Bengaluru."
        )
        self._issue_initial_demo_offers()
        return self.get_state()

# Global Singleton Dispatch Coordinator
dispatch_coordinator = DispatchCoordinator()
