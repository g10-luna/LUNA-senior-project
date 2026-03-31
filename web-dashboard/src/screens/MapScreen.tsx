import { useState } from "react";
import "./MapScreen.css";

type FloorId = "ground" | "first" | "second" | "third";

/** Floor PNGs live in /public (exported from the official Founders Library diagrams). */
const FLOORS: {
  id: FloorId;
  label: string;
  shortTitle: string;
  src: string;
  alt: string;
}[] = [
  {
    id: "ground",
    label: "Ground",
    shortTitle: "Ground floor",
    src: "/founders-floor-ground.png",
    alt: "Howard University Founders Library ground floor: circulation, reading rooms, special collections lab, stairs and elevators.",
  },
  {
    id: "first",
    label: "1st",
    shortTitle: "First floor",
    src: "/founders-floor-first.png",
    alt: "Founders Library first floor: main entrances, reference, circulation, computer labs, book stacks, restrooms, stairs and elevators.",
  },
  {
    id: "second",
    label: "2nd",
    shortTitle: "Second floor",
    src: "/founders-floor-second.png",
    alt: "Founders Library second floor: book stacks, computer labs, offices, restrooms, elevators, stairs.",
  },
  {
    id: "third",
    label: "3rd",
    shortTitle: "Third floor",
    src: "/founders-floor-third.png",
    alt: "Founders Library third floor: book stacks, special collections, offices, computer lab, restrooms, stairs.",
  },
];

export default function MapScreen() {
  const [floorId, setFloorId] = useState<FloorId>("ground");
  const floor = FLOORS.find((f) => f.id === floorId) ?? FLOORS[0];

  return (
    <div className="map-page">
      <h1 className="section-title">
        Library Map
      </h1>
      <p className="map-intro">
        Howard University <strong>Founders Library</strong> floor plans by level. Use the floor tabs, then scroll or trackpad to pan; on touch devices,
        pinch to zoom in your browser.
      </p>

      <div className="map-layout">
        <aside className="card map-legend" aria-label="Map legend">
          <h2 className="map-legend-title">Legend</h2>
          <ul className="map-legend-list">
            <li className="map-legend-item">
              <span className="map-swatch map-swatch--blue" aria-hidden />
              <span>Services &amp; labs — circulation, reference, offices, computer labs</span>
            </li>
            <li className="map-legend-item">
              <span className="map-swatch map-swatch--green" aria-hidden />
              <span>Reading areas &amp; book stacks</span>
            </li>
            <li className="map-legend-item">
              <span className="map-swatch map-swatch--grey" aria-hidden />
              <span>Restrooms, special collections, and other enclosed spaces</span>
            </li>
            <li className="map-legend-item">
              <span className="map-swatch map-swatch--stairs" aria-hidden />
              <span>Stairs &amp; elevators</span>
            </li>
          </ul>
          <p className="map-legend-note">
            Red arrows on the plan mark main entrances. North is shown on the compass on the original diagram.
          </p>
        </aside>

        <section className="card map-viewport" aria-labelledby="map-floor-plan-heading">
          <header className="map-viewport-header">
            <h2 id="map-floor-plan-heading" className="map-viewport-title">
              Founders Library
            </h2>
            <p className="map-viewport-sub">{floor.shortTitle}</p>
            <div className="map-floor-tabs" role="tablist" aria-label="Select floor">
              {FLOORS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  id={`map-tab-${f.id}`}
                  aria-selected={floorId === f.id}
                  aria-controls="map-floor-panel"
                  tabIndex={0}
                  className={`map-floor-tab${floorId === f.id ? " map-floor-tab--active" : ""}`}
                  onClick={() => setFloorId(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </header>
          <div
            id="map-floor-panel"
            role="tabpanel"
            aria-labelledby={`map-tab-${floorId}`}
            className="map-scroll"
            tabIndex={0}
            aria-label={`${floor.shortTitle} floor plan`}
          >
            <div className="map-frame">
              <img
                key={floor.src}
                src={floor.src}
                alt={floor.alt}
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
