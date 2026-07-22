/**
 * views/ManagerView/ManagerDashboard.tsx — O'zbek tili
 */

import { useApp } from '../../context/AppContext';
import LedgerTable from './LedgerTable';
import ManagerGroupsView from './ManagerGroupsView';
import UserManagement from './UserManagement';
import NarxSozlamalari from './NarxSozlamalari';
import MoliyaviyTahlil from './components/MoliyaviyTahlil';

export default function ManagerDashboard() {
  const { activeSubPage } = useApp();

  if (activeSubPage === 'ledger')   return <LedgerTable />;
  if (activeSubPage === 'groups' || activeSubPage === 'coverage') return <ManagerGroupsView />;
  if (activeSubPage === 'users')   return <UserManagement />;
  if (activeSubPage === 'narxsozlama') return <NarxSozlamalari />;
  return <MoliyaviyTahlil />;
}
