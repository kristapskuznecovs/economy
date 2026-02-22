import { useState, useEffect } from 'react';
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
import { RegionalMap } from '@/components/RegionalMap';
import { RegionalImpactPanel } from '@/components/RegionalImpactPanel';
import { InvestmentPanel } from '@/components/InvestmentPanel';
import { TransparencyDrawer } from '@/components/TransparencyDrawer';
import { RevenuePanel, ExpenditurePanel } from '@/components/DetailPanels';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, BarChart3, Lightbulb, Map, GitBranch, List } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/lib/i18n';

function DesktopLayout() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-[1400px] mx-auto px-6 py-5 space-y-6">
          {/* Row 1: Ask */}
          <GlobalAskBar />

          {/* Row 2: Horizon Impact Cards */}
          <HorizonCards />

          {/* Row 3: Why */}
          <WhyExplanation />

          {/* Row 4: Budget Flow Visualizations */}
          <div className="grid grid-cols-2 gap-4">
            <InteractiveSankeyFlow />
            <SankeyView />
          </div>

          {/* Row 5: Regional Map */}
          <RegionalMap />

          <ExpenditureHistoryExplorer />
          <RevenueHistoryExplorer />
          <TradeOverviewCard />
          <EconomyStructureCard />

          {/* Row 5: Regional + Investment */}
          <RegionalImpactPanel />
          <InvestmentPanel />

          {/* Row 6: Details */}
          <div className="grid grid-cols-2 gap-4">
            <RevenuePanel />
            <ExpenditurePanel />
          </div>

          {/* Row 7: Transparency */}
          <TransparencyDrawer />
        </div>
      </main>
    </div>
  );
}

function TabletLayout() {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-4 space-y-5">
          <GlobalAskBar />
          <HorizonCards />
          <WhyExplanation />
          <InteractiveSankeyFlow />
          <SankeyView />
          <ExpenditureHistoryExplorer />
          <RevenueHistoryExplorer />
          <TradeOverviewCard />
          <EconomyStructureCard />
          <RegionalMap />
          <RegionalImpactPanel />
          <InvestmentPanel />

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{t('index.detailsButton')}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-3">
              <RevenuePanel />
              <ExpenditurePanel />
            </CollapsibleContent>
          </Collapsible>

          <TransparencyDrawer />
        </div>
      </main>
    </div>
  );
}

function MobileLayout() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      {/* Sticky ask bar */}
      <div className="px-3 pt-3 pb-2 border-b bg-card">
        <GlobalAskBar />
      </div>

      <Tabs defaultValue="impact" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <TabsContent value="impact" className="p-3 space-y-4 mt-0">
            <HorizonCards />
          </TabsContent>
          <TabsContent value="why" className="p-3 space-y-4 mt-0">
            <WhyExplanation />
          </TabsContent>
          <TabsContent value="map" className="p-3 space-y-4 mt-0">
            <RegionalMap />
            <RegionalImpactPanel />
          </TabsContent>
          <TabsContent value="flow" className="p-3 space-y-4 mt-0">
            <InteractiveSankeyFlow />
            <SankeyView />
            <ExpenditureHistoryExplorer />
            <RevenueHistoryExplorer />
            <TradeOverviewCard />
            <EconomyStructureCard />
            <InvestmentPanel />
          </TabsContent>
          <TabsContent value="details" className="p-3 space-y-4 mt-0">
            <RevenuePanel />
            <ExpenditurePanel />
            <TransparencyDrawer />
          </TabsContent>
        </div>

        <TabsList className="w-full rounded-none border-t h-12 bg-card">
          <TabsTrigger value="impact" className="flex-1 flex flex-col gap-0.5 text-[10px] py-1 data-[state=active]:bg-transparent">
            <BarChart3 className="h-4 w-4" />
            {t('index.tab.impact')}
          </TabsTrigger>
          <TabsTrigger value="why" className="flex-1 flex flex-col gap-0.5 text-[10px] py-1 data-[state=active]:bg-transparent">
            <Lightbulb className="h-4 w-4" />
            {t('index.tab.why')}
          </TabsTrigger>
          <TabsTrigger value="map" className="flex-1 flex flex-col gap-0.5 text-[10px] py-1 data-[state=active]:bg-transparent">
            <Map className="h-4 w-4" />
            {t('index.tab.map')}
          </TabsTrigger>
          <TabsTrigger value="flow" className="flex-1 flex flex-col gap-0.5 text-[10px] py-1 data-[state=active]:bg-transparent">
            <GitBranch className="h-4 w-4" />
            {t('index.tab.flow')}
          </TabsTrigger>
          <TabsTrigger value="details" className="flex-1 flex flex-col gap-0.5 text-[10px] py-1 data-[state=active]:bg-transparent">
            <List className="h-4 w-4" />
            {t('index.tab.details')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIsTablet(w >= 768 && w < 1280);
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
