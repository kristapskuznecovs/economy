import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { GlobalAskBar } from '@/components/GlobalAskBar';
import { HorizonCards } from '@/components/HorizonCards';
import { WhyExplanation } from '@/components/WhyExplanation';
import { SankeyView } from '@/components/SankeyView';
import { InteractiveSankeyFlow } from '@/components/InteractiveSankeyFlow';
import { ExpenditureHistoryExplorer } from '@/components/ExpenditureHistoryExplorer';
import { RevenueHistoryExplorer } from '@/components/RevenueHistoryExplorer';
import { TradeOverviewCard } from '@/components/TradeOverviewCard';
import { EconomyStructureCard } from '@/components/EconomyStructureCard';
import { ExpenditurePositionsCard } from '@/components/ExpenditurePositionsCard';
import { ProcurementKpiCard } from '@/components/ProcurementKpiCard';
import { ExternalDebtCard } from '@/components/ExternalDebtCard';
import { DebtServiceInterestFlowCard } from '@/components/DebtServiceInterestFlowCard';
import { ConstructionInvestmentCard } from '@/components/ConstructionInvestmentCard';
import { MigrationOverviewCard } from '@/components/MigrationOverviewCard';
import { RegionalMap } from '@/components/RegionalMap';
import { RegionalImpactPanel } from '@/components/RegionalImpactPanel';
import { InvestmentPanel } from '@/components/InvestmentPanel';
import { TransparencyDrawer } from '@/components/TransparencyDrawer';
import { PolicyModelTab } from '@/components/PolicyModelTab';
import { RevenuePanel, ExpenditurePanel } from '@/components/DetailPanels';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart3, BookOpenText, ChevronDown, GitBranch, Lightbulb, List, Map } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';

function DashboardDesktopContent() {
  return (
    <div className="space-y-6">
      <GlobalAskBar />
      <HorizonCards />
      <WhyExplanation />

      <div className="grid grid-cols-2 gap-4">
        <InteractiveSankeyFlow />
        <SankeyView />
      </div>

      <RegionalMap />

      <ExpenditureHistoryExplorer />
      <RevenueHistoryExplorer />
      <div className="grid grid-cols-2 gap-4">
        <ExpenditurePositionsCard />
        <ProcurementKpiCard />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ExternalDebtCard />
        <DebtServiceInterestFlowCard />
      </div>
      <TradeOverviewCard />
      <EconomyStructureCard />
      <ConstructionInvestmentCard />
      <RegionalImpactPanel />
      <InvestmentPanel />

      <div className="grid grid-cols-2 gap-4">
        <RevenuePanel />
        <ExpenditurePanel />
      </div>

      <TransparencyDrawer />
    </div>
  );
}

function DashboardTabletContent() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="space-y-5">
      <GlobalAskBar />
      <HorizonCards />
      <WhyExplanation />
      <InteractiveSankeyFlow />
      <SankeyView />
      <ExpenditureHistoryExplorer />
      <RevenueHistoryExplorer />
      <ExpenditurePositionsCard />
      <ProcurementKpiCard />
      <ExternalDebtCard />
      <DebtServiceInterestFlowCard />
      <TradeOverviewCard />
      <EconomyStructureCard />
      <ConstructionInvestmentCard />
      <RegionalMap />
      <RegionalImpactPanel />
      <InvestmentPanel />

      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50">
            <span className="text-sm font-medium">{t('index.detailsButton')}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          <RevenuePanel />
          <ExpenditurePanel />
        </CollapsibleContent>
      </Collapsible>

      <TransparencyDrawer />
    </div>
  );
}

function DashboardMobileContent() {
  const { t } = useI18n();

  return (
    <>
      <div className="border-b bg-card px-3 pt-3 pb-2">
        <GlobalAskBar />
      </div>

      <Tabs defaultValue="impact" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <TabsContent value="impact" className="mt-0 space-y-4 p-3">
            <HorizonCards />
          </TabsContent>
          <TabsContent value="why" className="mt-0 space-y-4 p-3">
            <WhyExplanation />
          </TabsContent>
          <TabsContent value="map" className="mt-0 space-y-4 p-3">
            <RegionalMap />
            <RegionalImpactPanel />
          </TabsContent>
          <TabsContent value="flow" className="mt-0 space-y-4 p-3">
            <InteractiveSankeyFlow />
            <SankeyView />
            <ExpenditureHistoryExplorer />
            <RevenueHistoryExplorer />
            <ExpenditurePositionsCard />
            <ProcurementKpiCard />
            <ExternalDebtCard />
            <DebtServiceInterestFlowCard />
            <TradeOverviewCard />
            <EconomyStructureCard />
            <ConstructionInvestmentCard />
            <InvestmentPanel />
          </TabsContent>
          <TabsContent value="details" className="mt-0 space-y-4 p-3">
            <RevenuePanel />
            <ExpenditurePanel />
            <TransparencyDrawer />
          </TabsContent>
        </div>

        <TabsList className="h-12 w-full rounded-none border-t bg-card">
          <TabsTrigger value="impact" className="flex-1 flex flex-col gap-0.5 py-1 text-[10px] data-[state=active]:bg-transparent">
            <BarChart3 className="h-4 w-4" />
            {t('index.tab.impact')}
          </TabsTrigger>
          <TabsTrigger value="why" className="flex-1 flex flex-col gap-0.5 py-1 text-[10px] data-[state=active]:bg-transparent">
            <Lightbulb className="h-4 w-4" />
            {t('index.tab.why')}
          </TabsTrigger>
          <TabsTrigger value="map" className="flex-1 flex flex-col gap-0.5 py-1 text-[10px] data-[state=active]:bg-transparent">
            <Map className="h-4 w-4" />
            {t('index.tab.map')}
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex-1 flex flex-col gap-0.5 py-1 text-[10px] data-[state=active]:bg-transparent">
            <GitBranch className="h-4 w-4" />
            {t('index.tab.flow')}
          </TabsTrigger>
          <TabsTrigger value="details" className="flex-1 flex flex-col gap-0.5 py-1 text-[10px] data-[state=active]:bg-transparent">
            <List className="h-4 w-4" />
            {t('index.tab.details')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  );
}

function PageTabs() {
  const { t } = useI18n();

  return (
    <Tabs defaultValue="dashboard" className="space-y-6">
      <TabsList className="h-11 bg-slate-100/80 p-1">
        <TabsTrigger value="dashboard" className="px-4">
          <BarChart3 className="h-4 w-4" />
          {t('index.mode.dashboard')}
        </TabsTrigger>
        <TabsTrigger value="policy" className="px-4">
          <BookOpenText className="h-4 w-4" />
          {t('index.mode.policy')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-0">
        <DashboardDesktopContent />
      </TabsContent>
      <TabsContent value="policy" className="mt-0">
        <PolicyModelTab />
      </TabsContent>
    </Tabs>
  );
}

function DesktopLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-[1400px] px-6 py-5">
          <PageTabs />
        </div>
      </main>
    </div>
  );
}

function TabletLayout() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-4">
          <Tabs defaultValue="dashboard" className="space-y-5">
            <TabsList className="h-11 bg-slate-100/80 p-1">
              <TabsTrigger value="dashboard" className="px-4">
                <BarChart3 className="h-4 w-4" />
                {t('index.mode.dashboard')}
              </TabsTrigger>
              <TabsTrigger value="policy" className="px-4">
                <BookOpenText className="h-4 w-4" />
                {t('index.mode.policy')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-0">
              <DashboardTabletContent />
            </TabsContent>
            <TabsContent value="policy" className="mt-0">
              <PolicyModelTab />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function MobileLayout() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-card px-3 pt-3 pb-2">
          <TabsList className="grid h-10 w-full grid-cols-2 bg-slate-100/80 p-1">
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4" />
              {t('index.mode.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="policy">
              <BookOpenText className="h-4 w-4" />
              {t('index.mode.policy')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="mt-0 flex-1 overflow-hidden">
          <DashboardMobileContent />
        </TabsContent>
        <TabsContent value="policy" className="mt-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
          <PolicyModelTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      const width = window.innerWidth;
      setIsTablet(width >= 768 && width < 1280);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isTablet;
}

const Index = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  if (isMobile) return <MobileLayout />;
  if (isTablet) return <TabletLayout />;
  return <DesktopLayout />;
};

export default Index;
