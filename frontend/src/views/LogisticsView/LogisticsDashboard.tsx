/**
 * views/LogisticsView/LogisticsDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Logistics workspace router + Inbound Register sub-page.
 * Routes between: WarehouseInventory / SupplierRouting / Inbound form.
 */

import { useApp } from '../../context/AppContext';
import WarehouseInventory from './WarehouseInventory';
import SupplierRouting from './SupplierRouting';

// ─── Logistics Dashboard Router ────────────────────────────────────────────────

export default function LogisticsDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'warehouse') return <WarehouseInventory />;
  if (activeSubPage === 'supplier')  return <SupplierRouting />;
  return null;
}
