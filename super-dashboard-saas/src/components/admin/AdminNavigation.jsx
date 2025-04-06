import React from "react";
import { usePathname } from "next/navigation";
import NextLink from "next/link";
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
import { logout } from "../../utils/auth";
import ServerReset from "./ServerReset";
import styles from "./AdminNavigation.module.css";

const navItems = [
  { path: "/admin", icon: Home, label: "Dashboard" },
  { path: "/admin/statistics", icon: BarChart2, label: "Statistics" },
  { path: "/admin/products", icon: Package, label: "Products" },
  { path: "/admin/business-types", icon: Building, label: "Business Types" },
  { path: "/admin/guided-chat", icon: BookPlus, label: "Guided Chat" },
  { path: "/admin/widget-config", icon: Settings, label: "Widget Config" },
  { path: "/admin/shop-info", icon: Store, label: "Shop Info" },
  { path: "/admin/conversations", icon: List, label: "Conversation Logs" },
  { path: "/admin/contact-submissions", icon: Mailbox, label: "Contact Submissions" },
  { path: "/admin/widget-faqs", icon: MessageSquare, label: "Widget FAQs" },
  { path: "/admin/agent-chat", icon: MessageCircle, label: "Human Support" },
];

const AdminNavigation = React.memo(() => {
  const pathname = usePathname();

  // Function to check if a nav item is active, including its sub-routes
  const isNavItemActive = (navPath) => {
    // Dashboard is only active on exact match
    if (navPath === "/admin") {
      return pathname === "/admin" || pathname === "/admin/";
    }
    // For other routes, check if the current path starts with the nav path
    return pathname.startsWith(navPath);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/widget";
  };

  return (
    <nav className={styles.navContainer}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <span className={styles.logoText}>Admin Panel</span>
        </div>
      </div>

      <div className={styles.mainContainer}>
        {/* Navigation Items */}
        <div className={styles.navItems}>
          {navItems.map((item) => (
            <NextLink
              key={item.path}
              href={item.path}
              className={`${styles.navItem} ${
                isNavItemActive(item.path)
                  ? styles.navItemActive
                  : styles.navItemInactive
              }`}
              title={item.label}
            >
              <item.icon size={18} className={styles.icon} />
              <span className={styles.navItemText}>{item.label}</span>
            </NextLink>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className={styles.bottomActions}>
          <div className={styles.actionsContainer}>
            <ServerReset />
            <button
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Logout"
            >
              <LogOut size={16} className={styles.logoutIcon} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
});

export default AdminNavigation;