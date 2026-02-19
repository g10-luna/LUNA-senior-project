# Frontend – Implementation Design Document
## Table of Contents

1. [Overview](#1-overview)
   - [Purpose](#purpose)
   - [Goal of the Frontend](#goal-of-the-frontend)
   - [Librarian Interface Goals](#librarian-interface-goals)

2. [High-Level Architecture](#2-high-level-architecture)
   - [Frontend Stack](#frontend-stack)
   - [Structure Philosophy](#structure-philosophy)
---

## 1. Overview

### Purpose
This document outlines how the librarian website frontend and student application will be implemented, including structure, responsibilities, and page organization.

### Goal of the Frontend

To provide two coordinated interfaces:

#### Librarian Interface Goals
Provide librarians with an intuitive interface to:

- Monitor robot system status and current task  
- Manage task queue (add, reorder, pause/cancel)  
- Review alerts, recent activity, and daily summary  
- Manage library catalog (availability, shelf location, add/delete)  
- Access maintenance diagnostics and logs  
- Use library map to view robot position  
- Manage account settings and notifications  
- Navigate everything via a menu screen  

---

## 2. High-Level Architecture

### Frontend Stack

- React  
- TypeScript  
- JavaScript  
- HTML  
- CSS  

---

### Structure Philosophy

The librarian website follows a structured layout built around a centralized application shell.

#### App Shell (Top Bar)
- Back-to-dashboard button (contextual navigation)  
- Dynamic page title  
- Utility icons (Menu, Notifications, Refresh)  

#### Screens
- Dashboard  
- Library Catalog  
- Robot Maintenance  
- Library Map  
- Account Settings  
- Options Menu  

#### Reusable UI Components
- Cards (section containers, summary panels)  
- Status indicators and progress bars  
- Tabs and filters  
- Primary and secondary buttons  
- Search inputs  

This structure separates layout, screen logic, and reusable components to ensure maintainability and scalability.

---

### Architectural Principles

This design ensures:

- **Consistency** – Shared components create a unified visual system.  
- **Reusability** – UI elements are built once and reused across screens.  
- **Scalability** – Additional pages or features can be added without restructuring the application shell.  

---

## 3. Project Folder Structure

/src
/screens (Dashboard, Catalog, Maintenance, Map, AccountSettings, OptionsMenu)
/components
/ui (Button, Card, Badge, Tabs, SearchBar, ProgressBar, IconButton)
/domain
/tasks (TaskQueueItem, CurrentTaskCard, RecentActivityList)
/catalog (BookListItem, AvailabilityPill)
/maintenance (HealthMetricRow, LogItem)
/map (MapLegend, RobotMarker)
/layouts (TopBarLayout)
/lib (mock data, types, api helpers)


### Responsibilities

- `components/` → reusable UI pieces  
- `screens/` → full screen views  
- `layouts/` → dashboard shell  
- `lib/` → data handling  

---

## 4. Page Breakdown

### 4.1 Dashboard

**Purpose:** Operational control panel  

**Features:**
- System Status card (battery, status pill, location)  
- Current Task card (task type, from→to, ETA, progress, controls)  
- Task Queue (list, add, reorder)  
- Alerts/Warnings (empty state + severity)  
- Today’s Summary (tasks completed, books delivered)  
- Recent Activity (status tags)  
- Quick Links (Maintenance, Catalog, Map)  

---

### 4.2 Library Catalog

**Purpose:** Inventory management  

**Features:**
- Search (title, author, ISBN)  
- Book list items (cover, metadata, copies, shelf location)  
- Availability pill  
- Actions (Mark Available/Unavailable, Delete)  
- Add Book button  

---

### 4.3 Robot Maintenance

**Purpose:** Diagnostics view  

**Features:**
- Operational Status  
- System Health (CPU, memory, temperature, navigation accuracy)  
- Sensor Status (expand/collapse)  
- Maintenance Schedule  
- Maintenance Logs with filters  

---

### 4.4 Library Map

**Purpose:** Spatial awareness  

**Features:**
- Search shelf/section  
- Robot marker  
- Legend (Active/Paused/Error + Charging Dock)  

---

### 4.5 Options Menu

**Purpose:** Navigation hub  

**Features:**
- Search pages/actions  
- Menu cards:
  - Dashboard  
  - Library Catalog  
  - Library Map  
  - Robot Maintenance  
  - Account Settings  

---

### 4.6 Account Settings

**Purpose:** Account + notifications  

**Features:**
- Profile Information  
- Security Settings  
- Notification Preferences  
- Permissions & Access  
- Account Actions  

---

## 5. Key User Flows

### Assign and Monitor a Robot Task

**Goal:** Create and supervise a robot delivery task.

**Flow:**
1. Open Dashboard  
2. Click “Assign Task”  
3. Select book/location  
4. Confirm pickup and drop-off  
5. Task appears in CurrentTaskCard or TaskQueue  
6. Monitor progress and status  
7. Upon completion → moves to Recent Activity  

**System Interaction:**  
Task created → Robot state updates → Dashboard reflects changes.

---

### Update Book Availability

**Goal:** Mark book available/unavailable.

**Flow:**
1. Open Library Catalog  
2. Search/select book  
3. Click Mark Available/Unavailable  
4. Availability updates immediately  

---

### Review Maintenance Diagnostics

**Goal:** Inspect system health.

**Flow:**
1. Open Robot Maintenance  
2. Review metrics and logs  
3. Filter logs  
4. Return to Dashboard if needed  

---

### Locate Robot on Library Map

**Goal:** Track robot visually.

**Flow:**
1. Open Library Map  
2. View RobotMarker  
3. Optionally assign task  
4. Return to Dashboard  

---

## 6. Component Design

### Core Shared UI

- TopBar  
- StatusPill  
- ProgressBar  
- Card / SectionCard  
- IconButton  
- SearchBar  
- TabFilter  
- ListItemRow  
- PrimaryActionButton  

### Librarian Components

- CurrentTaskCard  
- TaskQueueList / TaskQueueItem  
- AlertsPanel  
- SummaryCard  
- ActivityLogList / ActivityLogItem  
- CatalogBookRow  
- HealthMetricRow  
- MaintenanceLogItem  
- MapLegend / RobotMarker  

---

## 7. Work Division Plan

### Najaat – System Owner
- Layout + routing  
- Shared UI components  
- Styling system  
- Mock data + types  

### Kelynn – Screen Owner
- Dashboard  
- Catalog  
- Maintenance  
- Map  
- Options Menu + Account Settings  

---

## 8. Data Strategy

During development:
- Use mock data  
- Maintain consistent data shapes  
- Replace with backend APIs later  


RobotStatus {
  state: "Idle" | "Active" | "Paused" | "Error"
  batteryPercent: number
  locationLabel: string
}

Task {
  id: string
  type: "Student Request" | "Return Pickup" | "Other"
  from: string
  to: string
  eta?: string
  progress?: number
  status: "Queued" | "Active" | "Complete" | "Cancelled" | "Failed"
}

MaintenanceMetric {
  cpuPercent: number
  memoryPercent: number
  tempC: number
  navAccuracyPercent: number
  health: "Good" | "Warning" | "Critical"
}

CatalogBook {
  id: string
  title: string
  author: string
  isbn: string
  shelf: string
  availableCopies: number
  totalCopies: number
  availability: "Available" | "Unavailable"
}

---
## 9. UX & Design Guidelines
- Status-first hierarchy: System Status always at the top of operational pages
- Read-only by default on Maintenance + Account screens
- Primary action per screen:
    - Dashboard → Manage task (Pause/Cancel/Reroute)
    - Catalog → Add/Update availability
    - Map → Assign task
- Consistent empty states (“No alerts”, “No logs”)
- Consistent severity colors (green: good, orange: warning, red: error)

---
## 10. Risk & Technical Considerations 
### Potential Risks:
- Map accuracy mismatch (static map vs real layout)
- Task state inconsistencies across Dashboard/Map/Maintenance
- Overloaded dashboard if too many metrics creep in
- Role permissions (admin vs librarian) not enforced in UI
**Mitigation:**
- Single source of truth for robot/task state (mock store now, API later)
- Define status enums + badge rules centrally
- Keep Maintenance strictly diagnostic (no destructive actions)
- Guard admin-only actions in UI (disable/hide)
