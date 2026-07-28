/**
 * views/LogisticsView/LogisticsDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Logistics workspace router + Inbound Register sub-page.
 * Routes between: WarehouseInventory / SupplierRouting / Inbound form.
 */

import { useApp } from '../../context/AppContext';
import WarehouseInventory from './WarehouseInventory';
import SupplierRouting from './SupplierRouting';
import SupplierOrderHistory from './SupplierOrderHistory';
import LogisticsBooksCatalog from './LogisticsBooksCatalog';
import CashierDashboard from '../CashierView/CashierDashboard';

// ─── Logistics Dashboard Router ────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'warehouse') return <WarehouseInventory />;
  if (activeSubPage === 'supplier')  return <SupplierRouting />;
  if (activeSubPage === 'history')   return <SupplierOrderHistory />;
  if (activeSubPage === 'books')     return <LogisticsBooksCatalog />;
  if (['pipeline', 'management', 'payments'].includes(activeSubPage)) return <CashierDashboard />;
  return null;
}
