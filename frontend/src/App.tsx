/**
 * App.tsx — Light theme root
 */

import { AppProvider, useApp } from './context/AppContext';
import Topbar   from './components/Topbar';
import Sidebar  from './components/Sidebar';
import { ToastContainer } from './components/ui';

import TeacherView        from './views/TeacherView';
import CashierDashboard   from './views/CashierView/CashierDashboard';
import LogisticsDashboard from './views/LogisticsView/LogisticsDashboard';
import ManagerDashboard   from './views/ManagerView/ManagerDashboard';

function AppShell() {
  const { activeRole, toasts, dismissToast } = useApp();

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {activeRole === 'TEACHER'   && <TeacherView />}
          {activeRole === 'CASHIER'   && <CashierDashboard />}
          {activeRole === 'LOGISTICS' && <LogisticsDashboard />}
          {activeRole === 'MANAGER'   && <ManagerDashboard />}
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
