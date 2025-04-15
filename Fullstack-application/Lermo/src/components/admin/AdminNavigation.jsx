import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  BarChart2,
  LogOut,
  BookPlus,
  Package,
  Building,
  Settings,
  List,
  Mailbox,
  MessageSquare,
  Store,
  MessageCircle
} from "lucide-react";
import { removeAuthToken } from "../../utils/auth";
import ServerReset from "./ServerReset";
import styles from "./AdminNavigation.module.css";

// New structured navigation items based on widget modes
const navigationStructure = [
  {
    mode: "Přehled", // Overview
    items: [
      { path: "/admin", icon: Home, label: "Dashboard" },
      { path: "/admin/statistics", icon: BarChart2, label: "Statistiky" },
    ],
  },
  {
    mode: "Průvodce", // Guided Chat Mode
    items: [
      { path: "/admin/guided-chat", icon: BookPlus, label: "Editor Průvodce" },
      { path: "/admin/products", icon: Package, label: "Produkty" },
      { path: "/admin/business-types", icon: Building, label: "Typy Podnikání" },
    ],
  },
  {
    mode: "Chat", // Chat Mode
    items: [
       { path: "/admin/conversations", icon: List, label: "Logy Konverzací" },
       { path: "/admin/agent-chat", icon: MessageCircle, label: "Lidská Podpora" },
       { path: "/admin/contact-submissions", icon: Mailbox, label: "Kontaktní Formuláře" },
    ],
  },
  {
    mode: "FAQ", // FAQ Mode
    items: [
      { path: "/admin/widget-faqs", icon: MessageSquare, label: "Editor FAQ" },
    ],
  },
   {
    mode: "Nastavení", // Settings
    items: [
      { path: "/admin/widget-config", icon: Settings, label: "Konfigurace Widgetu" },
      { path: "/admin/shop-info", icon: Store, label: "Informace o Obchodě" },
    ],
  },
];


const AdminNavigation = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();

  // Function to check if a nav item is active, including its sub-routes
  const isNavItemActive = (navPath) => {
    // Dashboard is only active on exact match
    if (navPath === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/admin/";
    }
    // For other routes, check if the current path starts with the nav path
    return location.pathname.startsWith(navPath);
  };

  const handleLogout = () => {
    removeAuthToken();
    navigate("/admin/login");
  };

  return (
    <nav className={styles.navContainer}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <span className={styles.logoText}>Admin Panel</span>
        </div>
      </div>

      <div className={styles.mainContainer}>
        {/* Navigation Items - Updated Structure */}
        <div className={styles.navItems}>
          {navigationStructure.map((group) => (
            <div key={group.mode} className={styles.navGroup}>
              <h3 className={styles.navGroupHeader}>{group.mode}</h3>
              {group.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.navItem} ${
                    isNavItemActive(item.path)
                      ? styles.navItemActive
                      : styles.navItemInactive
                  }`}
                  // title={item.label} // Tooltip removed
                >
                  <item.icon size={18} className={styles.icon} />
                  <span className={styles.navItemText}>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className={styles.bottomActions}>
          <div className={styles.actionsContainer}>
            <ServerReset /> {/* Consider if ServerReset needs a tooltip removed too? Assuming not for now. */}
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              // title="Logout" // Tooltip removed
            >
              <LogOut size={16} className={styles.logoutIcon} />
              <span className={styles.logoutText}>Logout</span> {/* Added span for consistency */}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

export default AdminNavigation;
