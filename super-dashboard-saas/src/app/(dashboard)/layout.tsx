// Dashboard Layout (Authenticated Routes)
'use client'; // Add this for hooks

// Dashboard Layout (Authenticated Routes)
'use client'; // Add this for hooks

import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import DashboardTutorial from '@/components/tutorial/DashboardTutorial';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { // Ensure all necessary icons are imported, adding FiSliders and FiYoutube
  FiHome, FiSettings, FiMessageSquare, FiBox, FiInfo, FiBriefcase,
  FiMail, FiList, FiCode, FiGlobe, FiCreditCard, FiUser, FiLogOut,
  FiShield, FiHelpCircle, FiBookOpen, FiChevronDown, FiChevronUp, FiSliders, FiYoutube // Added FiYoutube
} from 'react-icons/fi';

// Create a client
const queryClient = new QueryClient();

// Define navigation items, separating collapsible groups
const standaloneTopItems = [
  { href: '/dashboard', label: 'Dashboard', icon: FiHome },
];

const collapsibleSections = [
 {
    id: 'pruvodce',
    label: "Průvodce", // Guided Mode
    icon: FiBookOpen,
    items: [
      { href: '/guided-chat', label: 'Editor Průvodce', icon: FiBookOpen },
    ],
  },
  {
    id: 'chat',
    label: "Chat", // Chat & Related Data
    icon: FiList,
    items: [
      { href: '/conversations', label: 'Logy Konverzací', icon: FiList },
      { href: '/contact-submissions', label: 'Kontaktní Formuláře', icon: FiMail },
      { href: '/products', label: 'Produkty', icon: FiBox },
      { href: '/business-types', label: 'Typy Podnikání', icon: FiBriefcase },
      { href: '/orders', label: 'Objednávky', icon: FiBox },
      { href: '/shop-info', label: 'Informace o Obchodě', icon: FiInfo },
      // { href: '/agent-chat', label: 'Lidská Podpora', icon: FiMessageCircle }, // If needed
    ],
  },
  {
    id: 'faq',
    label: "FAQ", // FAQ Mode
    icon: FiMessageSquare,
    items: [
      { href: '/widget-faqs', label: 'Editor FAQ', icon: FiMessageSquare },
    ],
  },
  {
    id: 'widget', // New Widget Section
    label: "Widget",
    icon: FiSliders,
    items: [
        { href: '/widget-config', label: 'Konfigurace', icon: FiSettings },
        { href: '/installation', label: 'Instalace', icon: FiCode },
        { href: '/domains', label: 'Domény', icon: FiGlobe },
    ],
  },
  {
    id: 'nastaveni',
    label: "Nastavení Účtu", // Account Settings Section
    icon: FiUser,
    items: [
      { href: '/billing', label: 'Fakturace', icon: FiCreditCard },
      { href: '/account', label: 'Profil', icon: FiUser },
    ],
  },
  {
    id: 'navody', // New Tutorial Section ID
    label: "Návody", // Tutorial Section Label
    icon: FiYoutube, // YouTube icon for tutorials
    items: [
        { href: '/tutorial/guided-chat', label: 'Nastavení Průvodce', icon: FiBookOpen }, // Link to Guided Chat Tutorial page
        { href: '/tutorial/chat', label: 'Nastavení Chatu', icon: FiList }, // Link to Chat Tutorial page
        // Add more tutorial links here if needed in the future
    ],
  },
];

const standaloneBottomItems = [
   { href: '/contact', label: 'Potřebujete pomoct?', icon: FiHelpCircle },
];


// Helper component for individual navigation links
const NavLink = ({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: React.ElementType; isActive: boolean }) => (
  <Link
    href={href}
    className={clsx(
      'flex items-center py-2 px-4 rounded transition duration-200 ease-in-out text-sidebar-foreground/80',
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
        : 'hover:bg-primary/10 hover:text-primary'
    )}
  >
    <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
    <span className="truncate">{label}</span>
  </Link>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth();
  const pathname = usePathname();
  // State for collapsible sections - Initialize based on active path
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
      const initialOpenState: Record<string, boolean> = {};
      collapsibleSections.forEach(section => {
          // Also check the new tutorial paths
          if (section.items.some(item => pathname.startsWith(item.href))) { // Check if current path starts with any item in the section
              initialOpenState[section.id] = true;
          } else {
              initialOpenState[section.id] = false;
          }
      });
      return initialOpenState;
  });


  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Function to check if any item within a collapsible section is active (for highlighting the button)
  const isSectionActive = (sectionItems: Array<{ href: string }>) => {
    // Check if the current pathname starts with any of the item hrefs in this section
    return sectionItems.some(item => pathname.startsWith(item.href));
  };

  // Update open sections if path changes (e.g., browser back/forward)
  useEffect(() => {
    const activeSectionId = collapsibleSections.find(section =>
        section.items.some(item => pathname.startsWith(item.href))
    )?.id;

    if (activeSectionId && !openSections[activeSectionId]) {
         // If navigating to a page within a closed section, open it.
         // Optional: close others if you want only one open at a time
         // setOpenSections({ [activeSectionId]: true });
         setOpenSections(prev => ({ ...prev, [activeSectionId]: true }));
    }
    // No dependency array change needed if we only open on navigation,
    // manual toggle is handled by toggleSection. If you want sections
    // to close automatically when navigating away, add pathname here
    // and adjust logic.
  }, [pathname]); // Rerun when pathname changes

  // Function to get the page title based on pathname
 const getPageTitle = () => {
    const allItems = [
      ...standaloneTopItems,
      ...collapsibleSections.flatMap(s => s.items),
      ...standaloneBottomItems,
    ];
    const currentItem = allItems.find(item => pathname.startsWith(item.href));
    if (currentItem) return currentItem.label;

    if (user?.is_super_admin && pathname.startsWith('/superadmin')) {
      return 'Super Admin';
    }
    return 'Dashboard'; // Default title
  };


  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <SubscriptionProvider>
          <TutorialProvider> {/* Wrap SubscriptionProvider with TutorialProvider */}
            {/* Use dark theme background for the main container */}
            <div className="flex h-screen bg-background text-foreground">
              {/* Sidebar Navigation - Apply dark theme styles */}
              <aside className="w-64 bg-sidebar text-sidebar-foreground p-6 flex flex-col shadow-lg border-r border-sidebar-border">
              <h2 className="text-2xl font-bold mb-10 text-sidebar-foreground text-center">SuperDash</h2>
              <nav className="flex-1 overflow-y-auto" data-intro="sidebar-nav" data-step="2">
                <ul className="space-y-1">
                  {/* Standalone Top Items */}
                  {standaloneTopItems.map(item => (
                    <li key={item.href}>
                      <NavLink {...item} isActive={pathname === item.href} /> {/* Use exact match for dashboard */}
                    </li>
                  ))}

                  {/* Collapsible Sections */}
                  {collapsibleSections.map(section => {
                    const isSectionCurrentlyActive = isSectionActive(section.items);
                    // State determines if section is open or closed
                    const isOpen = openSections[section.id] || false;

                    return (
                      <li key={section.id} className="mt-2">
                        <button
                          onClick={() => toggleSection(section.id)}
                          className={clsx(
                            'flex items-center justify-between w-full py-2 px-4 rounded transition duration-200 ease-in-out text-sidebar-foreground/80',
                            // Highlight button slightly if section contains the active link
                            isSectionCurrentlyActive ? 'text-primary' : '',
                            'hover:bg-primary/10 hover:text-primary'
                          )}
                          aria-expanded={isOpen}
                          aria-controls={`section-${section.id}`}
                        >
                          <div className="flex items-center">
                            <section.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                            <span className="truncate font-medium">{section.label}</span> {/* Make label medium weight */}
                          </div>
                          {isOpen ? <FiChevronUp className="h-4 w-4 flex-shrink-0" /> : <FiChevronDown className="h-4 w-4 flex-shrink-0" />}
                        </button>
                        {/* Content of the collapsible section */}
                        <div
                          id={`section-${section.id}`}
                          className={clsx(
                            "overflow-hidden transition-all duration-300 ease-in-out",
                            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0" // Use max-h for animation
                          )}
                        >
                           <ul className="ml-4 mt-1 space-y-1 border-l border-sidebar-border pl-4 py-1"> {/* Indent nested items */}
                            {section.items.map(item => (
                              <li key={item.href}>
                                <NavLink {...item} isActive={pathname.startsWith(item.href)} />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    );
                  })}

                   {/* Standalone Bottom Items */}
                   {standaloneBottomItems.map(item => (
                    <li key={item.href} className="mt-2">
                      <NavLink {...item} isActive={pathname.startsWith(item.href)} />
                    </li>
                  ))}

                  {/* Conditionally render Super Admin link */}
                  {user?.is_super_admin && (
                     <li className="mt-4 border-t border-sidebar-border pt-3">
                       <Link
                         href="/superadmin/users"
                         className={clsx(
                           'flex items-center py-2 px-4 rounded transition duration-200 ease-in-out text-destructive hover:bg-destructive/10 hover:text-destructive',
                           pathname.startsWith('/superadmin')
                             ? 'bg-destructive text-destructive-foreground font-medium'
                             : ''
                         )}
                       >
                         <FiShield className="mr-3 h-5 w-5 flex-shrink-0" />
                         Super Admin
                       </Link>
                     </li>
                  )}
                </ul>
              </nav>
              {/* Logout button */}
              <button
                onClick={logout}
                className="mt-auto w-full flex items-center justify-center bg-transparent border border-destructive text-destructive hover:bg-destructive/10 py-2 px-4 rounded transition duration-200 ease-in-out"
              >
                <FiLogOut className="mr-2 h-5 w-5 flex-shrink-0" />
                Odhlásit se {/* Logout in Czech */}
              </button>
            </aside>

            {/* Main Content Area - Apply dark theme styles */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Top bar/header - Apply dark theme styles */}
              <header className="bg-card shadow-md p-4 border-b border-border flex justify-between items-center">
                <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1> {/* Dynamic Title */}
                {/* User Email Display */}
                {user && (
                  <div className="text-sm text-muted-foreground">
                    Logged in as: <span className="font-medium text-foreground">{user.email}</span>
                  </div>
                )}
              </header>
              {/* Content - Ensure background is correct and applied */}
              <div className="flex-1 p-6 overflow-y-auto bg-background"> {/* Ensure this bg-background is effective */}
                {children}
              </div>
          </main>
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark" 
          />
          <DashboardTutorial />
        </div>
        </TutorialProvider> {/* Close TutorialProvider */}
      </SubscriptionProvider>
    </AuthGuard>
  </QueryClientProvider>
  );
}
