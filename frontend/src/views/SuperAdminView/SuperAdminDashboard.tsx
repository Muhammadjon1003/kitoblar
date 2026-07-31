/**
 * views/SuperAdminView/SuperAdminDashboard.tsx
 * Universal Root Access Router for SuperAdmin / Developer Role.
 * Grants instant access to EVERY view in the system (Manager, Logistics, Cashier, Teacher, Admin Console).
 */

import { useApp } from '../../context/AppContext';
import SuperAdminConsole from './SuperAdminConsole';
import LedgerTable from '../ManagerView/LedgerTable';
import ManagerGroupsView from '../ManagerView/ManagerGroupsView';
import UserManagement from '../ManagerView/UserManagement';
import NarxSozlamalari from '../ManagerView/NarxSozlamalari';
import MoliyaviyTahlil from '../ManagerView/components/MoliyaviyTahlil';
import WarehouseInventory from '../LogisticsView/WarehouseInventory';
import SupplierRouting from '../LogisticsView/SupplierRouting';
import SupplierOrderHistory from '../LogisticsView/SupplierOrderHistory';
import LogisticsBooksCatalog from '../LogisticsView/LogisticsBooksCatalog';
import CashierDashboard from '../CashierView/CashierDashboard';
import TeacherView from '../TeacherView';

export default function SuperAdminDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'admin_console') return <SuperAdminConsole />;
  if (activeSubPage === 'analytics')     return <MoliyaviyTahlil />;
  if (activeSubPage === 'ledger')        return <LedgerTable />;
  if (activeSubPage === 'groups' || activeSubPage === 'coverage') return <ManagerGroupsView />;
  if (activeSubPage === 'users')         return <UserManagement />;
  if (activeSubPage === 'narxsozlama')   return <NarxSozlamalari />;
  if (activeSubPage === 'warehouse')     return <WarehouseInventory />;
  if (activeSubPage === 'supplier')      return <SupplierRouting />;
  if (activeSubPage === 'history')       return <SupplierOrderHistory />;
  if (activeSubPage === 'books')         return <LogisticsBooksCatalog />;
  if (['pipeline', 'management', 'payments'].includes(activeSubPage)) return <CashierDashboard />;
  if (activeSubPage === 'orders')        return <TeacherView />;

  return <SuperAdminConsole />;
}
