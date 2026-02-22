import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "../../lib/routes";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate("/dashboard");
  };

  const showBackButton = location.pathname !== "/dashboard";

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        {showBackButton && (
          <button onClick={handleBack} style={styles.button}>
            ← Back
          </button>
        )}
        <h2 style={styles.title}>{title}</h2>
      </div>

      <div style={styles.right}>
        <button style={styles.iconButton} onClick={() => navigate(ROUTES.OPTIONS)}>
            ☰
        </button>
        <button style={styles.iconButton}>🔔</button>
        <button style={styles.iconButton}>⟳</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 30px",
    backgroundColor: "var(--navy-light)",
    color: "var(--text-light)",
    fontWeight: 600,
    fontSize: "20px",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  right: {
    display: "flex",
    gap: "10px"
  },
  title: {
    margin: 0
  },
  button: {
    cursor: "pointer"
  },
  iconButton: {
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "white",
    padding: "8px 10px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
