/* Simple stroke icons — 20x20 grid, matching Arsela's understated icon style */

const Icon = ({ children, size = 20, stroke = 1.6, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       className={className} style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const IconDashboard = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Icon>;
const IconWallet = (p) => <Icon {...p}><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M16 12h4"/><circle cx="16" cy="12" r="1"/></Icon>;
const IconReceipt = (p) => <Icon {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></Icon>;
const IconCheck = (p) => <Icon {...p}><path d="M4 12l5 5L20 6"/></Icon>;
const IconApproval = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 11l3 3 5-6"/></Icon>;
const IconChart = (p) => <Icon {...p}><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></Icon>;
const IconUsers = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3.1-6 7-6s7 2.5 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M17 12c2.8 0 5 1.8 5 5"/></Icon>;
const IconSettings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconFilter = (p) => <Icon {...p}><path d="M3 5h18l-7 8v7l-4-2v-5L3 5z"/></Icon>;
const IconDownload = (p) => <Icon {...p}><path d="M12 3v13m0 0l-4-4m4 4l4-4M4 21h16"/></Icon>;
const IconChevronRight = (p) => <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>;
const IconChevronDown = (p) => <Icon {...p}><path d="m6 9 6 6 6-6"/></Icon>;
const IconArrowUp = (p) => <Icon {...p}><path d="M12 19V5m0 0l-6 6m6-6l6 6"/></Icon>;
const IconArrowDown = (p) => <Icon {...p}><path d="M12 5v14m0 0l-6-6m6 6l6-6"/></Icon>;
const IconTrend = (p) => <Icon {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></Icon>;
const IconMore = (p) => <Icon {...p}><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></Icon>;
const IconClose = (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>;
const IconCalendar = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Icon>;
const IconBuilding = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></Icon>;
const IconTag = (p) => <Icon {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-8.6-8.6V3h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1"/></Icon>;
const IconMenu = (p) => <Icon {...p}><path d="M4 6h16M4 12h16M4 18h16"/></Icon>;
const IconLock = (p) => <Icon {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Icon>;
const IconMail = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>;
const IconEye = (p) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Icon>;
const IconCompass = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/></Icon>;
const IconInbox = (p) => <Icon {...p}><path d="M3 13l3-8h12l3 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/><path d="M3 13h5l2 3h4l2-3h5"/></Icon>;
const IconFile = (p) => <Icon {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/></Icon>;
const IconHelp = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".8" fill="currentColor"/></Icon>;
const IconInfo = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M11 12h1v4h1"/></Icon>;
const IconExport = (p) => <Icon {...p}><path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M16 6l-4-4-4 4M12 2v13"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconEdit = (p) => <Icon {...p}><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14 6l4 4"/></Icon>;
const IconRefresh = (p) => <Icon {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></Icon>;
const IconArrowRight = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>;
const IconTrash = (p) => <Icon {...p}><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></Icon>;
const IconArchive = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></Icon>;
// Two overlapping ledger columns with a matching tick — represents
// reconciling one ledger (Xero) against another (bank / claims / etc).
const IconReconcile = (p) => <Icon {...p}><rect x="2.5" y="4" width="9" height="16" rx="1.5"/><rect x="12.5" y="4" width="9" height="16" rx="1.5"/><path d="M5.5 9.5l1.5 1.5 2.5-3"/><path d="M15.5 13.5l1.5 1.5 2.5-3"/></Icon>;

Object.assign(window, {
  IconDashboard, IconWallet, IconReceipt, IconCheck, IconApproval, IconChart,
  IconUsers, IconSettings, IconBell, IconSearch, IconPlus, IconFilter,
  IconDownload, IconChevronRight, IconChevronDown, IconArrowUp, IconArrowDown,
  IconTrend, IconMore, IconClose, IconCalendar, IconBuilding, IconShield,
  IconTag, IconMenu, IconLock, IconMail, IconEye, IconCompass, IconInbox,
  IconFile, IconHelp, IconInfo, IconExport, IconClock, IconEdit, IconRefresh,
  IconArrowRight, IconTrash, IconArchive, IconReconcile
});
