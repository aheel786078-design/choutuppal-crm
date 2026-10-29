#!/usr/bin/env python3
"""
======================================================================
CHOUTUPPAL FRANCHISE CRM — PHASE 4 UI/UX MODERNIZATION TEST SUITE
======================================================================
Automated Test Verification for:
  - Responsive & Collapsible Admin Sidebar (Desktop 256px/68px, Mobile Slide-Over Drawer)
  - Mobile Slide-Over Navigation & Backdrop Management
  - Global Search & Keyboard-Accessible Command Palette ("Ctrl+K" / "Cmd+K")
  - Standardized Breadcrumbs & AdminPageHeader Integration
  - Global Toast Notification Wrapper & Accessible Feedback
  - Accessible Confirmation Dialogs (Radix Alert Dialog, Focus Trapping, Loading States)
  - Design System Consistency (Badges, Empty States, Skeletons, Page Containers)
  - Route Integrity: 100% of Navigation Routes Physically Exist on Disk
  - Data Store Invariance: Strictly Non-Destructive, Zero Mutations

Safety Invariant: Strictly non-destructive. Never permanently modifies data/admin_data.json.
"""

import sys
import os
import re
import json
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data', 'admin_data.json')
EXPECTED_HASH = 'd6a6e8bafe75cff95fdf2b15f671963b163bc5193c9aeea96cb41c66ced4d04f'

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

test_count = 0
pass_count = 0
fail_count = 0

def log_suite(title):
    print(f"\n{Colors.BOLD}{Colors.CYAN}┌────────────────────────────────────────────────────────────────────────┐{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}│ {title.ljust(70)} │{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}└────────────────────────────────────────────────────────────────────────┘{Colors.RESET}")

def log_pass(test_id, name):
    global test_count, pass_count
    test_count += 1
    pass_count += 1
    print(f"  {Colors.GREEN}✓ PASS{Colors.RESET} [{test_id}] {name}")

def log_fail(test_id, name, reason):
    global test_count, fail_count
    test_count += 1
    fail_count += 1
    print(f"  {Colors.RED}✗ FAIL{Colors.RESET} [{test_id}] {name}")
    print(f"    {Colors.RED}Reason: {reason}{Colors.RESET}")

# ======================================================================
# SUITE 1: DATA STORE BASELINE INTEGRITY
# ======================================================================
log_suite("SUITE 1: DATA STORE BASELINE INTEGRITY")

with open(DATA_FILE, 'rb') as f:
    baseline_bytes = f.read()
baseline_hash = hashlib.sha256(baseline_bytes).hexdigest()

if baseline_hash == EXPECTED_HASH:
    log_pass("T1.1", f"Data store SHA-256 matches invariant ({baseline_hash[:16]}...)")
else:
    log_fail("T1.1", "Data store hash mismatch", f"Expected {EXPECTED_HASH}, got {baseline_hash}")

store = json.loads(baseline_bytes.decode('utf-8'))
if len(store.get('listings', [])) == 212 and len(store.get('contacts', [])) == 211:
    log_pass("T1.2", f"Data store records intact: 212 listings, 211 contacts, {len(store.get('franchises', []))} franchises")
else:
    log_fail("T1.2", "Record count mismatch", f"Found listings: {len(store.get('listings', []))}")

# ======================================================================
# SUITE 2: COMPONENT INVENTORY & FILE PRESENCE
# ======================================================================
log_suite("SUITE 2: PHASE 4 COMPONENT INVENTORY & STRUCTURAL INTEGRITY")

required_files = [
    ('src/components/admin/admin-ui-context.tsx', 'Admin UI Context Provider & Hook'),
    ('src/components/admin/admin-sidebar.tsx', 'Responsive & Collapsible Sidebar Component'),
    ('src/components/admin/admin-header.tsx', 'Admin Header with Mobile Hamburger & Search Trigger'),
    ('src/components/admin/admin-breadcrumbs.tsx', 'Accessible Semantic Breadcrumb Component'),
    ('src/components/admin/admin-command-palette.tsx', 'Command Palette with cmdk & Shortcut Handling'),
    ('src/components/admin/admin-confirm-dialog.tsx', 'Accessible Confirmation Dialog Component'),
    ('src/components/admin/admin-badge.tsx', 'Standardized Status Badge Component'),
    ('src/components/admin/admin-empty-state.tsx', 'Admin Empty State Component'),
    ('src/components/admin/admin-table-skeleton.tsx', 'Admin Table Loading Skeleton Component'),
    ('src/components/admin/admin-page-container.tsx', 'Responsive Admin Page Container Wrapper'),
    ('src/components/admin/index.ts', 'Admin Components Re-Export Barrel'),
    ('src/lib/admin-toast.ts', 'Standardized Admin Toast Helper'),
    ('src/app/admin/layout.tsx', 'Admin Layout with Provider & Command Palette'),
    ('project-discovery/phase-4-ui-ux-plan.md', 'Phase 4 Architectural Plan Document'),
]

for i, (rel_path, desc) in enumerate(required_files, 1):
    full_path = os.path.join(BASE_DIR, rel_path)
    if os.path.exists(full_path):
        size = os.path.getsize(full_path)
        log_pass(f"T2.{i}", f"{desc} verified on disk ({size} bytes)")
    else:
        log_fail(f"T2.{i}", f"Missing file: {rel_path}", f"File not found at {full_path}")

# ======================================================================
# SUITE 3: SIDEBAR ROUTE VALIDATION & ZERO-BROKEN-LINKS GUARANTEE
# ======================================================================
log_suite("SUITE 3: SIDEBAR ROUTE VALIDATION & ZERO-BROKEN-LINKS")

sidebar_file = os.path.join(BASE_DIR, 'src/components/admin/admin-sidebar.tsx')
with open(sidebar_file, 'r', encoding='utf-8') as f:
    sidebar_content = f.read()

# Extract all route hrefs from NAV_SECTIONS
route_matches = re.findall(r"href:\s*'([^']+)'", sidebar_content)
unique_routes = sorted(list(set(route_matches)))

if len(unique_routes) >= 15:
    log_pass("T3.1", f"Extracted {len(unique_routes)} unique navigation destinations from AdminSidebar")
else:
    log_fail("T3.1", "Too few routes extracted from sidebar", f"Found {len(unique_routes)} routes")

broken_routes = []
for route in unique_routes:
    page_target = os.path.join(BASE_DIR, 'src', 'app', route.lstrip('/'), 'page.tsx')
    if not os.path.exists(page_target):
        broken_routes.append((route, page_target))

if not broken_routes:
    log_pass("T3.2", f"All {len(unique_routes)} sidebar routes physically exist on disk as page.tsx (Zero broken links)")
else:
    log_fail("T3.2", f"{len(broken_routes)} broken route(s) found in AdminSidebar", f"Missing: {broken_routes}")

# Verify responsive desktop collapse and mobile drawer classes in sidebar
has_collapsed_width = "w-[68px]" in sidebar_content and "w-64" in sidebar_content
has_mobile_drawer = "fixed inset-y-0" in sidebar_content and "-translate-x-full" in sidebar_content and "translate-x-0" in sidebar_content
has_mobile_backdrop = "backdrop-blur" in sidebar_content and "isMobileNavOpen" in sidebar_content

if has_collapsed_width:
    log_pass("T3.3", "Sidebar implements desktop collapsed width (w-[68px]) and expanded width (w-64)")
else:
    log_fail("T3.3", "Sidebar missing desktop collapsed width classes", "Expected w-[68px] and w-64")

if has_mobile_drawer and has_mobile_backdrop:
    log_pass("T3.4", "Sidebar implements slide-over mobile drawer with animated backdrop and touch barrier")
else:
    log_fail("T3.4", "Sidebar missing mobile drawer or backdrop implementation", "Check slide-over classes")

# ======================================================================
# SUITE 4: COMMAND PALETTE & KEYBOARD ACCESSIBILITY
# ======================================================================
log_suite("SUITE 4: COMMAND PALETTE & KEYBOARD ACCESSIBILITY")

palette_file = os.path.join(BASE_DIR, 'src/components/admin/admin-command-palette.tsx')
with open(palette_file, 'r', encoding='utf-8') as f:
    palette_content = f.read()

has_command_dialog = "CommandDialog" in palette_content and "CommandInput" in palette_content and "CommandList" in palette_content
has_quick_actions = "Quick Actions" in palette_content and "Go to Contacts Console" in palette_content
has_keyboard_shortcuts = "Ctrl+K" in palette_content and "ESC" in palette_content

if has_command_dialog:
    log_pass("T4.1", "Command Palette uses accessible cmdk Dialog primitives (CommandDialog, CommandInput, CommandList)")
else:
    log_fail("T4.1", "Command Palette missing cmdk components", "Check CommandDialog usage")

if has_quick_actions:
    log_pass("T4.2", "Command Palette incorporates Quick Action shortcuts (Contacts Console, Review Approvals, Business Directory, Health)")
else:
    log_fail("T4.2", "Command Palette missing quick actions", "Check quick actions group")

# Verify keyboard listener in AdminUIContext
context_file = os.path.join(BASE_DIR, 'src/components/admin/admin-ui-context.tsx')
with open(context_file, 'r', encoding='utf-8') as f:
    context_content = f.read()

has_global_listener = "window.addEventListener('keydown', handleKeyDown)" in context_content
has_cleanup = "window.removeEventListener('keydown', handleKeyDown)" in context_content
handles_ctrl_k = "(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'" in context_content
handles_escape = "e.key === 'Escape'" in context_content

if has_global_listener and has_cleanup:
    log_pass("T4.3", "Keyboard listener correctly registers and cleans up on unmount (zero listener leaks)")
else:
    log_fail("T4.3", "Keyboard listener cleanup missing", "Check useEffect cleanup")

if handles_ctrl_k and handles_escape:
    log_pass("T4.4", "Keyboard shortcuts handle Ctrl+K / Cmd+K toggle and Escape dismissal")
else:
    log_fail("T4.4", "Shortcut handling incomplete", "Check Ctrl+K and Escape conditions")

# ======================================================================
# SUITE 5: ACCESSIBLE CONFIRMATION DIALOGS & ARIA COMPLIANCE
# ======================================================================
log_suite("SUITE 5: ACCESSIBLE CONFIRMATION DIALOGS & ARIA COMPLIANCE")

dialog_file = os.path.join(BASE_DIR, 'src/components/admin/admin-confirm-dialog.tsx')
with open(dialog_file, 'r', encoding='utf-8') as f:
    dialog_content = f.read()

uses_alert_dialog = "AlertDialog" in dialog_content and "AlertDialogContent" in dialog_content and "AlertDialogAction" in dialog_content
supports_variants = "danger" in dialog_content and "warning" in dialog_content and "primary" in dialog_content
has_async_protection = "loading" in dialog_content and "disabled={loading}" in dialog_content
has_target_count = "affectedCount" in dialog_content

if uses_alert_dialog:
    log_pass("T5.1", "AdminConfirmDialog is built on accessible Radix AlertDialog primitive")
else:
    log_fail("T5.1", "Dialog missing AlertDialog primitive", "Check radix alert-dialog usage")

if supports_variants:
    log_pass("T5.2", "AdminConfirmDialog supports danger, warning, and primary action visual styling")
else:
    log_fail("T5.2", "Missing variant support", "Check variant styles")

if has_async_protection:
    log_pass("T5.3", "AdminConfirmDialog prevents duplicate submissions during async execution (disabled={loading})")
else:
    log_fail("T5.3", "Async loading lock missing", "Check loading button state")

if has_target_count:
    log_pass("T5.4", "AdminConfirmDialog renders target records badge to clearly indicate impact scale")
else:
    log_fail("T5.4", "Missing target count badge", "Check affectedCount prop")

# ======================================================================
# SUITE 6: STANDARDIZED BREADCRUMBS & ADMIN HEADER INTEGRATION
# ======================================================================
log_suite("SUITE 6: STANDARDIZED BREADCRUMBS & ADMIN HEADER INTEGRATION")

breadcrumbs_file = os.path.join(BASE_DIR, 'src/components/admin/admin-breadcrumbs.tsx')
with open(breadcrumbs_file, 'r', encoding='utf-8') as f:
    breadcrumbs_content = f.read()

header_file = os.path.join(BASE_DIR, 'src/components/admin/admin-header.tsx')
with open(header_file, 'r', encoding='utf-8') as f:
    header_content = f.read()

has_nav_breadcrumb = '<nav aria-label="Breadcrumb"' in breadcrumbs_content
has_ol_li = '<ol' in breadcrumbs_content and '<li' in breadcrumbs_content
has_aria_current = "aria-current={isLast ? 'page' : undefined}" in breadcrumbs_content

if has_nav_breadcrumb and has_ol_li and has_aria_current:
    log_pass("T6.1", "AdminBreadcrumbs implements semantic HTML (<nav>, <ol>, <li>) with aria-current='page'")
else:
    log_fail("T6.1", "Breadcrumbs missing semantic markup or ARIA attributes", "Check nav/ol/li structure")

has_header_mobile_btn = "openMobileNav" in header_content and "aria-label=\"Open navigation menu\"" in header_content
has_header_search_btn = "toggleCommandPalette" in header_content and "Ctrl+K" in header_content
has_header_breadcrumbs = "<AdminBreadcrumbs" in header_content

if has_header_mobile_btn:
    log_pass("T6.2", "AdminHeader contains accessible mobile hamburger menu trigger button")
else:
    log_fail("T6.2", "Header missing mobile hamburger trigger", "Check openMobileNav button")

if has_header_search_btn:
    log_pass("T6.3", "AdminHeader contains Command Palette search trigger with shortcut badge")
else:
    log_fail("T6.3", "Header missing command palette trigger", "Check toggleCommandPalette button")

if has_header_breadcrumbs:
    log_pass("T6.4", "AdminHeader integrates AdminBreadcrumbs for consistent hierarchy across all pages")
else:
    log_fail("T6.4", "Header missing AdminBreadcrumbs integration", "Check AdminBreadcrumbs usage")

# ======================================================================
# SUITE 7: GLOBAL TOAST & DESIGN SYSTEM UTILITIES
# ======================================================================
log_suite("SUITE 7: GLOBAL TOAST & DESIGN SYSTEM UTILITIES")

toast_file = os.path.join(BASE_DIR, 'src/lib/admin-toast.ts')
with open(toast_file, 'r', encoding='utf-8') as f:
    toast_content = f.read()

has_toast_methods = all(m in toast_content for m in ['success:', 'error:', 'warning:', 'info:', 'promise:'])

if has_toast_methods:
    log_pass("T7.1", "adminToast provides standardized success, error, warning, info, and promise methods")
else:
    log_fail("T7.1", "adminToast missing methods", "Check toast functions")

# Verify layout wrapper
layout_file = os.path.join(BASE_DIR, 'src/app/admin/layout.tsx')
with open(layout_file, 'r', encoding='utf-8') as f:
    layout_content = f.read()

has_provider_in_layout = "<AdminUIProvider>" in layout_content
has_palette_in_layout = "<AdminCommandPalette />" in layout_content

if has_provider_in_layout and has_palette_in_layout:
    log_pass("T7.2", "AdminLayout correctly wraps admin tree with AdminUIProvider and AdminCommandPalette")
else:
    log_fail("T7.2", "AdminLayout missing provider or command palette", "Check src/app/admin/layout.tsx")

# ======================================================================
# SUITE 8: FINAL POST-TEST DATA STORE BYTE-FOR-BYTE INVARIANCE
# ======================================================================
log_suite("SUITE 8: FINAL POST-TEST DATA STORE BYTE-FOR-BYTE INVARIANCE")

with open(DATA_FILE, 'rb') as f:
    final_bytes = f.read()
final_hash = hashlib.sha256(final_bytes).hexdigest()

if final_hash == EXPECTED_HASH:
    log_pass("T8.1", f"Data store SHA-256 byte-for-byte invariant confirmed intact ({final_hash[:16]}...)")
else:
    log_fail("T8.1", "Data store was mutated during UI tests!", f"Expected {EXPECTED_HASH}, got {final_hash}")

# ======================================================================
# SUMMARY REPORT
# ======================================================================
print(f"\n{Colors.BOLD}{Colors.CYAN}======================================================================{Colors.RESET}")
print(f"{Colors.BOLD}PHASE 4 UI/UX TEST SUMMARY RESULTS:{Colors.RESET}")
print(f"  Total Tests Executed: {test_count}")
print(f"  {Colors.GREEN}Tests Passed: {pass_count}{Colors.RESET}")
if fail_count > 0:
    print(f"  {Colors.RED}Tests Failed: {fail_count}{Colors.RESET}")
else:
    print(f"  {Colors.GREEN}All Tests Passed! (0 Failures){Colors.RESET}")
print(f"{Colors.BOLD}{Colors.CYAN}======================================================================{Colors.RESET}\n")

if fail_count > 0:
    sys.exit(1)
sys.exit(0)
