/** Library pickup points (aligned with Map tab markers). Stored on the book request as `request_location`. */
export const DEFAULT_PICKUP_LOCATION_VALUE = 'Pickup Point (Main Desk)';

export const PICKUP_LOCATION_OPTIONS = [
  {
    id: 'main_desk',
    label: 'Main desk',
    value: 'Pickup Point (Main Desk)',
    hint: 'Primary pickup for student requests',
  },
  {
    id: 'robot_zone',
    label: 'Robot zone',
    value: 'Robot Pickup Zone',
    hint: 'Deliveries land here for quick pickup',
  },
] as const;
