import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Organizations from "./pages/Organizations";
import Expenses from "./pages/Expenses";
import Debts from "./pages/Debts";
import Invoices from "./pages/Invoices";
import BankStatements from "./pages/BankStatements";
import Transactions from "./pages/Transactions";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/organizations"} component={Organizations} />
      <Route path={"/expenses"} component={Expenses} />
      <Route path={"/debts"} component={Debts} />
      <Route path={"/invoices"} component={Invoices} />
      <Route path={"/statements"} component={BankStatements} />
      <Route path={"/transactions"} component={Transactions} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
